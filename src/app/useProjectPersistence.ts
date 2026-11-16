import { useEffect, useRef, useState } from 'react';
import type { ProjectDocument } from '../schemas';
import type { SavedTemplate } from '../features/project';
import { newProjectId, openPersistence } from '../features/persistence';
import type { Persistence, PersistenceError, Revision, TemplateSnapshot } from '../features/persistence';

export function useProjectPersistence(project: ProjectDocument, active: boolean, onLoad: (document: ProjectDocument | null) => void) {
  const store = useRef<Persistence | null>(null);
  const editor = useRef({ id: newProjectId(), parents: [] as string[] });
  const queue = useRef(Promise.resolve());
  const mounted = useRef(false);
  const load = useRef(onLoad); load.current = onLoad;
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<PersistenceError | null>(null);
  const [conflict, setConflict] = useState(false);
  const [savedText, setSavedText] = useState('');
  const [confirmedText, setConfirmedText] = useState('');
  const [pending, setPending] = useState(0);
  const [recovery, setRecovery] = useState<Revision<ProjectDocument>[]>([]);
  const [chooseRecovery, setChooseRecovery] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateState, setTemplateState] = useState<TemplateSnapshot>({ status: 'empty', heads: [], history: [] });
  const templateParents = useRef<string[]>([]);
  const templateWriting = useRef(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const text = JSON.stringify(project);
  const latest = useRef({ text, confirmedText }); latest.current = { text, confirmedText };

  function accept(revision: Revision<ProjectDocument>, parents = [revision.id]) {
    if (revision.status !== 'ready') return;
    editor.current = { id: revision.projectId!, parents };
    setSavedText(revision.kind === 'saved' ? JSON.stringify(revision.value) : '');
    setConfirmedText(JSON.stringify(revision.value)); setConflict(false); setChooseRecovery(false);
    load.current(revision.value);
  }
  function receiveTemplates(state: TemplateSnapshot) {
    setTemplateState(state);
    if (state.status === 'ready' || state.status === 'empty') {
      setTemplates(state.status === 'ready' ? state.current.value : []);
      templateParents.current = state.heads.map(head => head.id);
    }
  }
  useEffect(() => {
    let live = true, unsubscribe: (() => void) | undefined, instance: Persistence | undefined, readId = 0;
    mounted.current = true; setReady(false);
    void (async () => {
      const opened = await openPersistence();
      if (!live) { if (opened.ok) opened.value.close(); return; }
      if (!opened.ok) { setError(opened.error); setReady(true); if (!active || !retry) load.current(null); return; }
      instance = opened.value; store.current = instance;
      const initial = await instance.readWorkspace();
      if (!live) return;
      if (!initial.ok) { setError(initial.error); setReady(true); if (!active || !retry) load.current(null); return; }
      receiveTemplates(initial.value.templates); setError(null);
      const heads = initial.value.projects.flatMap(item => item.heads);
      setRecovery(heads);
      const saved = initial.value.projects.find(item => item.history.some(revision => revision.id === initial.value.savedRevisionId));
      const drafts = heads.filter(item => item.kind === 'draft');
      if (retry && active) { /* Keep the editor and its original parents when reconnecting. */ }
      else if (saved?.status === 'ready' && (!drafts.length || drafts.every(item => item.projectId === saved.projectId))) accept(saved.current);
      else if (!saved && heads.length === 1 && heads[0].status === 'ready') accept(heads[0]);
      else { setChooseRecovery(heads.length > 0); load.current(null); }
      setReady(true);
      unsubscribe = instance.subscribe(reason => {
        if (reason === 'local') return;
        if (reason === 'closed') { setConfirmedText(''); setError({ code: 'unavailable', message: 'Storage connection closed.', recovery: [] }); return; }
        const request = ++readId;
        void instance!.readWorkspace().then(result => {
          if (!live || request !== readId) return;
          if (!result.ok) { setError(result.error); setConfirmedText(''); return; }
          setRecovery(result.value.projects.flatMap(item => item.heads));
          if (!templateWriting.current) receiveTemplates(result.value.templates);
          const current = result.value.projects.find(item => item.projectId === editor.current.id);
          if (current && (current.status !== 'ready' || !editor.current.parents.includes(current.current.id))) setConflict(true);
        });
      });
    })();
    return () => { live = false; mounted.current = false; unsubscribe?.(); instance?.close(); store.current = null; };
  }, [retry]);

  function write(kind: 'saved' | 'draft', document = project, recovering = false) {
    const context = editor.current, instance = store.current, captured = JSON.stringify(document);
    if (!instance || !ready || (chooseRecovery && !recovering)) return Promise.resolve(false);
    setPending(count => count + 1);
    let succeeded = false;
    const operation = queue.current.then(async () => {
      const result = await instance.writeProject(context.id, document, { kind, parents: context.parents });
      if (result.ok) context.parents = [result.value.revision.id];
      if (!mounted.current || editor.current !== context) return;
      if (!result.ok) { setError(result.error); setConfirmedText(''); return; }
      setRecovery(previous => [...previous.filter(item => item.projectId !== context.id), ...result.value.snapshot.heads]);
      const conflicted = result.value.status === 'conflict';
      setConflict(conflicted); setError(null); setConfirmedText(conflicted ? '' : captured);
      if (kind === 'saved' && !conflicted) setSavedText(captured);
      succeeded = !conflicted;
    }).finally(() => { if (mounted.current) setPending(count => count - 1); });
    queue.current = operation;
    return operation.then(() => succeeded);
  }
  function replace() {
    if (active && text !== confirmedText) void write('draft');
    editor.current = { id: newProjectId(), parents: [] };
    setSavedText(''); setConfirmedText(''); setConflict(false); setChooseRecovery(false);
  }
  async function recover(revision: Revision<ProjectDocument>, resolve = false) {
    if (revision.status !== 'ready') return;
    if (active && text !== confirmedText) await write('draft');
    accept(revision, resolve ? recovery.filter(item => item.projectId === revision.projectId).map(item => item.id) : [revision.id]);
    setConfirmedText('');
    await write('draft', revision.value, true);
  }
  async function saveTemplates(next: SavedTemplate[], repair = false) {
    const instance = store.current, parents = repair ? templateState.heads.map(item => item.id) : templateParents.current.slice();
    if (!instance || templateWriting.current) return false;
    templateWriting.current = true; setTemplateBusy(true);
    try {
      const result = repair ? await instance.recoverTemplates(next, parents) : await instance.writeTemplates(next, parents);
      if (!mounted.current) return false;
      if (!result.ok) { setError(result.error); return false; }
      receiveTemplates(result.value.snapshot);
      if (result.value.status === 'conflict') return false;
      setError(null); return true;
    } finally { templateWriting.current = false; if (mounted.current) setTemplateBusy(false); }
  }
  useEffect(() => {
    if (!ready || !active || chooseRecovery || text === confirmedText) return;
    const timer = setTimeout(() => { if (latest.current.text === text && latest.current.confirmedText !== text) void write('draft'); }, 400);
    return () => clearTimeout(timer);
  }, [project, ready, active, chooseRecovery]);
  const protectedEdit = active && (text !== confirmedText || conflict || pending > 0);
  useEffect(() => {
    if (!protectedEdit) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [protectedEdit]);
  return { ready, error, conflict, pending, savedText, confirmedText, recovery, chooseRecovery, setChooseRecovery,
    templates, templateState, templateBusy, write, replace, recover, saveTemplates, retry: () => setRetry(value => value + 1),
    unsaved: text !== savedText || conflict, draftSaved: text === confirmedText && !conflict && !pending,
  };
}
