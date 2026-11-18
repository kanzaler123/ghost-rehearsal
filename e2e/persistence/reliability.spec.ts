import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { build } from 'vite';
import { resolve } from 'node:path';
import type { Persistence } from '../../src/features/persistence';

declare global {
  interface Window {
    persistenceTest: { api: typeof import('./harness'); store: Persistence; changes: string[] };
  }
}

let script = '';
const test = base.extend<{ persistenceHarness: void }>({
  persistenceHarness: [async ({ context }, use) => {
    const errors: string[] = [];
    const watch = (page: Page) => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    };
    context.on('page', watch);
    context.pages().forEach(watch);
    await context.route('**/__a-module.js', route => route.fulfill({ contentType: 'text/javascript', body: script }));
    await context.route('**/__a-test.html', route => route.fulfill({ contentType: 'text/html', body:
      '<!doctype html><title>Task A storage harness</title><script type="module">import * as api from "./__a-module.js"; window.persistenceTest = { api, changes: [] };</script>' }));
    await use();
    expect(errors).toEqual([]);
  }, { auto: true }],
});

test.beforeAll(async () => {
  const result = await build({ configFile: false, logLevel: 'error', build: { write: false, minify: false,
    lib: { entry: resolve('e2e/persistence/harness.ts'), formats: ['es'], fileName: 'persistence' } } });
  const bundles = Array.isArray(result) ? result : [result];
  const chunk = bundles.flatMap(bundle => 'output' in bundle ? bundle.output : []).find(output => output.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('Storage harness bundle missing');
  script = chunk.code;
});

async function visit(page: Page) {
  await page.goto('./__a-test.html');
  await page.waitForFunction(() => !!window.persistenceTest?.api);
}

async function connect(page: Page) {
  await page.evaluate(async () => {
    const state = window.persistenceTest;
    state.store = state.api.unwrap(await state.api.openPersistence({ databaseName: 'task-a' }));
    state.store.subscribe(reason => state.changes.push(reason));
  });
}

async function seed(page: Page) {
  return page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    const document = api.initialDocument();
    document.plans[0].id = 'constructor';
    return api.unwrap(await store.writeProject('project', document, { kind: 'saved', parents: [] })).revision.id;
  });
}

test('101 linear drafts are trimmed atomically without parsing superseded project bodies', async ({ page }) => {
  await visit(page); await connect(page);
  const result = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest, document = api.initialDocument();
    const oldBodies = new Set<string>();
    let parents: string[] = [];
    for (let index = 0; index < 100; index++) {
      document.plans[0].name = `Draft ${index}`;
      const { revision } = api.unwrap(await store.writeProject('long-history', document, { kind: 'draft', parents }));
      oldBodies.add(revision.raw); parents = [revision.id];
    }
    document.plans[0].name = 'New draft';
    const parse = JSON.parse;
    let parsedOld = 0;
    JSON.parse = (...args) => { if (oldBodies.has(args[0])) parsedOld++; return parse(...args); };
    const write = await store.writeProject('long-history', document, { kind: 'draft', parents }).finally(() => { JSON.parse = parse; });
    const { status, snapshot } = api.unwrap(write);
    const reopened = api.unwrap(await store.readProject('long-history'));
    return { status, parsedOld, heads: snapshot.heads.length, retained: reopened.history.length, matches: reopened.heads[0].id === snapshot.heads[0].id };
  });
  expect(result).toEqual({ status: 'draft-saved', parsedOld: 0, heads: 1, retained: 20, matches: true });
});

test('a sleeping tab can fork from a pruned draft and resolve both edits after further compaction', async ({ page, context }) => {
  await visit(page); await connect(page);
  const tab = await context.newPage(); await visit(tab); await connect(tab);
  const id = 'constructor';
  const saved = await page.evaluate(async id => {
    const { store, api } = window.persistenceTest, doc = api.emptyProject();
    const saved = api.unwrap(await store.writeProject(id, doc, { kind: 'saved', parents: [] })).revision;
    doc.plans[0].name = 'Both tabs saw this';
    api.unwrap(await store.writeProject(id, doc, { kind: 'draft', parents: [saved.id] }));
    api.unwrap(await store.writeProject('other', api.emptyProject(), { kind: 'draft', parents: [] }));
    return saved.id;
  }, id);
  const old = await tab.evaluate(async id => {
    const { store, api } = window.persistenceTest;
    const state = api.unwrap(await store.readProject(id));
    if (state.status !== 'ready') throw new Error('Expected draft');
    return state.current;
  }, id);
  const advance = (parent: string) => page.evaluate(async ({ id, parent }) => {
    const { store, api } = window.persistenceTest, doc = api.emptyProject();
    for (let i = 0; i < 30; i++) {
      doc.plans[0].name = `Active tab ${i}`;
      parent = api.unwrap(await store.writeProject(id, doc, { kind: 'draft', parents: [parent] })).revision.id;
    }
    return parent;
  }, { id, parent });
  const first = await advance(old.id);
  const fork = await tab.evaluate(async old => {
    const { store, api } = window.persistenceTest;
    const raw = await store.exportRaw(old.id);
    if (raw.ok || raw.error.code !== 'not-found') throw new Error('Stale base should have been pruned');
    old.value.plans[0].name = 'Sleeping tab edit';
    const result = api.unwrap(await store.writeProject(old.projectId!, old.value, { kind: 'draft', parents: [old] }));
    return { id: result.revision.id, status: result.status, heads: result.snapshot.heads.map(head => head.raw) };
  }, old);
  expect(fork.status).toBe('conflict');
  expect(fork.heads).toHaveLength(2);
  expect(fork.heads.join(' ')).toContain('Sleeping tab edit');
  expect(fork.heads.join(' ')).toContain('Active tab 29');
  const active = await advance(first);
  const result = await tab.evaluate(async ({ id, active, fork, old }) => {
    const { store, api } = window.persistenceTest, doc = api.emptyProject();
    const before = api.unwrap(await store.readProject(id));
    doc.plans[0].name = 'Resolved together';
    const merge = api.unwrap(await store.writeProject(id, doc, { kind: 'draft', parents: [active, fork, old] }));
    store.close();
    const reopened = api.unwrap(await api.openPersistence({ databaseName: 'task-a' }));
    const state = api.unwrap(await reopened.readWorkspace());
    reopened.close();
    return { heads: before.heads.map(row => row.id).sort(), retained: before.history.length, status: merge.status,
      parents: merge.revision.parents, saved: state.savedRevisionId, current: state.projects.find(p => p.projectId === id)!.heads[0].raw,
      other: state.projects.find(p => p.projectId === 'other')!.history.length };
  }, { id, active, fork: fork.id, old });
  expect(result).toMatchObject({ heads: [active, fork.id].sort(), retained: 22, status: 'draft-saved',
    parents: [active, fork.id], saved, other: 1 });
  expect(result.current).toContain('Resolved together');
});

test('pruning preserves manual saves, fork and merge choices and rolls back on a failed delete', async ({ page }) => {
  await visit(page); await connect(page);
  const result = await page.evaluate(async () => {
    const { store, api } = window.persistenceTest, doc = api.emptyProject();
    const write = async (name: string, parents: string[], kind: 'saved' | 'draft' = 'draft') => {
      doc.plans[0].name = name;
      return api.unwrap(await store.writeProject('tree', doc, { kind, parents })).revision.id;
    };
    const original = await write('Original', [], 'saved');
    const base = await write('Fork point', [original]);
    const a = await write('Left edit', [base]), b = await write('Right edit', [base]);
    const merge = await write('Merged', [a, b]), saved = await write('Manual save', [merge], 'saved');
    let tip = saved;
    for (let i = 0; i < 20; i++) tip = await write(`Draft ${i}`, [tip]);
    const before = api.unwrap(await store.readProject('tree')).history.map(row => row.id).sort();
    const remove = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function(key) {
      remove.call(this, key);
      throw new DOMException('Interrupted pruning', 'QuotaExceededError');
    };
    doc.plans[0].name = 'Pending edit';
    const failed = await store.writeProject('tree', doc, { kind: 'draft', parents: [tip] })
      .finally(() => { IDBObjectStore.prototype.delete = remove; });
    const after = api.unwrap(await store.readProject('tree'));
    await write('Pending edit', [tip]);
    const workspace = api.unwrap(await store.readWorkspace());
    const state = workspace.projects[0], records = new Map(state.history.map(row => [row.id, row]));
    return { failed, rolledBack: after.heads[0].id === tip && before.join() === after.history.map(row => row.id).sort().join(),
      protected: [original, base, a, b, merge, saved].every(id => records.has(id)),
      mergeIntact: records.get(merge)?.parents.join() === [a, b].join(), pointerIntact: workspace.savedRevisionId === saved,
      rows: state.history.length, status: state.status, raw: state.heads[0].raw };
  });
  expect(result).toMatchObject({ failed: { ok: false, error: { code: 'quota' } }, rolledBack: true,
    protected: true, mergeIntact: true, pointerIntact: true, rows: 26, status: 'ready' });
  expect(result.raw).toContain('Pending edit');
});

test('fresh storage, constructor project round trip, owned draft dismissal and reload recovery', async ({ page }) => {
  await visit(page); await connect(page);
  const baseId = await seed(page);
  const result = await page.evaluate(async baseId => {
    const { api, store } = window.persistenceTest;
    const missing = api.unwrap(await store.readTemplates());
    const empty = api.unwrap(await store.writeTemplates([], []));
    const saved = api.unwrap(await store.readProject('project'));
    if (saved.status !== 'ready') throw new Error('Expected saved project');
    const document = saved.current.value;
    api.unwrap(await store.writeProject('other-project', api.initialDocument(), { kind: 'saved', parents: [] }));
    api.unwrap(await store.writeProject('project', document, { kind: 'saved', parents: [baseId] }));
    document.plans[0].name = 'A edit';
    const a = api.unwrap(await store.writeProject('project', document, { kind: 'draft', parents: [baseId] }));
    document.plans[0].name = 'A edit 2';
    const a2 = api.unwrap(await store.writeProject('project', document, { kind: 'draft', parents: [a.revision.id] }));
    const staleDiscard = await store.discardDraft('project', a.revision.id);
    const dismissed = api.unwrap(await store.discardDraft('project', a2.revision.id));
    const raw = api.unwrap(await store.exportRaw(a2.revision.id));
    const workspace = api.unwrap(await store.readWorkspace());
    const oldTab = store.tabId;
    store.close();
    const reopened = api.unwrap(await api.openPersistence({ databaseName: 'task-a' }));
    const restored = api.unwrap(await reopened.readProject('project'));
    const foreignDiscard = await reopened.discardDraft('project', a2.revision.id);
    const recovered = api.unwrap(await reopened.writeProject('project', document, { kind: 'draft', parents: [a2.revision.id] }));
    reopened.close();
    return { missing: missing.status, empty: empty.snapshot.status, saved: saved.current.value, staleDiscard, dismissed, raw,
      savedPointer: workspace.savedRevisionId, tabChanged: oldTab !== reopened.tabId, restored, foreignDiscard, recovered };
  }, baseId);
  expect(result.missing).toBe('empty');
  expect(result.empty).toBe('ready');
  expect(result.saved.plans.some(plan => plan.id === 'constructor')).toBe(true);
  expect(Object.keys(result.saved).sort()).toEqual(['format', 'plans', 'scenarios', 'schemaVersion']);
  expect(result.staleDiscard).toMatchObject({ ok: false, error: { code: 'conflict' } });
  expect(result.dismissed.status).toBe('empty');
  expect(result.dismissed.history).toHaveLength(3);
  expect(result.raw.raw).toContain('A edit 2');
  expect(result.savedPointer).toBe(baseId);
  expect(result.tabChanged).toBe(true);
  expect(result.restored.history).toHaveLength(3);
  expect(result.foreignDiscard).toMatchObject({ ok: false, error: { code: 'not-owner' } });
  expect(result.recovered.status).toBe('draft-saved');
});

test('B reading, saving an unchanged project, or editing cannot remove A draft', async ({ page, context }) => {
  await visit(page); await connect(page);
  const baseId = await seed(page);
  const b = await context.newPage(); await visit(b); await connect(b);
  const aId = await page.evaluate(async baseId => {
    const { api, store } = window.persistenceTest;
    const document = api.initialDocument(); document.plans[0].id = 'constructor'; document.plans[0].name = 'A draft';
    return api.unwrap(await store.writeProject('project', document, { kind: 'draft', parents: [baseId] })).revision.id;
  }, baseId);
  await expect.poll(() => b.evaluate(() => window.persistenceTest.changes.includes('external'))).toBe(true);
  const result = await b.evaluate(async ({ baseId, aId }) => {
    const { api, store } = window.persistenceTest;
    const before = api.unwrap(await store.readWorkspace());
    const document = api.initialDocument(); document.plans[0].id = 'constructor';
    const unchangedSave = api.unwrap(await store.writeProject('project', document, { kind: 'saved', parents: [baseId] }));
    const denied = await store.discardDraft('project', aId);
    document.plans[0].name = 'B edit';
    const edit = api.unwrap(await store.writeProject('project', document, { kind: 'draft', parents: [baseId] }));
    const saved = api.unwrap(await store.writeProject('project', document, { kind: 'saved', parents: [edit.revision.id] }));
    return { before, unchangedSave, denied, edit, saved, after: api.unwrap(await store.readProject('project')) };
  }, { baseId, aId });
  expect(result.before.projects[0].history).toHaveLength(2);
  expect(result.unchangedSave.revision.id).toBe(baseId);
  expect(result.unchangedSave.status).toBe('conflict');
  expect(result.unchangedSave.snapshot.history).toHaveLength(2);
  expect(result.denied).toMatchObject({ ok: false, error: { code: 'not-owner' } });
  expect(result.edit.status).toBe('conflict');
  expect(result.saved.status).toBe('conflict');
  expect(result.after.heads.map(head => head.id)).toContain(aId);
  expect(result.after.history.find(head => head.id === aId)?.raw).toContain('A draft');
});

test('simultaneous writes in two real tabs retain both branches and exact-revision deletion is safe', async ({ page, context }) => {
  await visit(page); await connect(page);
  const baseId = await seed(page);
  const b = await context.newPage(); await visit(b); await connect(b);
  const writes = await Promise.all([page, b].map((tab, index) => tab.evaluate(async ({ baseId, index }) => {
    const { api, store } = window.persistenceTest;
    const document = api.initialDocument(); document.plans[0].name = `concurrent ${index}`;
    return api.unwrap(await store.writeProject('project', document, { kind: 'draft', parents: [baseId] }));
  }, { baseId, index })));
  expect(writes.map(write => write.status).sort()).toEqual(['conflict', 'draft-saved']);
  const final = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    return api.unwrap(await store.readProject('project'));
  });
  expect(final.status).toBe('conflict');
  expect(final.heads.map(head => head.id).sort()).toEqual(writes.map(write => write.revision.id).sort());
  expect(final.history).toHaveLength(3);
  const dismissed = await b.evaluate(async id => {
    const { api, store } = window.persistenceTest;
    return api.unwrap(await store.discardDraft('project', id));
  }, writes[1].revision.id);
  expect(dismissed.heads.map(head => head.id)).toEqual([writes[0].revision.id]);
  expect(dismissed.history).toHaveLength(3);
  const recovered = await page.evaluate(async heads => {
    const { api, store } = window.persistenceTest;
    return api.unwrap(await store.writeProject('project', api.initialDocument(), { kind: 'saved', parents: heads }));
  }, final.heads.map(head => head.id));
  expect(recovered.status).toBe('saved');
  expect(recovered.snapshot.history).toHaveLength(4);
});

test('corrupt legacy templates block normal writes and support raw export and explicit recovery', async ({ page }) => {
  await visit(page);
  await page.evaluate(() => localStorage.setItem(window.persistenceTest.api.LEGACY_KEYS.templates, '  {broken template\n'));
  await connect(page);
  const result = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    const bad = api.unwrap(await store.readTemplates());
    const ordinary = await store.writeTemplates([], []);
    const raw = api.unwrap(await store.exportRaw(bad.heads[0].id));
    const stale = await store.recoverTemplates([], []);
    const fixed = api.unwrap(await store.recoverTemplates([], bad.heads.map(head => head.id)));
    await store.migrateLegacy(); await store.migrateLegacy();
    const after = api.unwrap(await store.readTemplates());
    return { bad, ordinary, raw, stale, fixed, after, original: localStorage.getItem(api.LEGACY_KEYS.templates) };
  });
  expect(result.bad.status).toBe('corrupt');
  expect(result.bad).not.toHaveProperty('current');
  expect(result.ordinary).toMatchObject({ ok: false, error: { code: 'corrupt' } });
  expect(result.raw.raw).toBe('  {broken template\n');
  expect(result.stale).toMatchObject({ ok: false, error: { code: 'conflict' } });
  expect(result.fixed.snapshot.status).toBe('ready');
  expect(result.after.history).toHaveLength(2);
  expect(result.original).toBe(result.raw.raw);
});

test('template concurrent saves and a changed recovery snapshot preserve all versions', async ({ page, context }) => {
  await visit(page); await connect(page);
  const b = await context.newPage(); await visit(b); await connect(b);
  const baseId = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    return api.unwrap(await store.writeTemplates([], [])).revision.id;
  });
  const writes = await Promise.all([page, b].map((tab, index) => tab.evaluate(async ({ baseId, index }) => {
    const { api, store } = window.persistenceTest;
    return api.unwrap(await store.writeTemplates([{ id: `template-${index}`, name: `Template ${index}`, document: api.emptyProject() }], [baseId]));
  }, { baseId, index })));
  expect(writes.map(write => write.status).sort()).toEqual(['conflict', 'saved']);
  const result = await page.evaluate(async ids => {
    const { api, store } = window.persistenceTest;
    const conflict = api.unwrap(await store.readTemplates());
    const stale = await store.recoverTemplates([], [ids[0]]);
    const restored = api.unwrap(await store.recoverTemplates([], ids));
    return { conflict, stale, restored };
  }, writes.map(write => write.revision.id));
  expect(result.conflict.heads).toHaveLength(2);
  expect(result.stale).toMatchObject({ ok: false, error: { code: 'conflict' } });
  expect(result.restored.snapshot.status).toBe('ready');
  expect(result.restored.snapshot.history).toHaveLength(4);
});

test('legacy migration is concurrent-safe and idempotent, without guessing the draft project identity', async ({ page, context }) => {
  await visit(page);
  const originals = await page.evaluate(() => {
    const { api } = window.persistenceTest;
    const document = api.initialDocument(); document.plans[0].id = 'constructor';
    const saved = JSON.stringify(document);
    document.plans[0].name = 'legacy draft';
    const draft = JSON.stringify(document);
    localStorage.setItem(api.LEGACY_KEYS.saved, saved);
    localStorage.setItem(api.LEGACY_KEYS.draft, draft);
    localStorage.setItem(api.LEGACY_KEYS.templates, '[]');
    return { saved, draft };
  });
  const b = await context.newPage(); await visit(b);
  await Promise.all([connect(page), connect(b)]);
  const result = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    const again = api.unwrap(await store.migrateLegacy());
    const state = api.unwrap(await store.readWorkspace());
    return { again, state, saved: localStorage.getItem(api.LEGACY_KEYS.saved), draft: localStorage.getItem(api.LEGACY_KEYS.draft) };
  });
  expect(result.again).toEqual([]);
  expect(result.state.projects).toHaveLength(2);
  expect(result.state.projects.every(project => project.status === 'ready')).toBe(true);
  expect(new Set(result.state.projects.map(project => project.projectId)).size).toBe(2);
  expect(result.state.projects.flatMap(project => project.history)).toHaveLength(2);
  expect(result.state.templates.history).toHaveLength(1);
  expect(result.saved).toBe(originals.saved);
  expect(result.draft).toBe(originals.draft);
  await b.evaluate(() => localStorage.setItem(window.persistenceTest.api.LEGACY_KEYS.templates, '{late legacy corruption'));
  await expect.poll(() => page.evaluate(() => window.persistenceTest.changes.includes('legacy'))).toBe(true);
  const changed = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    return { read: api.unwrap(await store.readTemplates()), write: await store.writeTemplates([], []) };
  });
  expect(changed.read.status).toBe('corrupt');
  expect(changed.write).toMatchObject({ ok: false, error: { code: 'corrupt' } });
});

test('quota failure aborts the entire migration and a retry preserves exact legacy text', async ({ page }) => {
  await visit(page);
  const result = await page.evaluate(async () => {
    const { api } = window.persistenceTest;
    const raw = JSON.stringify(api.initialDocument());
    localStorage.setItem(api.LEGACY_KEYS.saved, raw);
    localStorage.setItem(api.LEGACY_KEYS.draft, raw + '\n');
    localStorage.setItem(api.LEGACY_KEYS.templates, '[]');
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(value, key) {
      if (value.kind === 'templates') throw new DOMException('Injected full quota', 'QuotaExceededError');
      return add.call(this, value, key);
    };
    const failed = await api.openPersistence({ databaseName: 'task-a' });
    IDBObjectStore.prototype.add = add;
    const store = api.unwrap(await api.openPersistence({ databaseName: 'task-a' }));
    const state = api.unwrap(await store.readWorkspace());
    const again = api.unwrap(await store.migrateLegacy());
    store.close();
    return { failed, state, again, raw, original: localStorage.getItem(api.LEGACY_KEYS.saved) };
  });
  expect(result.failed).toMatchObject({ ok: false, error: { code: 'quota' } });
  if (!result.failed.ok) expect(result.failed.error.recovery).toHaveLength(3);
  expect(result.state.projects.flatMap(project => project.history)).toHaveLength(2);
  expect(result.state.templates.history).toHaveLength(1);
  expect(result.again).toEqual([]);
  expect(result.original).toBe(result.raw);
});

test('quota failure between revision insertion and saved-pointer update rolls back both', async ({ page }) => {
  await visit(page); await connect(page);
  const baseId = await seed(page);
  const result = await page.evaluate(async baseId => {
    const { api, store } = window.persistenceTest;
    const document = api.initialDocument(); document.plans[0].name = 'must remain recoverable';
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === 'settings') throw new DOMException('Injected full quota', 'QuotaExceededError');
      return put.call(this, value, key);
    };
    const write = await store.writeProject('project', document, { kind: 'saved', parents: [baseId] });
    IDBObjectStore.prototype.put = put;
    const after = api.unwrap(await store.readWorkspace());
    const retry = api.unwrap(await store.writeProject('project', document, { kind: 'saved', parents: [baseId] }));
    return { write, after, retry };
  }, baseId);
  expect(result.write).toMatchObject({ ok: false, error: { code: 'quota' } });
  if (!result.write.ok) expect(result.write.error.recovery.some(item => item.raw.includes('must remain recoverable'))).toBe(true);
  expect(result.after.savedRevisionId).toBe(baseId);
  expect(result.after.projects[0].history).toHaveLength(1);
  expect(result.retry.status).toBe('saved');
});

test('read exceptions and unavailable storage return errors, never an empty library', async ({ page }) => {
  await visit(page);
  const result = await page.evaluate(async () => {
    const { api } = window.persistenceTest;
    const raw = JSON.stringify(api.initialDocument());
    localStorage.setItem(api.LEGACY_KEYS.saved, raw);
    localStorage.setItem(api.LEGACY_KEYS.templates, '[]');
    let failRead = true;
    const storage = () => ({ getItem(key: string) {
      if (failRead && key === api.LEGACY_KEYS.templates) throw new DOMException('Denied read', 'SecurityError');
      return localStorage.getItem(key);
    } });
    const denied = await api.openPersistence({ databaseName: 'task-a', legacyStorage: storage });
    failRead = false;
    const store = api.unwrap(await api.openPersistence({ databaseName: 'task-a', legacyStorage: storage }));
    failRead = true;
    const read = await store.readTemplates(), write = await store.writeTemplates([], []);
    failRead = false;
    const after = api.unwrap(await store.readTemplates());
    store.close();
    const closed = await store.readTemplates();
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = () => { throw new DOMException('Denied database', 'SecurityError'); };
    const unavailable = await api.openPersistence({ databaseName: 'denied' });
    IDBFactory.prototype.open = open;
    return { denied, read, write, after, closed, unavailable, raw };
  });
  for (const failure of [result.denied, result.read, result.write, result.closed, result.unavailable]) {
    expect(failure).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  }
  if (!result.denied.ok) expect(result.denied.error.recovery).toContainEqual({ source: 'ghost-rehearsal.project.v1', raw: result.raw });
  expect(result.after.history).toHaveLength(1);
  expect(result.after.status).toBe('ready');
});

test('future project and template formats remain exportable and cannot be silently replaced', async ({ page }) => {
  await visit(page);
  await page.evaluate(() => {
    const { api } = window.persistenceTest;
    localStorage.setItem(api.LEGACY_KEYS.saved, JSON.stringify({ ...api.initialDocument(), schemaVersion: 99 }));
    localStorage.setItem(api.LEGACY_KEYS.draft, '{bad project');
    localStorage.setItem(api.LEGACY_KEYS.templates, '{"schemaVersion":99,"templates":[]}');
  });
  await connect(page);
  const state = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    const state = api.unwrap(await store.readWorkspace());
    return { state, write: await store.writeTemplates([], []), raw: api.unwrap(await store.exportRaw(state.templates.heads[0].id)) };
  });
  expect(state.state.projects.map(project => project.status).sort()).toEqual(['corrupt', 'unsupported']);
  expect(state.state.templates.status).toBe('unsupported');
  expect(state.write).toMatchObject({ ok: false, error: { code: 'unsupported' } });
  expect(state.raw.raw).toBe('{"schemaVersion":99,"templates":[]}');
});

test('corrupt metadata never becomes an empty library and raw recovery remains available', async ({ page }) => {
  await visit(page); await connect(page);
  const result = await page.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    const original = api.unwrap(await store.writeTemplates([], [])).revision;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('task-a');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const corrupt = async (change: object) => new Promise<void>((resolve, reject) => {
      const tx = db.transaction('revisions', 'readwrite');
      tx.objectStore('revisions').put({ ...original, ...change });
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    await corrupt({ parents: [original.id] });
    const cyclic = await store.readTemplates(), write = await store.writeTemplates([], []);
    const raw = api.unwrap(await store.exportRaw(original.id));
    await corrupt({ parents: ['missing'] });
    const missingParent = await store.readTemplates();
    await corrupt({ version: 99 });
    const unsupported = await store.readTemplates();
    db.close();
    return { cyclic, write, raw, missingParent, unsupported };
  });
  for (const failed of [result.cyclic, result.write, result.missingParent]) expect(failed).toMatchObject({ ok: false, error: { code: 'corrupt' } });
  expect(result.raw.raw).toBe('[]');
  expect(result.unsupported).toMatchObject({ ok: false, error: { code: 'unsupported' } });
});

test('database read aborts are explicit and notification subscriptions can be disposed', async ({ page, context }) => {
  await visit(page); await connect(page);
  const b = await context.newPage(); await visit(b); await connect(b);
  const result = await page.evaluate(async () => {
    const { store } = window.persistenceTest;
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = () => { throw new DOMException('Denied database read', 'SecurityError'); };
    const denied = await store.readTemplates();
    IDBObjectStore.prototype.getAll = function(...args: Parameters<typeof getAll>) {
      const request = getAll.apply(this, args);
      queueMicrotask(() => this.transaction.abort());
      return request;
    };
    const aborted = await store.readTemplates();
    IDBObjectStore.prototype.getAll = getAll;
    const events: string[] = [];
    const unsubscribe = store.subscribe(reason => events.push(reason));
    window.dispatchEvent(new Event('focus'));
    unsubscribe();
    window.dispatchEvent(new Event('focus'));
    store.close();
    return { denied, aborted, events, closed: window.persistenceTest.changes.includes('closed') };
  });
  expect(result.denied).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  expect(result.aborted).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  expect(result.events).toEqual(['refresh']);
  expect(result.closed).toBe(true);
  await b.evaluate(async () => {
    const { api, store } = window.persistenceTest;
    api.unwrap(await store.writeTemplates([], []));
  });
  expect(await page.evaluate(() => window.persistenceTest.changes.at(-1))).toBe('closed');
});
