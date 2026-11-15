import { describe, expect, it } from 'vitest';
import { initialDocument } from '../src/features/project';
import { parseDocument } from '../src/schemas';
import { RobustnessClient } from '../src/experiments/robustness/client';
import type { BatchWorker } from '../src/experiments/robustness/client';
import { defaultConfig, prepareBatch } from '../src/experiments/robustness/conditions';
import { exportBatch, exportGroup } from '../src/experiments/robustness/export';
import { runJob } from '../src/experiments/robustness/runner';
import type { WorkerMessage } from '../src/experiments/robustness/worker';

class FakeWorker {
  onmessage: BatchWorker['onmessage'] = null;
  onerror: BatchWorker['onerror'] = null;
  onmessageerror: BatchWorker['onmessageerror'] = null;
  terminated = false;
  sent: unknown;
  postMessage(message: unknown) { this.sent = message; }
  terminate() { this.terminated = true; }
  emit(message: WorkerMessage) { this.onmessage?.call(this as unknown as Worker, { data: message } as MessageEvent); }
}

function fixture(id = 'batch-1') {
  const project = initialDocument();
  const config = defaultConfig(project);
  config.seeds = [20261114];
  config.conditions = config.conditions.slice(0, 1);
  return prepareBatch(project, config, id);
}

function setup() {
  const workers: FakeWorker[] = [];
  const client = new RobustnessClient(() => {}, () => {
    const worker = new FakeWorker(); workers.push(worker); return worker;
  });
  return { client, workers };
}

describe('robustness Worker lifecycle and exports', () => {
  it('terminates a running Worker, preserves received rows, marks only active job canceled', () => {
    const { client, workers } = setup();
    const batch = fixture();
    client.start(batch);
    const row = runJob(batch, batch.jobs[0]);
    workers[0].emit({ type: 'summary', batchId: batch.batchId, row });
    workers[0].emit({ type: 'started', batchId: batch.batchId, job: batch.jobs[1] });
    client.cancel();
    expect(workers[0].terminated).toBe(true);
    expect(client.getState()?.rows.map(row => row.status)).toEqual(['succeeded', 'canceled']);
    expect(client.getState()?.rows[0]).toEqual(row);
    expect(client.getState()?.status).toBe('partial');
    expect(JSON.parse(exportBatch(client.getState()!)).status).toBe('partial');
  });

  it('cancel before first started message leaves all jobs not-run; dispose terminates', () => {
    const { client, workers } = setup();
    client.start(fixture());
    client.dispose();
    expect(workers[0].terminated).toBe(true);
    expect(client.getState()?.rows.every(row => row.status === 'not-run')).toBe(true);
  });

  it('immediate restart ignores old callbacks even when caller reuses a batchId', () => {
    const { client, workers } = setup();
    const batch = fixture();
    client.start(batch);
    const late = workers[0].onmessage!;
    client.start(batch);
    expect(workers[0].terminated).toBe(true);
    const row = runJob(batch, batch.jobs[0]);
    late.call(workers[0] as unknown as Worker, { data: { type: 'summary', batchId: batch.batchId, row } } as MessageEvent);
    workers[1].emit({ type: 'summary', batchId: 'other-batch', row });
    expect(client.getState()?.rows.every(row => row.status === 'not-run')).toBe(true);
    workers[1].emit({ type: 'summary', batchId: batch.batchId, row });
    expect(client.getState()?.rows[0]).toEqual(row);
    workers[1].emit({ type: 'summary', batchId: batch.batchId, row: { ...row, averageWaiting: 0 } });
    expect(client.getState()?.rows[0]).toEqual(row);
    client.dispose();
  });

  it('keeps complete failure lists and terminates on complete', () => {
    const { client, workers } = setup();
    const batch = fixture();
    batch.config.maxEvents = 1;
    client.start(batch);
    for (const job of batch.jobs) workers[0].emit({ type: 'summary', batchId: batch.batchId, row: runJob(batch, job) });
    workers[0].emit({ type: 'complete', batchId: batch.batchId });
    expect(workers[0].terminated).toBe(true);
    expect(client.getState()?.status).toBe('complete');
    const exported = JSON.parse(exportBatch(client.getState()!));
    expect(exported.rows).toHaveLength(2);
    expect(exported.rows.every((row: { status: string; averageWaiting: null }) => row.status === 'aborted' && row.averageWaiting === null)).toBe(true);
    expect(exported.aggregates[0].validPairs).toBe(0);
    expect(exported.project).toEqual(batch.project);
  });

  it('worker transport errors preserve completed rows and give active job null metrics', () => {
    const { client, workers } = setup();
    const batch = fixture();
    client.start(batch);
    workers[0].emit({ type: 'started', batchId: batch.batchId, job: batch.jobs[0] });
    workers[0].emit({ type: 'error', batchId: batch.batchId, message: 'transport failed' });
    expect(client.getState()?.rows.map(row => row.status)).toEqual(['failed', 'not-run']);
    expect(client.getState()?.rows[0].averageWaiting).toBeNull();
    expect(client.getState()?.error).toBe('transport failed');
    expect(workers[0].terminated).toBe(true);
  });

  it('worker creation failure is an exportable partial batch', () => {
    const client = new RobustnessClient(() => {}, () => { throw new Error('unavailable'); });
    client.start(fixture());
    expect(client.getState()?.status).toBe('partial');
    expect(client.getState()?.error).toBe('unavailable');
    expect(JSON.parse(exportBatch(client.getState()!)).rows).toHaveLength(2);
  });

  it('snapshots caller inputs; exports a valid shared-scenario project that reproduces each row', () => {
    const { client } = setup();
    const batch = fixture();
    const before = structuredClone(batch);
    client.start(batch);
    batch.project.plans[0].name = 'edited after start';
    expect(client.getState()?.batch).toEqual(before);
    const parsed = parseDocument(exportGroup(before, 20261114, before.config.conditions[0].id));
    expect(parsed.document).toBeDefined();
    expect(parsed.document!.scenarios).toHaveLength(1);
    expect(new Set(parsed.document!.plans.map(plan => plan.scenarioId)).size).toBe(1);
    const reproduced = prepareBatch(parsed.document!, { ...before.config, conditions: [{ id: 'original', label: 'Original', multiplier: 1 }] }, 'reproduction');
    for (let index = 0; index < before.jobs.length; index++) {
      const original = runJob(before, before.jobs[index]);
      const replay = runJob(reproduced, reproduced.jobs.find(job => job.planId === before.jobs[index].planId)!);
      expect(replay.inputKey).toBe(original.inputKey);
      expect(replay.scenarioKey).toBe(original.scenarioKey);
      expect(replay.outcomes).toEqual(original.outcomes);
      expect(replay.averageWaiting).toBe(original.averageWaiting);
    }
    expect(() => exportGroup(before, 99, before.config.conditions[0].id)).toThrow();
    expect(() => exportGroup(before, 20261114, 'missing')).toThrow();
    client.dispose();
  });
});
