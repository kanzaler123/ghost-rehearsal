import { serializeDocument } from '../../schemas/codec';
import { sha256 } from '../../schemas/fingerprint';
import type { ProjectDocument } from '../../schemas/model';
import { templateLibrarySchema } from '../project';
import type { SavedTemplate } from '../project';
import { decodeProject, decodeTemplates, LEGACY_KEYS, revisionSchema, snapshot } from './model';
import type { PersistenceError, ProjectSnapshot, RawRecovery, Result, Snapshot, StoredRevision, TemplateSnapshot, WriteReceipt } from './model';

export { LEGACY_KEYS } from './model';
export type { PersistenceError, ProjectSnapshot, RawRecovery, Result, Revision, Snapshot, StoredRevision, TemplateSnapshot, WriteReceipt } from './model';

const DATABASE = 'ghost-rehearsal.persistence.v2';
type Change = 'local' | 'external' | 'legacy' | 'refresh' | 'closed';
type LegacyStorage = () => Pick<Storage, 'getItem'>;
export type WorkspaceSnapshot = { savedRevisionId: string | null; projects: ProjectSnapshot[]; templates: TemplateSnapshot };

class Fault extends Error {
  constructor(readonly detail: PersistenceError) { super(detail.message); }
}

function failure(error: unknown, recovery: RawRecovery[] = []): { ok: false; error: PersistenceError } {
  if (error instanceof Fault) return { ok: false, error: { ...error.detail, recovery: [...error.detail.recovery, ...recovery] } };
  const name = error instanceof Error ? error.name : '';
  return { ok: false, error: {
    code: name === 'QuotaExceededError' ? 'quota' : name === 'VersionError' ? 'unsupported' : 'unavailable',
    message: String(error), recovery,
  } };
}

function reject(code: PersistenceError['code'], message: string, recovery: RawRecovery[] = []): never {
  throw new Fault({ code, message, recovery });
}

function projectSnapshot(revisions: StoredRevision[], projectId: string): ProjectSnapshot {
  return Object.assign(snapshot(revisions.filter(revision => revision.projectId === projectId), decodeProject), { projectId });
}

function templateSnapshot(revisions: StoredRevision[]): TemplateSnapshot {
  return snapshot(revisions.filter(revision => revision.kind === 'templates'), decodeTemplates);
}

function sameHeads<T>(state: Snapshot<T>, parents: readonly string[]): boolean {
  return state.heads.length === parents.length && state.heads.every(head => parents.includes(head.id));
}

export function newProjectId(): string { return crypto.randomUUID(); }

export async function openPersistence(options: { databaseName?: string; legacyStorage?: LegacyStorage } = {}): Promise<Result<Persistence>> {
  let db: IDBDatabase;
  try {
    db = await new Promise<IDBDatabase>((resolve, rejectOpen) => {
      const request = indexedDB.open(options.databaseName ?? DATABASE, 1);
      let blocked = false;
      request.onupgradeneeded = () => {
        request.result.createObjectStore('revisions', { keyPath: 'id' });
        request.result.createObjectStore('settings');
      };
      request.onerror = () => rejectOpen(request.error);
      request.onblocked = () => { blocked = true; rejectOpen(new Fault({ code: 'blocked', message: 'Close older database connections and retry.', recovery: [] })); };
      request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
    });
  } catch (error) { return failure(error); }
  let persistence: Persistence;
  try { persistence = new Persistence(db, options.legacyStorage ?? (() => localStorage)); }
  catch (error) { db.close(); return failure(error); }
  const migration = await persistence.migrateLegacy();
  if (!migration.ok) { persistence.close(); return migration; }
  return { ok: true, value: persistence };
}

export class Persistence {
  readonly tabId = crypto.randomUUID();
  readonly notifications: 'broadcast' | 'focus';
  private channel?: BroadcastChannel;
  private listeners = new Set<(reason: Change) => void>();
  private closed = false;
  private onFocus = () => this.notify('refresh');
  private onStorage = (event: StorageEvent) => {
    if (event.key === null || Object.values(LEGACY_KEYS).some(key => key === event.key)) this.notify('legacy');
  };

  constructor(private db: IDBDatabase, private legacyStorage: LegacyStorage) {
    try {
      this.channel = new BroadcastChannel(db.name);
      this.channel.onmessage = () => this.notify('external');
    } catch { /* Focus refresh and transactional checks still detect missed notifications. */ }
    this.notifications = this.channel ? 'broadcast' : 'focus';
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('pageshow', this.onFocus);
    window.addEventListener('storage', this.onStorage);
    db.onversionchange = () => this.close();
    db.onclose = () => this.close();
  }

  subscribe(listener: (reason: Change) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.channel?.close();
    window.removeEventListener('focus', this.onFocus);
    window.removeEventListener('pageshow', this.onFocus);
    window.removeEventListener('storage', this.onStorage);
    this.db.close();
    this.notify('closed');
    this.listeners.clear();
  }

  private notify(reason: Change): void {
    for (const listener of this.listeners) listener(reason);
  }

  private changed(): void {
    if (this.closed) return;
    this.channel?.postMessage(null);
    this.notify('local');
  }

  private transaction<T>(mode: IDBTransactionMode, action: (revisions: StoredRevision[], store: IDBObjectStore, settings: IDBObjectStore, savedRevisionId: string | null) => T): Promise<Result<T>> {
    return new Promise(resolve => {
      let tx: IDBTransaction;
      try { tx = this.db.transaction(['revisions', 'settings'], mode); }
      catch (error) { resolve(failure(error)); return; }
      let value: T;
      let error: unknown;
      let store: IDBObjectStore, settings: IDBObjectStore;
      let rows: IDBRequest<unknown[]>, saved: IDBRequest<unknown>;
      try {
        store = tx.objectStore('revisions'); settings = tx.objectStore('settings');
        rows = store.getAll(); saved = settings.get('savedRevisionId');
      } catch (caught) { tx.abort(); resolve(failure(caught)); return; }
      let reads = 0;
      const ready = () => {
        if (++reads !== 2) return;
        try {
          const revisions = (rows.result as unknown[]).map(row => {
            const result = revisionSchema.safeParse(row);
            if (!result.success) {
              const unsupported = row && typeof row === 'object' && 'version' in row && row.version !== 1;
              reject(unsupported ? 'unsupported' : 'corrupt', 'Invalid storage metadata.', [{ raw: JSON.stringify(row) }]);
            }
            return result.data;
          });
          if (saved.result !== undefined && typeof saved.result !== 'string') reject('corrupt', 'Invalid saved revision pointer.', [{ raw: JSON.stringify(saved.result) }]);
          const byId = new Map(revisions.map(revision => [revision.id, revision]));
          if (saved.result !== undefined && byId.get(saved.result)?.kind !== 'saved') reject('corrupt', 'Saved revision is missing.', [{ raw: JSON.stringify(saved.result) }]);
          const remaining = new Map(revisions.map(revision => [revision.id, revision.parents.length]));
          const children = new Map<string, string[]>();
          for (const revision of revisions) for (const id of revision.parents) {
            const parent = byId.get(id);
            if (!parent || parent.projectId !== revision.projectId) reject('corrupt', 'Invalid revision ancestry.', [revision]);
            children.set(id, [...(children.get(id) ?? []), revision.id]);
          }
          const roots = revisions.filter(revision => !revision.parents.length).map(revision => revision.id);
          let visited = 0;
          while (roots.length) {
            const id = roots.pop()!; visited++;
            for (const child of children.get(id) ?? []) {
              const count = remaining.get(child)! - 1;
              remaining.set(child, count);
              if (!count) roots.push(child);
            }
          }
          if (visited !== revisions.length) reject('corrupt', 'Cyclic revision ancestry.', revisions);
          value = action(revisions, store, settings, saved.result ?? null);
        } catch (caught) { error = caught; tx.abort(); }
      };
      rows.onsuccess = ready; saved.onsuccess = ready;
      tx.oncomplete = () => resolve({ ok: true, value });
      tx.onabort = () => resolve(failure(error ?? tx.error ?? new Error('Storage transaction aborted.')));
      tx.onerror = () => { error ??= tx.error; };
    });
  }

  async migrateLegacy(): Promise<Result<string[]>> {
    const candidates: StoredRevision[] = [];
    const recovery: RawRecovery[] = [];
    try {
      const storage = this.legacyStorage();
      for (const [kind, key] of Object.entries(LEGACY_KEYS)) {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        recovery.push({ source: key, raw });
        const id = `legacy:${kind}:${sha256(raw)}`;
        candidates.push({ version: 1, id, kind: kind as StoredRevision['kind'], projectId: kind === 'templates' ? null : id,
          tabId: 'legacy', parents: [], createdAt: Date.now(), raw, source: key });
      }
    } catch (error) { return failure(error, recovery); }
    const result = await this.transaction('readwrite', (revisions, store, settings, savedRevisionId) => {
      const known = new Set(revisions.map(revision => revision.id));
      const added = candidates.filter(revision => !known.has(revision.id));
      for (const revision of added) store.add(revision);
      const saved = added.find(revision => revision.kind === 'saved');
      if (saved && !savedRevisionId) settings.put(saved.id, 'savedRevisionId');
      return added.map(revision => revision.id);
    });
    if (!result.ok) return { ok: false, error: { ...result.error, recovery: [...result.error.recovery, ...recovery] } };
    if (result.value.length) this.changed();
    return result;
  }

  async readWorkspace(): Promise<Result<WorkspaceSnapshot>> {
    const migration = await this.migrateLegacy();
    if (!migration.ok) return migration;
    return this.transaction('readonly', (revisions, _store, _settings, savedRevisionId) => ({ savedRevisionId,
      projects: [...new Set(revisions.flatMap(revision => revision.projectId === null ? [] : [revision.projectId]))].map(id => projectSnapshot(revisions, id)),
      templates: templateSnapshot(revisions),
    }));
  }

  async readProject(projectId: string): Promise<Result<ProjectSnapshot>> {
    const migration = await this.migrateLegacy();
    if (!migration.ok) return migration;
    return this.transaction('readonly', revisions => projectSnapshot(revisions, projectId));
  }

  async readTemplates(): Promise<Result<TemplateSnapshot>> {
    const migration = await this.migrateLegacy();
    if (!migration.ok) return migration;
    return this.transaction('readonly', revisions => templateSnapshot(revisions));
  }

  async writeProject(projectId: string, document: ProjectDocument, options: { kind: 'draft' | 'saved'; parents: readonly string[] }): Promise<Result<WriteReceipt<ProjectDocument>>> {
    let raw: string;
    try { raw = serializeDocument(document); }
    catch (error) { return { ok: false, error: { code: 'invalid', message: String(error), recovery: [{ raw: JSON.stringify(document) }] } }; }
    const candidate: StoredRevision = { version: 1, id: crypto.randomUUID(), projectId, kind: options.kind, tabId: this.tabId,
      parents: [...options.parents], createdAt: Date.now(), raw };
    const decoded = decodeProject(candidate);
    if (decoded.status !== 'ready') return { ok: false, error: { code: 'invalid', message: decoded.message, recovery: [{ raw }] } };
    const migration = await this.migrateLegacy();
    if (!migration.ok) return { ok: false, error: { ...migration.error, recovery: [...migration.error.recovery, { raw }] } };
    const result = await this.transaction('readwrite', (revisions, store, settings) => {
      if (!projectId) reject('invalid', 'A storage project ID is required.');
      this.checkParents(revisions.filter(revision => revision.projectId === projectId), candidate.parents);
      const parent = revisions.find(revision => revision.id === candidate.parents[0]);
      if (candidate.parents.length === 1 && parent?.raw === raw && parent.kind === candidate.kind && !parent.dismissed) {
        const state = projectSnapshot(revisions, projectId);
        const status = !sameHeads(state, candidate.parents) ? 'conflict' as const : options.kind === 'saved' ? 'saved' as const : 'draft-saved' as const;
        if (status === 'saved') settings.put(parent.id, 'savedRevisionId');
        return { revision: parent, snapshot: state, status };
      }
      store.add(candidate);
      const next = projectSnapshot([...revisions, candidate], projectId);
      if (options.kind === 'saved' && next.status === 'ready') settings.put(candidate.id, 'savedRevisionId');
      return { revision: candidate, snapshot: next, status: next.status !== 'ready' ? 'conflict' as const : options.kind === 'saved' ? 'saved' as const : 'draft-saved' as const };
    });
    if (!result.ok) return { ok: false, error: { ...result.error, recovery: [...result.error.recovery, { raw }] } };
    this.changed();
    return result;
  }

  private checkParents(revisions: StoredRevision[], parents: readonly string[]): void {
    if (new Set(parents).size !== parents.length || parents.some(id => !revisions.some(revision => revision.id === id))) {
      reject('invalid', 'Parents must identify existing revisions in the same project or library.');
    }
  }

  async discardDraft(projectId: string, revisionId: string): Promise<Result<ProjectSnapshot>> {
    const migration = await this.migrateLegacy();
    if (!migration.ok) return migration;
    const result = await this.transaction('readwrite', (revisions, store) => {
      const state = projectSnapshot(revisions, projectId);
      const revision = state.history.find(item => item.id === revisionId);
      if (!revision || revision.kind !== 'draft') reject('not-found', 'Draft revision not found.');
      if (revision.tabId !== this.tabId) reject('not-owner', 'This draft belongs to another tab.');
      if (revision.dismissed) return state;
      if (!state.heads.some(item => item.id === revisionId)) reject('conflict', 'A newer revision exists; refresh before discarding.');
      const next = revisions.map(item => item.id === revisionId ? { ...item, dismissed: true } : item);
      store.put({ ...revisions.find(item => item.id === revisionId)!, dismissed: true });
      return projectSnapshot(next, projectId);
    });
    if (result.ok) this.changed();
    return result;
  }

  async writeTemplates(templates: SavedTemplate[], parents: readonly string[]): Promise<Result<WriteReceipt<SavedTemplate[]>>> {
    return this.storeTemplates(templates, parents, false);
  }

  async recoverTemplates(templates: SavedTemplate[], expectedHeads: readonly string[]): Promise<Result<WriteReceipt<SavedTemplate[]>>> {
    return this.storeTemplates(templates, expectedHeads, true);
  }

  private async storeTemplates(templates: SavedTemplate[], parents: readonly string[], recovery: boolean): Promise<Result<WriteReceipt<SavedTemplate[]>>> {
    let raw: string;
    try { raw = JSON.stringify(templateLibrarySchema.parse(templates)); }
    catch (error) { return { ok: false, error: { code: 'invalid', message: String(error), recovery: [{ raw: JSON.stringify(templates) }] } }; }
    const migration = await this.migrateLegacy();
    if (!migration.ok) return { ok: false, error: { ...migration.error, recovery: [...migration.error.recovery, { raw }] } };
    const candidate: StoredRevision = { version: 1, id: crypto.randomUUID(), projectId: null, kind: 'templates', tabId: this.tabId,
      parents: [...parents], createdAt: Date.now(), raw };
    const result = await this.transaction('readwrite', (revisions, store) => {
      const state = templateSnapshot(revisions);
      this.checkParents(state.history, parents);
      if (recovery) {
        if (!sameHeads(state, parents)) reject('conflict', 'Library changed during recovery.', state.heads);
      } else if (state.status === 'corrupt' || state.status === 'unsupported') {
        reject(state.status, 'Export or explicitly recover the unreadable library before editing.', state.heads);
      }
      store.add(candidate);
      const next = templateSnapshot([...revisions, candidate]);
      return { revision: candidate, snapshot: next, status: next.status === 'conflict' ? 'conflict' as const : 'saved' as const };
    });
    if (!result.ok) return { ok: false, error: { ...result.error, recovery: [...result.error.recovery, { raw }] } };
    this.changed();
    return result;
  }

  exportRaw(revisionId: string): Promise<Result<RawRecovery>> {
    return new Promise(resolve => {
      try {
        const tx = this.db.transaction('revisions', 'readonly');
        const request = tx.objectStore('revisions').get(revisionId);
        tx.oncomplete = () => {
          const row: unknown = request.result;
          if (row === undefined) { resolve({ ok: false, error: { code: 'not-found', message: 'Revision not found.', recovery: [] } }); return; }
          const raw = row && typeof row === 'object' && 'raw' in row && typeof row.raw === 'string' ? row.raw : JSON.stringify(row);
          resolve({ ok: true, value: { id: revisionId, raw } });
        };
        tx.onabort = () => resolve(failure(tx.error));
      } catch (error) { resolve(failure(error)); }
    });
  }
}
