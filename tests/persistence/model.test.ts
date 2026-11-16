import { describe, expect, it } from 'vitest';
import { initialDocument } from '../../src/features/project';
import { decodeProject, decodeTemplates, snapshot } from '../../src/features/persistence/model';
import type { StoredRevision } from '../../src/features/persistence/model';

function revision(id: string, parents: string[] = [], raw = JSON.stringify(initialDocument())): StoredRevision {
  return { version: 1, id, parents, projectId: 'project', tabId: id, kind: 'draft', createdAt: 1, raw };
}

describe('recovery snapshots', () => {
  it('detects sibling revisions without relying on timestamps or enumeration order', () => {
    const base = revision('base');
    const a = revision('a', ['base']), b = revision('b', ['base']);
    const state = snapshot([b, base, a], decodeProject);
    expect(state.status).toBe('conflict');
    expect(state.heads.map(item => item.id).sort()).toEqual(['a', 'b']);
    const merged = snapshot([base, a, b, revision('merged', ['a', 'b'])], decodeProject);
    expect(merged.status).toBe('ready');
    expect(merged.history).toHaveLength(4);
  });

  it('dismissing an exact head preserves raw history without reviving an older draft', () => {
    const state = snapshot([revision('a'), revision('b', ['a']), { ...revision('c', ['b']), dismissed: true }], decodeProject);
    expect(state.status).toBe('empty');
    expect(state.history.map(item => item.id)).toEqual(['a', 'b', 'c']);
    expect(state.history.every(item => item.raw.length > 0)).toBe(true);
  });

  it('distinguishes a missing library, a valid empty library, corrupt text and unsupported versions', () => {
    expect(snapshot([], decodeTemplates).status).toBe('empty');
    const empty = snapshot([revision('empty', [], '[]')], decodeTemplates);
    expect(empty.status).toBe('ready');
    if (empty.status === 'ready') expect(empty.current.value).toEqual([]);
    for (const raw of ['', '{broken', '{}', 'null']) {
      const bad = snapshot([revision('bad', [], raw)], decodeTemplates);
      expect(bad.status).toBe('corrupt');
      expect(bad).not.toHaveProperty('current');
      expect(bad.history[0].raw).toBe(raw);
    }
    expect(snapshot([revision('future', [], '{"schemaVersion":2}')], decodeTemplates).status).toBe('unsupported');
  });

  it('retains invalid project JSON and future project versions without a default document', () => {
    const raw = JSON.stringify({ ...initialDocument(), schemaVersion: 2 });
    const future = decodeProject(revision('future', [], raw));
    expect(future.status).toBe('unsupported');
    expect(future.raw).toBe(raw);
    expect(future).not.toHaveProperty('value');
    expect(decodeProject(revision('bad', [], '{')).status).toBe('corrupt');
  });
});
