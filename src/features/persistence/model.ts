import { z } from 'zod';
import { parseDocument } from '../../schemas/codec';
import type { ProjectDocument } from '../../schemas/model';
import { templateLibrarySchema } from '../project';
import type { SavedTemplate } from '../project';

export const LEGACY_KEYS = {
  saved: 'ghost-rehearsal.project.v1',
  draft: 'ghost-rehearsal.draft.v1',
  templates: 'ghost-rehearsal.templates.v1',
} as const;

export const revisionSchema = z.strictObject({
  version: z.literal(1), id: z.string().min(1), projectId: z.string().nullable(),
  kind: z.enum(['saved', 'draft', 'templates']), tabId: z.string().min(1),
  parents: z.array(z.string()), createdAt: z.number().finite(), raw: z.string(),
  dismissed: z.boolean().optional(), source: z.enum(Object.values(LEGACY_KEYS)).optional(),
}).refine(value => value.kind === 'templates' ? value.projectId === null : !!value.projectId);

export type StoredRevision = z.infer<typeof revisionSchema>;
export type Revision<T> = StoredRevision & (
  { status: 'ready'; value: T } | { status: 'corrupt' | 'unsupported'; message: string }
);
export type Snapshot<T> = { heads: Revision<T>[]; history: Revision<T>[] } & (
  { status: 'empty' | 'conflict' | 'corrupt' | 'unsupported' } |
  { status: 'ready'; current: Revision<T> & { status: 'ready'; value: T } }
);
export type ProjectSnapshot = Snapshot<ProjectDocument> & { projectId: string };
export type TemplateSnapshot = Snapshot<SavedTemplate[]>;
export type RawRecovery = { id?: string; source?: string; raw: string };
export type PersistenceError = {
  code: 'unavailable' | 'quota' | 'blocked' | 'unsupported' | 'corrupt' | 'invalid' | 'conflict' | 'not-owner' | 'not-found';
  message: string;
  recovery: RawRecovery[];
};
export type Result<T> = { ok: true; value: T } | { ok: false; error: PersistenceError };
export type WriteReceipt<T> = { revision: StoredRevision; snapshot: Snapshot<T>; status: 'saved' | 'draft-saved' | 'conflict' };

export function decodeProject(revision: StoredRevision): Revision<ProjectDocument> {
  const result = parseDocument(revision.raw);
  if (result.document) return { ...revision, status: 'ready', value: result.document };
  return { ...revision, status: result.issues.some(issue => issue.code === 'unsupported_schema_version') ? 'unsupported' : 'corrupt',
    message: result.issues.map(issue => issue.message).join('; ') };
}

export function decodeTemplates(revision: StoredRevision): Revision<SavedTemplate[]> {
  try {
    const value: unknown = JSON.parse(revision.raw);
    if (value && typeof value === 'object' && 'schemaVersion' in value && Number(value.schemaVersion) > 1) {
      return { ...revision, status: 'unsupported', message: 'Unsupported template storage version.' };
    }
    return { ...revision, status: 'ready', value: templateLibrarySchema.parse(value) };
  } catch (error) {
    return { ...revision, status: 'corrupt', message: String(error) };
  }
}

export function snapshot<T>(revisions: StoredRevision[], decode: (revision: StoredRevision) => Revision<T>): Snapshot<T> {
  const superseded = new Set(revisions.flatMap(revision => revision.parents));
  const heads = revisions.filter(revision => !revision.dismissed && !superseded.has(revision.id)).map(decode);
  const bad = heads.find(revision => revision.status !== 'ready');
  const current = heads[0];
  const state = bad ? { status: bad.status } : !current ? { status: 'empty' as const }
    : heads.length > 1 ? { status: 'conflict' as const }
    : current.status === 'ready' ? { status: current.status, current } : { status: current.status };
  let history: Revision<T>[] | undefined;
  return { ...state, heads, get history() {
    if (!history) {
      const byId = new Map(heads.map(head => [head.id, head]));
      history = revisions.map(row => byId.get(row.id) ?? decode(row));
    }
    return history;
  } };
}
