import { checkLimit, checkTexts, IMPORT_LIMITS, importFailure, type ImportFailure, type ImportText } from './limits';
import type { ImportIssue, ImportOptions, ImportResult, ImportValue } from './parser';
import { readImportFiles, type ImportFile } from './read';

export type ImportWorker = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'>;
export interface ImportState {
  requestId: number;
  status: 'idle' | 'reading' | 'parsing' | 'ready' | 'invalid' | 'failed' | 'canceled' | 'disposed';
  value: ImportValue | null;
  issueCount: number;
  errorCount: number;
  issues: ImportIssue[];
  validationComplete: boolean;
  failure: ImportFailure | null;
}

export class ImportClient {
  private worker: ImportWorker | null = null;
  private pending: { requestId: number; controller: AbortController; resolve: (state: ImportState) => void } | null = null;
  private issues: ImportIssue[] = [];
  private state: ImportState = { requestId: 0, status: 'idle', value: null, issueCount: 0, errorCount: 0, issues: [], validationComplete: false, failure: null };

  constructor(private onState: (state: ImportState) => void,
    private createWorker: () => ImportWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })) {}

  getState() { return this.state; }
  getValue(requestId: number) { return this.state.requestId === requestId && this.state.status === 'ready' ? this.state.value : null; }
  getAllIssues() { return this.issues.slice(); }
  getIssues(offset = 0, size: number = IMPORT_LIMITS.issuePage) {
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(size) || size < 1 || size > IMPORT_LIMITS.maxIssuePage) throw new RangeError('Invalid diagnostic page');
    return { total: this.issues.length, offset, items: this.issues.slice(offset, offset + size), validationComplete: this.state.validationComplete };
  }

  private active(requestId: number, worker?: ImportWorker) {
    return this.pending?.requestId === requestId && (!worker || this.worker === worker);
  }

  private terminate() {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null;
      worker.terminate();
    }
  }

  private finish(requestId: number, state: ImportState) {
    if (!this.active(requestId)) return;
    const pending = this.pending!;
    this.pending = null;
    this.terminate();
    this.state = state;
    pending.resolve(state);
    this.onState(state);
  }

  private fail(requestId: number, failure: ImportFailure) {
    this.finish(requestId, { ...this.state, status: 'failed', value: null, failure });
  }

  private start(read: (signal: AbortSignal) => Promise<ImportText[]>, options: ImportOptions, status: 'reading' | 'parsing'): Promise<ImportState> {
    if (this.state.status === 'disposed') return Promise.resolve(this.state);
    const previous = this.pending;
    this.pending = null;
    previous?.controller.abort();
    this.terminate();
    previous?.resolve({ ...this.state, status: 'canceled', value: null });
    const requestId = this.state.requestId + 1;
    this.issues = [];
    this.state = { requestId, status, value: null, issueCount: 0, errorCount: 0, issues: [], validationComplete: false, failure: null };
    return new Promise(resolve => {
      const controller = new AbortController();
      this.pending = { requestId, controller, resolve };
      let snapshot: ImportOptions;
      try { snapshot = structuredClone(options); }
      catch (error) { this.fail(requestId, { code: 'input_clone', message: String(error) }); return; }
      this.onState(this.state);
      if (!this.active(requestId)) return;
      void (async () => {
        let files: ImportText[];
        try { files = await read(controller.signal); }
        catch (error) { if (this.active(requestId)) this.fail(requestId, importFailure(error)); return; }
        if (!this.active(requestId)) return;
        let worker: ImportWorker;
        try { worker = this.createWorker(); }
        catch (error) { this.fail(requestId, { code: 'worker_create', message: String(error) }); return; }
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<{ requestId: number; result: ImportResult }>) => {
          if (!this.active(requestId, worker)) return;
          if (typeof event.data?.requestId === 'number' && event.data.requestId !== requestId) return;
          const result = event.data?.result;
          if (event.data?.requestId !== requestId || !result || !Array.isArray(result.issues) || typeof result.validationComplete !== 'boolean') {
            this.fail(requestId, { code: 'worker_response', message: 'Import Worker returned an invalid response.' }); return;
          }
          this.issues = result.issues;
          this.finish(requestId, { requestId, status: result.value ? 'ready' : 'invalid', value: result.value,
            issueCount: result.issues.length, errorCount: result.issues.filter(issue => issue.severity === 'error').length,
            issues: result.issues.slice(0, IMPORT_LIMITS.issuePage), failure: result.failure, validationComplete: result.validationComplete });
        };
        worker.onerror = event => {
          if (!this.active(requestId, worker)) return;
          event.preventDefault();
          this.fail(requestId, { code: 'worker_error', message: event.message || 'Import Worker failed.' });
        };
        worker.onmessageerror = () => {
          if (this.active(requestId, worker)) this.fail(requestId, { code: 'worker_messageerror', message: 'Import Worker message could not be read.' });
        };
        this.state = { ...this.state, status: 'parsing' };
        this.onState(this.state);
        if (!this.active(requestId, worker)) return;
        try { worker.postMessage({ requestId, files, options: snapshot }); }
        catch (error) { this.fail(requestId, { code: 'worker_post', message: String(error) }); }
      })();
    });
  }

  startFiles(files: readonly ImportFile[], options: ImportOptions) {
    const selected = [...files];
    const multiple = options.kind === 'templates';
    return this.start(signal => {
      if (!multiple) checkLimit('files', selected.length, 1);
      return readImportFiles(selected, signal);
    }, options, 'reading');
  }

  startTexts(files: readonly ImportText[], options: ImportOptions) {
    const selected = files.map(file => ({ ...file }));
    const multiple = options.kind === 'templates';
    return this.start(async signal => {
      signal.throwIfAborted();
      if (!multiple) checkLimit('files', selected.length, 1);
      checkTexts(selected);
      return selected;
    }, options, 'parsing');
  }

  cancel() {
    if (this.state.status === 'disposed') return this.state;
    const pending = this.pending;
    this.pending = null;
    pending?.controller.abort();
    this.terminate();
    this.issues = [];
    this.state = { ...this.state, status: 'canceled', value: null, issues: [], issueCount: 0, errorCount: 0, validationComplete: false, failure: null };
    pending?.resolve(this.state);
    this.onState(this.state);
    return this.state;
  }

  dispose() {
    const pending = this.pending;
    this.pending = null;
    pending?.controller.abort();
    this.terminate();
    this.issues = [];
    this.state = { ...this.state, status: 'disposed', value: null, issues: [], issueCount: 0, errorCount: 0, validationComplete: false, failure: null };
    pending?.resolve(this.state);
  }
}
