import { describe, expect, it, vi } from 'vitest';
import { ImportClient, type ImportWorker } from '../src/features/imports/client';
import { parseImport, type ImportOptions } from '../src/features/imports/parser';
import { IMPORT_LIMITS, type ImportText } from '../src/features/imports/limits';

class FakeWorker {
  onmessage: ImportWorker['onmessage'] = null;
  onerror: ImportWorker['onerror'] = null;
  onmessageerror: ImportWorker['onmessageerror'] = null;
  sent?: { requestId: number; files: ImportText[]; options: ImportOptions };
  postMessage = vi.fn((message: NonNullable<FakeWorker['sent']>) => { this.sent = message; });
  terminate = vi.fn();
  emit(data: unknown) { this.onmessage?.call(this as unknown as Worker, { data } as MessageEvent); }
  complete() { this.emit({ requestId: this.sent!.requestId, result: parseImport(this.sent!.files, this.sent!.options) }); }
}
const options = { kind: 'services' as const, unit: 'seconds' as const };
const files = [{ name: 'service.csv', text: 'duration\n10' }];
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function setup() {
  const workers: FakeWorker[] = [], onState = vi.fn();
  const create = vi.fn(() => { const worker = new FakeWorker(); workers.push(worker); return worker; });
  const client = new ImportClient(onState, create);
  return { client, workers, onState, create };
}

describe('asynchronous import lifecycle', () => {
  it('snapshots text/options and exposes an applicable result only for the latest ready request', async () => {
    const { client, workers } = setup();
    const input = structuredClone(files), inputOptions = { kind: 'services' as const, unit: 'seconds' as 'seconds' | 'minutes' };
    const pending = client.startTexts(input, inputOptions);
    input[0].text = 'duration\n99'; inputOptions.unit = 'minutes';
    expect(client.getValue(1)).toBeNull();
    await tick(); workers[0].complete();
    const result = await pending;
    expect(result).toMatchObject({ status: 'ready', requestId: 1, validationComplete: true, value: { kind: 'services', preview: { samples: [10] } } });
    expect(client.getValue(1)).toBe(result.value);
    expect(client.getValue(0)).toBeNull();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    client.cancel();
    expect(client.getValue(1)).toBeNull();
  });

  it('lets a later selection win even when an older read resolves or rejects afterward', async () => {
    for (const rejectOld of [false, true]) {
      const { client, workers } = setup();
      let release!: (text: string) => void, reject!: (error: Error) => void;
      const old = { name: 'old.csv', size: 20, text: vi.fn(() => new Promise<string>((resolve, fail) => { release = resolve; reject = fail; })) };
      const first = client.startFiles([old], options); await tick();
      const second = client.startTexts(files, options); await tick(); workers[0].complete();
      expect((await first).status).toBe('canceled');
      expect((await second).status).toBe('ready');
      if (rejectOld) reject(new Error('late read failure')); else release('duration\n99');
      await tick();
      expect(workers).toHaveLength(1);
      expect(client.getState()).toMatchObject({ requestId: 2, status: 'ready', value: { preview: { samples: [10] } } });
    }
  });

  it('rejects oversized/multiple single-import files before any read and clears the busy state', async () => {
    const { client, create } = setup();
    const read = vi.fn(async () => 'duration\n10');
    const oversized = await client.startFiles([{ name: 'large.csv', size: IMPORT_LIMITS.fileBytes + 1, text: read }], options);
    expect(oversized).toMatchObject({ status: 'failed', failure: { code: 'file_bytes_limit' } });
    const multiple = await client.startFiles(Array(2).fill({ name: 'small.csv', size: 20, text: read }), options);
    expect(multiple).toMatchObject({ status: 'failed', failure: { code: 'files_limit' } });
    expect(read).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  });

  it('can reselect the same failed file without filename deduplication', async () => {
    const { client, workers } = setup();
    const input = { name: 'same.csv', size: 20, text: vi.fn(async () => files[0].text) };
    input.text.mockRejectedValueOnce(new Error('locked file'));
    expect(await client.startFiles([input], options)).toMatchObject({ status: 'failed', failure: { code: 'read_failed' } });
    const retry = client.startFiles([input], options); await tick(); workers[0].complete();
    expect((await retry).status).toBe('ready'); expect(input.text).toHaveBeenCalledTimes(2);
  });

  it.each(['worker_create', 'worker_post', 'worker_error', 'worker_messageerror', 'worker_response'] as const)('%s settles the request and can be retried', async code => {
    const { client, workers, create } = setup();
    if (code === 'worker_create') create.mockImplementationOnce(() => { throw new Error('unavailable'); });
    if (code === 'worker_post') create.mockImplementationOnce(() => {
      const worker = new FakeWorker(); worker.postMessage.mockImplementation(() => { throw new Error('clone failure'); }); workers.push(worker); return worker;
    });
    const pending = client.startTexts(files, options); await tick();
    const worker = workers.at(-1);
    if (code === 'worker_error') worker!.onerror?.call(worker as unknown as Worker, { message: 'script failed', preventDefault: vi.fn() } as unknown as ErrorEvent);
    if (code === 'worker_messageerror') worker!.onmessageerror?.call(worker as unknown as Worker, {} as MessageEvent);
    if (code === 'worker_response') worker!.emit({ requestId: client.getState().requestId, result: null });
    expect(await pending).toMatchObject({ status: 'failed', value: null, failure: { code } });
    if (worker) expect(worker.terminate).toHaveBeenCalled();
    const retry = client.startTexts(files, options); await tick(); workers.at(-1)!.complete();
    expect((await retry).status).toBe('ready');
  });

  it('ignores old messages and errors after restart, cancel and dispose', async () => {
    const { client, workers, onState } = setup();
    const first = client.startTexts(files, options); await tick();
    const old = workers[0], message = old.onmessage!, error = old.onerror!, unreadable = old.onmessageerror!;
    const second = client.startTexts(files, options); await tick();
    expect((await first).status).toBe('canceled');
    const active = client.getState(), calls = onState.mock.calls.length;
    const result = parseImport(files, options);
    message.call(old as unknown as Worker, { data: { requestId: 1, result } } as MessageEvent);
    error.call(old as unknown as Worker, { message: 'late', preventDefault: vi.fn() } as unknown as ErrorEvent);
    unreadable.call(old as unknown as Worker, {} as MessageEvent);
    workers[1].emit({ requestId: 1, result });
    expect(client.getState()).toBe(active); expect(onState).toHaveBeenCalledTimes(calls);
    const late = workers[1].onmessage!;
    client.cancel(); expect((await second).status).toBe('canceled');
    late.call(workers[1] as unknown as Worker, { data: { requestId: 2, result } } as MessageEvent);
    expect(client.getState().status).toBe('canceled');
    const third = client.startTexts(files, options); await tick();
    const notifications = onState.mock.calls.length;
    client.dispose(); expect((await third).status).toBe('disposed');
    expect(await client.startTexts(files, options)).toMatchObject({ status: 'disposed' });
    expect(onState).toHaveBeenCalledTimes(notifications);
    expect(workers).toHaveLength(3);
  });

  it('cancels pending reads on close without waiting for file.text()', async () => {
    const { client, create } = setup();
    const input = { name: 'pending.json', size: 100, text: () => new Promise<string>(() => {}) };
    const pending = client.startFiles([input], { kind: 'project' }); await tick();
    client.dispose();
    expect((await pending).status).toBe('disposed'); expect(create).not.toHaveBeenCalled();
  });

  it.each([null, {}, { result: {} }])('settles malformed responses without an identity: %j', async data => {
    const { client, workers } = setup();
    const pending = client.startTexts(files, options); await tick(); workers[0].emit(data);
    expect(await pending).toMatchObject({ status: 'failed', failure: { code: 'worker_response' } });
  });

  it('reports uncloneable options and allows a new request', async () => {
    const { client, workers, create } = setup();
    expect(await client.startTexts(files, { ...options, unsupported: () => {} } as ImportOptions))
      .toMatchObject({ status: 'failed', failure: { code: 'input_clone' } });
    expect(create).not.toHaveBeenCalled();
    const retry = client.startTexts(files, options); await tick(); workers[0].complete();
    expect((await retry).status).toBe('ready');
  });

  it('limits the first error page while retaining every diagnostic and total', async () => {
    const { client, workers } = setup();
    const rows = 'duration\n' + Array(240).fill('-1').join('\n');
    const pending = client.startTexts([{ name: 'bad.csv', text: rows }], options); await tick(); workers[0].complete();
    const state = await pending;
    expect(state).toMatchObject({ status: 'invalid', value: null, issueCount: 240, errorCount: 240, validationComplete: true });
    expect(state.issues).toHaveLength(50);
    expect(client.getIssues(50, 100)).toMatchObject({ total: 240, offset: 50, validationComplete: true });
    expect(client.getIssues(50, 100).items.map(issue => issue.row)).toEqual(Array.from({ length: 100 }, (_, index) => 52 + index));
    expect(client.getAllIssues()).toHaveLength(240);
    expect(client.getIssues(240).items).toEqual([]);
    expect(() => client.getIssues(-1)).toThrow();
    expect(() => client.getIssues(0, IMPORT_LIMITS.maxIssuePage + 1)).toThrow();
  });

  it('allows cancellation from the parsing notification without posting to the terminated Worker', async () => {
    const worker = new FakeWorker();
    const client = new ImportClient(state => { if (state.status === 'parsing') client.cancel(); }, () => worker);
    const result = await client.startFiles([{ name: 'service.csv', size: 20, text: async () => files[0].text }], options);
    expect(result.status).toBe('canceled');
    expect(worker.postMessage).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalled();
  });
});
