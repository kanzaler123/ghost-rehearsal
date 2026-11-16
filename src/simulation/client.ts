import type { RunRequest } from '../schemas';
import type { SimulationRun } from './types';

export type SimulationWorker = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'>;
export interface SimulationFailure {
  code: 'input_clone' | 'worker_create' | 'worker_post' | 'worker_error' | 'worker_messageerror' | 'worker_response' | 'simulation_failed' | 'simulation_aborted';
  message: string;
}
export interface SimulationState {
  requestId: number;
  status: 'idle' | 'running' | 'succeeded' | 'failed' | 'canceled' | 'disposed';
  requests: RunRequest[];
  runs: SimulationRun[] | null;
  failure: SimulationFailure | null;
  lastSuccessful: { requestId: number; runs: SimulationRun[] } | null;
}

export class SimulationClient {
  private worker: SimulationWorker | null = null;
  private state: SimulationState = { requestId: 0, status: 'idle', requests: [], runs: null, failure: null, lastSuccessful: null };

  constructor(private onState: (state: SimulationState) => void,
    private createWorker: () => SimulationWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })) {}

  getState() { return this.state; }

  private publish(state: SimulationState) {
    this.state = state;
    this.onState(state);
    return this.state;
  }

  private terminate() {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null;
      worker.terminate();
    }
  }

  private active(requestId: number, worker?: SimulationWorker) {
    return this.state.status === 'running' && this.state.requestId === requestId && (!worker || this.worker === worker);
  }

  private fail(requestId: number, code: SimulationFailure['code'], error: unknown, runs: SimulationRun[] | null = null) {
    if (!this.active(requestId)) return;
    this.terminate();
    this.publish({ ...this.state, status: 'failed', runs, failure: { code, message: error instanceof Error ? error.message : String(error) } });
  }

  start(requests: RunRequest[]) {
    if (this.state.status === 'disposed') return this.state;
    this.terminate();
    const requestId = this.state.requestId + 1;
    this.state = { ...this.state, requestId, status: 'running', requests: [], runs: null, failure: null };
    try { this.state.requests = structuredClone(requests); }
    catch (error) { this.fail(requestId, 'input_clone', error); return this.state; }
    if (!requests.length) { this.fail(requestId, 'worker_response', 'No simulation requests'); return this.state; }
    let worker: SimulationWorker;
    try { worker = this.createWorker(); }
    catch (error) { this.fail(requestId, 'worker_create', error); return this.state; }
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<{ runs?: SimulationRun[]; error?: string }>) => {
      if (!this.active(requestId, worker)) return;
      const message = event.data;
      if (typeof message?.error === 'string') { this.fail(requestId, 'worker_response', message.error); return; }
      const runs = message?.runs;
      if (!Array.isArray(runs) || runs.length !== this.state.requests.length || runs.some((run, index) =>
        !run || !['succeeded', 'failed', 'aborted'].includes(run.status) || run.request?.plan?.id !== this.state.requests[index].plan.id)) {
        this.fail(requestId, 'worker_response', 'Worker returned an invalid simulation response'); return;
      }
      if (runs.some(run => run.status !== 'succeeded')) {
        this.fail(requestId, runs.some(run => run.status === 'failed') ? 'simulation_failed' : 'simulation_aborted', 'Simulation did not complete successfully', runs); return;
      }
      this.terminate();
      this.publish({ ...this.state, status: 'succeeded', runs, failure: null, lastSuccessful: { requestId, runs } });
    };
    worker.onerror = event => {
      if (!this.active(requestId, worker)) return;
      event.preventDefault();
      this.fail(requestId, 'worker_error', event.message || 'Simulation Worker failed');
    };
    worker.onmessageerror = () => {
      if (this.active(requestId, worker)) this.fail(requestId, 'worker_messageerror', 'Simulation Worker message could not be read');
    };
    this.publish(this.state);
    if (this.active(requestId, worker)) {
      try { worker.postMessage({ requests: this.state.requests }); }
      catch (error) { this.fail(requestId, 'worker_post', error); }
    }
    return this.state;
  }

  cancel() {
    if (this.state.status !== 'running') return this.state;
    this.terminate();
    return this.publish({ ...this.state, status: 'canceled', runs: null, failure: null });
  }

  dispose() {
    this.terminate();
    this.state = { ...this.state, status: 'disposed', requests: [], runs: null, failure: null, lastSuccessful: null };
  }

  reset() {
    if (this.state.status === 'disposed') return;
    this.terminate();
    this.publish({ requestId: this.state.requestId + 1, status: 'idle', requests: [], runs: null, failure: null, lastSuccessful: null });
  }
}
