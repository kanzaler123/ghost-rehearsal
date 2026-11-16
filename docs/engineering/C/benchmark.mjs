import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release, arch, totalmem } from 'node:os';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createServer } from 'vite';

// Run from the worktree root: node docs/engineering/C/benchmark.mjs
const output = resolve('test-results/playback-benchmark');
await mkdir(output, { recursive: true });
const server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error' });
try {
  const { simulate } = await server.ssrLoadModule('/src/simulation/engine.ts');
  const { playbackAt, createPlaybackReader } = await server.ssrLoadModule('/src/simulation/playback.ts');
  const { referencePlaybackAt } = await server.ssrLoadModule('/tests/playback-reference.ts');
  const { playbackFixture } = await server.ssrLoadModule('/tests/fixtures/playback.ts');
  const methods = ['reference', 'indexed', 'incremental'];
  const options = { checkpointInterval: 2048, checkpointBudgetBytes: 4 * 1024 * 1024, maxCheckpoints: 32 };
  const warmups = 2, repetitions = 6;
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const report = {
    baseline: 'f8371999e64d25c250699e5cd96f85eabb79bb32',
    head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceHashes: {},
    environment: { node: process.version, v8: process.versions.v8, os: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0].model, logicalCpus: cpus().length, totalMemoryBytes: totalmem() },
    protocol: { warmups, repetitions, options, order: 'Rotate reference/indexed/incremental each repetition, including warmups; retain every sample; no forced GC.', timed: 'Reader construction, all four A/B current/trend queries, snapshot copying and disposal. Engine generation, log I/O and deep equality checks excluded.', limits: 'Computation only in Node/V8; no browser, pause, dragging, rendering, Safari or WebKit acceptance.' },
    fixtures: [], samples: [], summary: [],
  };
  const { readFile } = await import('node:fs/promises');
  for (const file of ['src/simulation/playback.ts', 'src/simulation/metrics.ts', 'tests/playback-reference.ts', 'tests/fixtures/playback.ts', 'docs/engineering/C/benchmark.mjs']) report.sourceHashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
  for (const [name, services, guests] of [['ordinary', 3, 12], ['dense', 198, 300]]) {
    const a = playbackFixture(services, guests), b = playbackFixture(services, guests);
    b.plan.id = 'plan-b';
    for (const node of b.plan.graph.nodes) if (node.type === 'service') node.duration.value = 1.203;
    const runs = [simulate(a), simulate(b)];
    for (const run of runs) assert.equal(run.status, 'succeeded', JSON.stringify(run.issues));
    const end = Math.max(...runs.map(run => run.events.at(-1)?.time ?? 0));
    const forward = Array.from({ length: 48 }, (_, i) => Math.round(end * i / 47 * 1000) / 1000);
    let seed = 7321;
    const seeks = [end, ...Array.from({ length: 31 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return Math.floor(seed / 2 ** 32 * end * 1000) / 1000;
    }), 0, end];
    const workloads = { forward, seeks, repeated: Array(24).fill(end) };
    report.fixtures.push({ name, runs: runs.map(run => ({ nodes: run.request.plan.graph.nodes.length, participants: run.population.length, events: run.events.length, coveredUntil: run.coveredUntil, lastEvent: run.events.at(-1)?.time, requestSha256: hash(run.request), eventsSha256: hash(run.events) })), queryTimes: workloads, trendOffsetSeconds: 60, readsPerTime: 'A current, B current, A trend, B trend' });
    await writeFile(resolve(output, `${name}-runs.json`), JSON.stringify(runs));
    console.log(`${name}: ${services + 2} nodes, ${guests} guests, ${runs.map(run => run.events.length).join('/')} A/B events`);
    for (const [workload, times] of Object.entries(workloads)) {
      const readers = runs.map(run => createPlaybackReader(run.events, run.request.plan, options));
      for (const time of times) for (const lane of ['current', 'trend']) for (let side = 0; side < runs.length; side++) {
        const run = runs[side], at = lane === 'trend' ? time - 60 : time;
        const expected = referencePlaybackAt(run.events, run.request.plan, at);
        assert.deepEqual(playbackAt(run.events, run.request.plan, at), expected);
        assert.deepEqual(readers[side].at(at, lane), expected);
      }
      readers.forEach(reader => reader.dispose());
      for (let repetition = 0; repetition < warmups + repetitions; repetition++) {
        const order = methods.map((_, i) => methods[(i + repetition) % methods.length]);
        for (const method of order) {
          const start = performance.now();
          const active = method === 'incremental' ? runs.map(run => createPlaybackReader(run.events, run.request.plan, options)) : [];
          let checksum = 0;
          for (const time of times) for (const lane of ['current', 'trend']) for (let side = 0; side < runs.length; side++) {
            const run = runs[side], at = lane === 'trend' ? time - 60 : time;
            const state = method === 'incremental' ? active[side].at(at, lane)
              : (method === 'reference' ? referencePlaybackAt : playbackAt)(run.events, run.request.plan, at);
            checksum += state.nodes.exit.completed + state.nodes['service-0'].queued.length;
          }
          const diagnostics = active.map(reader => reader.diagnostics());
          active.forEach(reader => reader.dispose());
          const elapsedMs = performance.now() - start;
          report.samples.push({ fixture: name, workload, method, warmup: repetition < warmups, repetition: repetition < warmups ? repetition + 1 : repetition - warmups + 1, order, queries: times.length * 4, elapsedMs, checksum, diagnostics });
          console.log(`${name}/${workload} ${repetition < warmups ? 'warmup' : 'measured'} ${repetition + 1}: ${method} ${elapsedMs.toFixed(3)} ms`);
        }
      }
      const checksums = report.samples.filter(sample => sample.fixture === name && sample.workload === workload).map(sample => sample.checksum);
      assert.equal(new Set(checksums).size, 1);
      for (const method of methods) {
        const allMs = report.samples.filter(sample => sample.fixture === name && sample.workload === workload && sample.method === method && !sample.warmup).map(sample => sample.elapsedMs);
        const sorted = [...allMs].sort((a, b) => a - b);
        report.summary.push({ fixture: name, workload, method, queries: times.length * 4, allMs, medianMs: (sorted[2] + sorted[3]) / 2, minMs: sorted[0], maxMs: sorted.at(-1) });
      }
      await writeFile(resolve(output, 'measurements.json'), JSON.stringify(report, null, 2));
    }
  }
  const csv = ['fixture,workload,method,warmup,repetition,queries,elapsedMs,checksum', ...report.samples.map(sample => [sample.fixture, sample.workload, sample.method, sample.warmup, sample.repetition, sample.queries, sample.elapsedMs, sample.checksum].join(','))].join('\n') + '\n';
  await writeFile(resolve(output, 'measurements.csv'), csv);
  console.table(report.summary.map(({ allMs, ...summary }) => summary));
  console.log(`All measurements and engine logs saved to ${output}`);
} finally {
  await server.close();
}
