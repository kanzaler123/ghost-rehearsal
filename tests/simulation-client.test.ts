import { describe, expect, it, vi } from 'vitest';
import { initialDocument } from '../src/features/project';
import { SimulationClient, type SimulationWorker } from '../src/simulation/client';
import { simulate } from '../src/simulation/engine';
import type { RunRequest } from '../src/schemas';

class FakeWorker {
  onmessage: SimulationWorker['onmessage'] = null;
  onerror: SimulationWorker['onerror'] = null;
  onmessageerror: SimulationWorker['onmessageerror'] = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  emit(data: unknown) { this.onmessage?.call(this as unknown as Worker, { data } as MessageEvent); }
}
const project = initialDocument();
const requests: RunRequest[] = project.plans.map(plan => ({ schemaVersion: 1, plan, scenario: project.scenarios[0], runMode: 'cutoff' }));
const runs = requests.map(simulate);
function setup() {
  const workers: FakeWorker[] = [], onState = vi.fn();
  const create = vi.fn(() => { const worker = new FakeWorker(); workers.push(worker); return worker; });
  const client = new SimulationClient(onState, create);
  return { client, workers, onState, create };
}

describe('ordinary simulation client', () => {
  it('releases the previous project on reset and rejects its late response', () => {
    const { client, workers } = setup();
    client.start(requests); workers[0].emit({ runs });
    client.start(requests);
    const late = workers[1].onmessage!;
    client.reset();
    late.call(workers[1] as unknown as Worker, { data: { runs } } as MessageEvent);
    expect(client.getState()).toMatchObject({ status: 'idle', requests: [], runs: null, lastSuccessful: null });
    client.start(requests); workers[2].emit({ runs });
    expect(client.getState().status).toBe('succeeded');
    client.dispose();
    expect(client.getState()).toMatchObject({ status: 'disposed', requests: [], runs: null, lastSuccessful: null });
  });
  it('keeps the existing protocol, snapshots requests and terminates a successful Worker', () => {
    const { client, workers } = setup();
    const input = structuredClone(requests);
    client.start(input);
    input[0].plan.name = 'Edited after start';
    expect(workers[0].postMessage).toHaveBeenCalledWith({ requests });
    expect(client.getState()).toMatchObject({ status: 'running', runs: null, lastSuccessful: null });
    workers[0].emit({ runs });
    expect(client.getState()).toMatchObject({ status: 'succeeded', requestId: 1, runs, lastSuccessful: { requestId: 1, runs } });
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect([workers[0].onmessage, workers[0].onerror, workers[0].onmessageerror]).toEqual([null, null, null]);
  });

  it.each(['worker_create', 'worker_post', 'worker_error', 'worker_messageerror', 'worker_response'] as const)('%s exits running, preserves prior success and permits retry', code => {
    const { client, workers, create } = setup();
    client.start(requests); workers[0].emit({ runs });
    const previous = client.getState().lastSuccessful;
    if (code === 'worker_create') create.mockImplementationOnce(() => { throw new Error('construction failed'); });
    if (code === 'worker_post') create.mockImplementationOnce(() => {
      const worker = new FakeWorker(); worker.postMessage.mockImplementation(() => { throw new Error('send failed'); }); workers.push(worker); return worker;
    });
    client.start(requests);
    const worker = workers.at(-1)!;
    if (code === 'worker_error') worker.onerror?.call(worker as unknown as Worker, { message: 'load failed', preventDefault: vi.fn() } as unknown as ErrorEvent);
    if (code === 'worker_messageerror') worker.onmessageerror?.call(worker as unknown as Worker, {} as MessageEvent);
    if (code === 'worker_response') worker.emit({ error: 'simulation threw' });
    expect(client.getState()).toMatchObject({ status: 'failed', requestId: 2, runs: null, failure: { code } });
    expect(client.getState().lastSuccessful).toBe(previous);
    expect(worker.terminate).toHaveBeenCalled();
    client.start(requests);
    expect(client.getState()).toMatchObject({ status: 'running', failure: null, runs: null });
    workers.at(-1)!.emit({ runs });
    expect(client.getState()).toMatchObject({ status: 'succeeded', requestId: 3, lastSuccessful: { requestId: 3 } });
  });

  it('ignores all old callbacks across immediate restart, cancellation and retry', () => {
    const { client, workers, onState } = setup();
    client.start(requests);
    const old = workers[0], message = old.onmessage!, error = old.onerror!, unreadable = old.onmessageerror!;
    client.start(requests);
    const active = client.getState(), calls = onState.mock.calls.length, preventDefault = vi.fn();
    message.call(old as unknown as Worker, { data: { runs } } as MessageEvent);
    error.call(old as unknown as Worker, { message: 'late', preventDefault } as unknown as ErrorEvent);
    unreadable.call(old as unknown as Worker, {} as MessageEvent);
    expect(client.getState()).toBe(active);
    expect(onState).toHaveBeenCalledTimes(calls);
    expect(preventDefault).not.toHaveBeenCalled();
    const late = workers[1].onmessage!;
    client.cancel(); client.cancel();
    expect(client.getState()).toMatchObject({ status: 'canceled', runs: null });
    client.start(requests);
    late.call(workers[1] as unknown as Worker, { data: { runs } } as MessageEvent);
    expect(client.getState().status).toBe('running');
    workers[2].emit({ runs });
    expect(client.getState().status).toBe('succeeded');
  });

  it('checks request identity even when a test factory reuses a Worker object', () => {
    const worker = new FakeWorker(), client = new SimulationClient(() => {}, () => worker);
    client.start(requests);
    const late = worker.onmessage!;
    client.start(requests);
    late.call(worker as unknown as Worker, { data: { runs } } as MessageEvent);
    expect(client.getState().status).toBe('running');
    worker.emit({ runs });
    expect(client.getState().status).toBe('succeeded');
  });

  it.each([null, {}, { runs: [] }, { runs: [runs[1], runs[0]] }])('rejects malformed or mismatched response %j', message => {
    const { client, workers } = setup(); client.start(requests); workers[0].emit(message);
    expect(client.getState()).toMatchObject({ status: 'failed', failure: { code: 'worker_response' } });
  });

  it('keeps failed and aborted run evidence separate from the previous successful result', () => {
    const { client, workers } = setup(); client.start(requests); workers[0].emit({ runs });
    const previous = client.getState().lastSuccessful;
    const aborted = simulate({ ...requests[0], maxEvents: 1 });
    client.start(requests); workers[1].emit({ runs: [aborted, runs[1]] });
    expect(client.getState()).toMatchObject({ status: 'failed', failure: { code: 'simulation_aborted' }, runs: [aborted, runs[1]] });
    expect(client.getState().lastSuccessful).toBe(previous);
    client.start(requests); client.cancel();
    expect(client.getState().lastSuccessful).toBe(previous);
  });

  it('reports uncloneable inputs without starting a Worker', () => {
    const { client, create } = setup();
    client.start([{ ...requests[0], unsupported: () => {} } as RunRequest]);
    expect(client.getState()).toMatchObject({ status: 'failed', failure: { code: 'input_clone' } });
    expect(create).not.toHaveBeenCalled();
    client.start(requests); expect(client.getState().status).toBe('running'); client.dispose();
  });

  it('retains simulation validation failures as evidence and retries after disposal of their Worker', () => {
    const { client, workers } = setup();
    const invalid = structuredClone(requests); invalid[0].scenario.horizon = -1;
    const failed = invalid.map(simulate);
    expect(failed.some(run => run.status === 'failed')).toBe(true);
    client.start(invalid); workers[0].emit({ runs: failed });
    expect(client.getState()).toMatchObject({ status: 'failed', runs: failed, failure: { code: 'simulation_failed' }, lastSuccessful: null });
    client.start(requests); workers[1].emit({ runs });
    expect(client.getState().status).toBe('succeeded');
  });

  it('handles cancellation from the running notification and disposes without UI notifications', () => {
    const worker = new FakeWorker(), changed = vi.fn();
    const client = new SimulationClient(state => { changed(state); if (state.status === 'running') client.cancel(); }, () => worker);
    client.start(requests);
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(client.getState().status).toBe('canceled');
    const calls = changed.mock.calls.length;
    client.dispose(); client.dispose(); client.start(requests);
    expect(client.getState().status).toBe('disposed');
    expect(changed).toHaveBeenCalledTimes(calls);
  });

  it('disposes an active Worker and ignores its queued callbacks', () => {
    const { client, workers, onState } = setup();
    client.start(requests);
    const worker = workers[0], message = worker.onmessage!, error = worker.onerror!, unreadable = worker.onmessageerror!;
    const calls = onState.mock.calls.length;
    client.dispose();
    message.call(worker as unknown as Worker, { data: { runs } } as MessageEvent);
    error.call(worker as unknown as Worker, { message: 'late', preventDefault: vi.fn() } as unknown as ErrorEvent);
    unreadable.call(worker as unknown as Worker, {} as MessageEvent);
    expect(client.getState().status).toBe('disposed');
    expect(worker.terminate).toHaveBeenCalledOnce(); expect(onState).toHaveBeenCalledTimes(calls);
  });
});
