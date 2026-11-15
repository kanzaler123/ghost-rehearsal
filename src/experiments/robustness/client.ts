import { emptySummary } from './summarize';
import type { PreparedBatch, JobSummary } from './types';
import type { WorkerMessage } from './worker';

export interface BatchState {
  batch: PreparedBatch;
  rows: JobSummary[];
  currentJobId: string | null;
  status: 'running' | 'complete' | 'partial';
  startedAt: string;
  finishedAt: string | null;
  error?: string;
}

export type BatchWorker = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'>;

export class RobustnessClient {
  private worker: BatchWorker | null = null;
  private state: BatchState | null = null;

  constructor(private onState: (state: BatchState) => void,
    private createWorker: () => BatchWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })) {}

  getState() { return this.state; }

  private publish(state: BatchState) {
    this.state = state;
    this.onState(state);
    return state;
  }

  private terminate() {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
  }

  start(input: PreparedBatch) {
    this.cancel();
    const batch = structuredClone(input);
    this.state = {
      batch, rows: batch.jobs.map(job => emptySummary(batch, job, 'not-run')),
      currentJobId: null, status: 'running', startedAt: new Date().toISOString(), finishedAt: null,
    };
    try {
      const worker = this.createWorker();
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        const state = this.state;
        if (this.worker !== worker || !state || state.status !== 'running' || message.batchId !== state.batch.batchId) return;
        if (message.type === 'started') {
          const job = state.batch.jobs.find(job => job.id === message.job.id);
          if (job && state.rows.find(row => row.id === job.id)?.status === 'not-run') this.publish({ ...state, currentJobId: job.id });
        } else if (message.type === 'summary') {
          const job = state.batch.jobs.find(job => job.id === message.row.id);
          if (!job || message.row.batchId !== batch.batchId || message.row.seed !== job.seed
            || message.row.conditionId !== job.conditionId || message.row.planId !== job.planId
            || state.rows.find(row => row.id === job.id)?.status !== 'not-run') return;
          this.publish({ ...state, currentJobId: null, rows: state.rows.map(row => row.id === job.id ? message.row : row) });
        } else if (message.type === 'complete') {
          this.terminate();
          this.publish({ ...state, currentJobId: null,
            status: state.rows.some(row => row.status === 'not-run' || row.status === 'canceled') ? 'partial' : 'complete',
            finishedAt: new Date().toISOString() });
        } else if (message.type === 'error') this.fail(message.message);
      };
      worker.onerror = event => {
        event.preventDefault();
        if (this.worker === worker) this.fail(event.message || 'Worker error');
      };
      worker.onmessageerror = () => { if (this.worker === worker) this.fail('Worker message could not be read'); };
      this.publish(this.state);
      worker.postMessage(batch);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
    return this.state!;
  }

  private fail(message: string) {
    const state = this.state;
    if (!state || state.status !== 'running') return;
    this.terminate();
    const issues = [{ code: 'worker_error', severity: 'error' as const, message, entityIds: [], path: [] }];
    this.publish({ ...state, status: 'partial', currentJobId: null, error: message, finishedAt: new Date().toISOString(),
      rows: state.rows.map(row => row.id === state.currentJobId ? emptySummary(state.batch, row, 'failed', issues) : row) });
  }

  cancel() {
    const state = this.state;
    this.terminate();
    if (!state || state.status !== 'running') return state;
    return this.publish({ ...state, status: 'partial', currentJobId: null, finishedAt: new Date().toISOString(),
      rows: state.rows.map(row => row.id === state.currentJobId ? emptySummary(state.batch, row, 'canceled') : row) });
  }

  dispose() {
    this.cancel();
  }
}
