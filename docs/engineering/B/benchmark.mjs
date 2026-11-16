import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, release, totalmem } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const baseline = 'f8371999e64d25c250699e5cd96f85eabb79bb32';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const scratch = join(root, 'test-results');
mkdirSync(scratch, { recursive: true });
const snapshot = mkdtempSync(join(scratch, 'sampling-baseline-'));
const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, watch: null } });

try {
  for (const file of git(['ls-tree', '-r', '--name-only', baseline, '--', 'src/schemas', 'src/simulation']).split('\n')) {
    const target = join(snapshot, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root }));
  }
  const prefix = `/${relative(root, snapshot).replaceAll('\\', '/')}`;
  const legacyInput = await server.ssrLoadModule(`${prefix}/src/simulation/input.ts`);
  const currentInput = await server.ssrLoadModule('/src/simulation/input.ts');
  const legacyEngine = await server.ssrLoadModule(`${prefix}/src/simulation/engine.ts`);
  const currentEngine = await server.ssrLoadModule('/src/simulation/engine.ts');
  const samples = Array.from({ length: 10000 }, (_, index) => ((index * 7919) % 997) / 100 + 0.00049);
  const duration = { kind: 'empirical', samples, provenance: { kind: 'synthetic', notes: 'Generated empirical-format benchmark data; not field observations.' } };
  const draws = Array.from({ length: 2000 }, (_, index) => legacyInput.keyedDraw(42, 'service', `guest:${index}`, 'service', 1));
  assert.deepEqual(draws.map(currentInput.prepareSampler(duration)), draws.map(u => legacyInput.sample(duration, u)));
  const request = {
    schemaVersion: 1, runMode: 'run_to_completion',
    scenario: { id: 'scenario', seed: 42, observationCutoff: 50, horizon: 2000, attributes: [], assumptionOverrides: [],
      arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' },
        records: Array.from({ length: 100 }, (_, index) => ({ id: `p${index}`, arrivalTime: 0, attributes: {} })) }] },
    plan: { id: 'plan', name: 'Empirical benchmark', scenarioId: 'scenario', skills: [], staff: [], deviceTypes: [], assignments: [], graph: {
      nodes: [
        { id: 'in', type: 'entrance', name: 'In', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
        { id: 'service', type: 'service', name: 'Service', stageKey: 'service', layout: { x: 300, y: 0 }, requirements: [], maxConcurrent: 4, duration, openWindows: [] },
        { id: 'out', type: 'exit', name: 'Out', layout: { x: 600, y: 0 } },
      ], edges: [{ id: 'in-service', source: 'in', target: 'service' }, { id: 'service-out', source: 'service', target: 'out' }],
    } },
  };
  const seeds = Array.from({ length: 10 }, (_, index) => 42 + index), multipliers = [1, 1.25];
  const requests = seeds.flatMap(seed => multipliers.map(factor => ({ ...request,
    scenario: { ...request.scenario, seed, assumptionOverrides: [{ kind: 'service_multiplier', factor }] },
  })));
  const before = structuredClone(requests);
  let events = 0, serviceStarts = 0;
  for (const item of requests) {
    const previous = legacyEngine.simulate(item), current = currentEngine.simulate(item);
    assert.equal(current.status, 'succeeded', JSON.stringify(current.issues));
    assert.deepEqual(current, previous);
    events += current.events.length;
    serviceStarts += current.events.filter(event => event.type === 'SERVICE_START').length;
  }
  assert.deepEqual(requests, before);

  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  function measure(label, legacy, prepared) {
    const rows = [];
    for (let round = 0; round <= 5; round++) {
      const row = { round, warmup: round === 0, order: round % 2 ? ['prepared', 'legacy'] : ['legacy', 'prepared'] };
      for (const variant of row.order) {
        const start = performance.now();
        row[`${variant}Checksum`] = (variant === 'legacy' ? legacy : prepared)();
        row[`${variant}Ms`] = performance.now() - start;
      }
      assert.equal(row.preparedChecksum, row.legacyChecksum);
      rows.push(row);
      console.error(`${label} ${row.warmup ? 'warmup' : round}: ${row.legacyMs.toFixed(3)} / ${row.preparedMs.toFixed(3)} ms (legacy / prepared)`);
    }
    const measured = rows.filter(row => !row.warmup);
    const legacyMedianMs = median(measured.map(row => row.legacyMs)), preparedMedianMs = median(measured.map(row => row.preparedMs));
    return { rows, legacyMedianMs, preparedMedianMs, speedup: legacyMedianMs / preparedMedianMs, reductionPercent: (1 - preparedMedianMs / legacyMedianMs) * 100 };
  }
  const sampling = measure('sampling', () => draws.reduce((sum, u) => sum + legacyInput.sample(duration, u), 0), () => {
    const prepared = currentInput.prepareSampler(duration);
    return draws.reduce((sum, u) => sum + prepared(u), 0);
  });
  const batchOf = simulate => () => requests.reduce((sum, item) => {
    const run = simulate(item);
    return sum + run.events.length + run.coveredUntil + run.statistics.averageWaiting + run.completion.averageWaiting;
  }, 0);
  const batch = measure('batch', batchOf(legacyEngine.simulate), batchOf(currentEngine.simulate));
  assert.deepEqual(requests, before);
  const result = {
    measuredAt: new Date().toISOString(), baseline, candidateHead: git(['rev-parse', 'HEAD']),
    candidateSourceSha256: Object.fromEntries(['src/simulation/input.ts', 'src/simulation/engine.ts'].map(file =>
      [file, createHash('sha256').update(readFileSync(join(root, file))).digest('hex')])),
    environment: { node: process.version, v8: process.versions.v8, platform: process.platform, osRelease: release(), arch: process.arch,
      cpu: cpus()[0].model, logicalCpus: cpus().length, memoryGiB: totalmem() / 1024 ** 3,
      vite: JSON.parse(readFileSync(join(root, 'node_modules/vite/package.json'), 'utf8')).version },
    workload: { sampleCount: samples.length, sampleFormula: '((index * 7919) % 997) / 100 + 0.00049', draws: draws.length,
      seeds, multipliers, guestsPerRun: 100, batchRuns: requests.length, serviceStarts, events, maxConcurrent: 4, observationCutoff: 50, horizon: 2000,
      warmupPairs: 1, measuredPairs: 5, samplingIncludesPreparation: true,
      scope: 'Node/Vite SSR: sampling and synchronous simulate() batch including validation, fingerprints, event generation and statistics; excludes Worker transport, UI, replay and robustness aggregation.' },
    equality: { draws: draws.length, fullRuns: requests.length, includes: ['input and scenario fingerprints', 'population', 'all events', 'status', 'coveredUntil', 'cutoff and final statistics including all outcomes', 'issues', 'unmodified requests'] },
    sampling, batch,
  };
  const output = resolve(root, process.argv[2] ?? 'test-results/sampling-benchmark.json');
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ output, samplingSpeedup: sampling.speedup, batchSpeedup: batch.speedup }));
} finally {
  await server.close();
  if (!realpathSync(snapshot).startsWith(`${realpathSync(scratch)}${sep}`)) throw new Error('Baseline snapshot is outside test-results');
  rmSync(snapshot, { recursive: true });
}
