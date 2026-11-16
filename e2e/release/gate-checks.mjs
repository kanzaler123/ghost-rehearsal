import assert from 'node:assert/strict';
import { test } from 'node:test';
import RequiredChecks from './required-checks.ts';
import { releaseDecision, requiredJobs } from './gate.mjs';

const successful = () => Object.fromEntries(requiredJobs.map(job => [job, { result: 'success' }]));
test('only validated main push or manual main runs may deploy', () => {
  assert.equal(releaseDecision(successful(), 'push', 'refs/heads/main'), true);
  assert.equal(releaseDecision(successful(), 'workflow_dispatch', 'refs/heads/main'), true);
  for (const event of ['pull_request', 'pull_request_target', 'workflow_run']) assert.equal(releaseDecision(successful(), event, 'refs/heads/main'), false);
  assert.equal(releaseDecision(successful(), 'workflow_dispatch', 'refs/heads/test/release'), false);
});
for (const job of requiredJobs) for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
  test(`${job} ${result ?? 'missing'} blocks deployment`, () => {
    const needs = successful();
    if (result === undefined) delete needs[job]; else needs[job].result = result;
    assert.throws(() => releaseDecision(needs, 'push', 'refs/heads/main'), /Required job/);
  });
}

function report(overrides = {}, status = 'passed') {
  const testCase = { location: { file: '/e2e/release/critical.spec.ts' }, title: 'Required flow', expectedStatus: 'passed', results: [{ status: 'passed', retry: 0 }], titlePath: () => ['Required flow'], ...overrides };
  const reporter = new RequiredChecks();
  reporter.onBegin({}, { allTests: () => [testCase] });
  return reporter.onEnd({ status });
}
test('passed required test is accepted', async () => assert.equal(await report(), undefined));
for (const status of ['skipped', 'failed', 'timedOut', 'interrupted']) {
  test(`required test ${status} cannot be green`, async () => assert.deepEqual(await report({ results: [{ status, retry: 0 }] }), { status: 'failed' }));
}
test('expected failures, retries and unexecuted tests are rejected', async () => {
  assert.deepEqual(await report({ expectedStatus: 'failed' }), { status: 'failed' });
  assert.deepEqual(await report({ results: [{ status: 'passed', retry: 1 }] }), { status: 'failed' });
  assert.deepEqual(await report({ results: [] }), { status: 'failed' });
  assert.deepEqual(await report({}, 'interrupted'), { status: 'failed' });
});
test('zero required tests is rejected, including capture-only selection', async () => {
  const reporter = new RequiredChecks(); reporter.onBegin({}, { allTests: () => [] });
  assert.deepEqual(await reporter.onEnd({ status: 'passed' }), { status: 'failed' });
  assert.deepEqual(await report({ location: { file: '/e2e/ui/capture.spec.ts' }, title: 'capture matching UI review states', expectedStatus: 'skipped', results: [{ status: 'skipped', retry: 0 }] }), { status: 'failed' });
});
test('the existing optional capture does not waive any required test', async () => {
  const capture = { location: { file: '/e2e/ui/capture.spec.ts' }, title: 'capture matching UI review states', expectedStatus: 'skipped', results: [{ status: 'skipped', retry: 0 }], titlePath: () => ['Capture'] };
  const flow = { ...capture, location: { file: '/e2e/release/critical.spec.ts' }, title: 'Required flow', expectedStatus: 'passed', results: [{ status: 'passed', retry: 0 }] };
  const reporter = new RequiredChecks(); reporter.onBegin({}, { allTests: () => [capture, flow] });
  assert.equal(await reporter.onEnd({ status: 'passed' }), undefined);
  flow.results[0].status = 'skipped';
  assert.deepEqual(await reporter.onEnd({ status: 'passed' }), { status: 'failed' });
});
