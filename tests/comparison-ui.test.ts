import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { changeText } from '../src/components/comparisonText';
import { GhostJourney, groupPicks } from '../src/components/Journey';
import { comparePicks, planChanges } from '../src/features/analysis';
import { initialDocument } from '../src/features/project';
import { I18nProvider } from '../src/i18n';
import { MESSAGES } from '../src/i18n/messages';
import type { Plan, RunRequest, ServiceNode } from '../src/schemas';
import { simulate } from '../src/simulation/engine';

const document = initialDocument();
const scenario = document.scenarios[0];
const service = (plan: Plan) => plan.graph.nodes.find(node => node.type === 'service') as ServiceNode;

describe.each(['en', 'zh'] as const)('readable comparison changes (%s)', lang => {
  const t = MESSAGES[lang];
  it('distinguishes changed ranges and modes even when the distribution kind stays the same', () => {
    const a = structuredClone(document.plans[0]), b = structuredClone(a);
    service(a).duration = { kind: 'uniform', min: 10, max: 20, provenance: { kind: 'synthetic' } };
    service(b).duration = { kind: 'uniform', min: 40, max: 60, provenance: { kind: 'synthetic' } };
    let text = changeText(planChanges(a, b).find(item => item.id === service(a).id)!, a, b, t);
    for (const seconds of [10, 20, 40, 60]) expect(text).toContain(t.formatWait(seconds));
    service(a).duration = { kind: 'triangular', min: 0, mode: 10, max: 30, provenance: { kind: 'synthetic' } };
    service(b).duration = { kind: 'triangular', min: 0, mode: 20, max: 30, provenance: { kind: 'synthetic' } };
    text = changeText(planChanges(a, b).find(item => item.id === service(a).id)!, a, b, t);
    expect(text).toContain(t.formatWait(10));
    expect(text).toContain(t.formatWait(20));
  });

  it('shows sampling evidence and schedule changes rather than field names alone', () => {
    const a = structuredClone(document.plans[0]), b = structuredClone(a);
    service(a).duration = { kind: 'empirical', samples: [1, 2, 3], provenance: { kind: 'synthetic' } };
    service(b).duration = { kind: 'empirical', samples: [10, 20, 30, 40], provenance: { kind: 'synthetic' } };
    service(a).openWindows = [];
    service(b).openWindows = [{ openAt: 300, closeAt: 900, provenance: { kind: 'synthetic' } }];
    a.staff[0].shifts = [{ start: 0, end: 300 }];
    b.staff[0].shifts = [{ start: 300, end: 900 }];
    const changed = planChanges(a, b);
    const nodeText = changeText(changed.find(item => item.id === service(a).id)!, a, b, t);
    expect(nodeText).toContain(t.formatWait(25));
    expect(nodeText).toContain('05:00–15:00');
    const staffText = changeText(changed.find(item => item.id === a.staff[0].id)!, a, b, t);
    expect(staffText).toContain('00:00–05:00');
    expect(staffText).toContain('05:00–15:00');
  });

  it('preserves posting times and handover when the set of stations is unchanged', () => {
    const a = structuredClone(document.plans[0]), b = structuredClone(a);
    const id = a.staff[0].id, station = service(a);
    a.assignments = [{ resourceUnitId: id, periods: [{ from: 0, to: 600, nodeIds: [station.id] }] }];
    b.assignments = [{ resourceUnitId: id, periods: [{ from: 300, to: 900, nodeIds: [station.id], handoverSec: 30 }] }];
    const text = changeText(planChanges(a, b).find(item => item.kind === 'assignment')!, a, b, t);
    expect(text).toContain(station.name);
    expect(text).toContain('00:00–10:00');
    expect(text).toContain('05:00–15:00');
    expect(text).toContain(t.formatWait(30));
  });

  it('shows changed branch probabilities and destination names', () => {
    const a = structuredClone(document.plans[0]), b = structuredClone(a);
    const left = a.graph.nodes.find(node => node.type === 'decision' && node.routing.kind === 'probability')!;
    const right = b.graph.nodes.find(node => node.id === left.id)!;
    if (left.type !== 'decision' || left.routing.kind !== 'probability' || right.type !== 'decision' || right.routing.kind !== 'probability') throw new Error('Expected probability routing');
    left.routing.branches[0].weight = 0.2; left.routing.branches[1].weight = 0.8;
    right.routing.branches[0].weight = 0.7; right.routing.branches[1].weight = 0.3;
    const text = changeText(planChanges(a, b).find(item => item.id === left.id)!, a, b, t, scenario);
    for (const weight of ['20%', '80%', '70%', '30%']) expect(text).toContain(weight);
    const destination = a.graph.edges.find(edge => edge.source === left.id && edge.branchKey === left.routing.branches[0].branchKey)!.target;
    expect(text).toContain(a.graph.nodes.find(node => node.id === destination)!.name);
  });
});

it('combines overlapping representative stories without dropping their reasons', () => {
  const [a, b] = document.plans.map(plan => simulate({ schemaVersion: 1, scenario, plan, runMode: 'cutoff' }));
  const picks = comparePicks(a.statistics!, b.statistics!, 1);
  const cards = groupPicks(picks);
  expect(cards).toHaveLength(2);
  expect(cards.find(card => card.id === 'side-stream:10')?.tags.map(tag => tag.key)).toEqual(['rescued', 'less']);
  expect(cards.find(card => card.id === 'side-stream:2')?.tags.map(tag => tag.key)).toEqual(['more', 'lost']);
});

it('renders run-to-completion journeys and their station totals using the displayed cutoff', () => {
  const request: RunRequest = {
    schemaVersion: 1, runMode: 'run_to_completion',
    scenario: { id: 'scenario', seed: 42, observationCutoff: 5, horizon: 60, attributes: [], assumptionOverrides: [],
      arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [
        { id: 'p0', arrivalTime: 0, attributes: {} }, { id: 'p1', arrivalTime: 0, attributes: {} },
      ] }] },
    plan: { id: 'plan', name: 'Service', scenarioId: 'scenario', skills: [], staff: [], deviceTypes: [], assignments: [],
      graph: { nodes: [
        { id: 'in', type: 'entrance', name: 'Entrance', arrivalStreamIds: ['guests'], layout: { x: 0, y: 0 } },
        { id: 'service', type: 'service', name: 'Check in', stageKey: 'service', maxConcurrent: 1, requirements: [], openWindows: [], layout: { x: 300, y: 0 },
          duration: { kind: 'fixed', value: 10, provenance: { kind: 'synthetic' } } },
        { id: 'out', type: 'exit', name: 'Exit', layout: { x: 600, y: 0 } },
      ], edges: [{ id: 'in-service', source: 'in', target: 'service' }, { id: 'service-out', source: 'service', target: 'out' }] } },
  };
  const run = simulate(request);
  expect(run.coveredUntil).toBeGreaterThan(5);
  const html = renderToStaticMarkup(createElement(I18nProvider, { children: createElement(GhostJourney, {
    runs: [run], compare: false, scenario: request.scenario, visitorId: 'guests:p1', time: 20, endTime: run.coveredUntil,
    picks: [], nameOf: id => id, onChoose: () => {}, onJump: () => {}, onLocate: () => {},
  }) }));
  const table = html.match(/<table class="station-table">[\s\S]*?<\/table>/)?.[0];
  expect(table).toContain('through 00:05');
  expect(table).toContain('<td>5.0 s</td>');
  expect(table).not.toContain('<td>10.0 s</td>');
  expect(html).toContain('waited 5.0 s in total');
  expect(html).toContain('class="lane-cutoff"');
  expect(html).not.toContain('Finished at 00:20');
  const staleHtml = renderToStaticMarkup(createElement(I18nProvider, { children: createElement(GhostJourney, {
    runs: [run], compare: false, scenario: { ...request.scenario, observationCutoff: 15 }, visitorId: 'guests:p1', time: 20, endTime: run.coveredUntil,
    picks: [], nameOf: id => id, onChoose: () => {}, onJump: () => {}, onLocate: () => {},
  }) }));
  expect(staleHtml).toContain('through 00:05');
  expect(staleHtml).not.toContain('through 00:15');
  const finalHtml = renderToStaticMarkup(createElement(I18nProvider, { children: createElement(GhostJourney, {
    runs: [run], compare: false, basis: 'completion', scenario: request.scenario, visitorId: 'guests:p1', time: 20, endTime: run.coveredUntil,
    picks: [], nameOf: id => id, onChoose: () => {}, onJump: () => {}, onLocate: () => {},
  }) }));
  expect(finalHtml).toContain('through 00:20');
  expect(finalHtml).toContain('Finished at 00:20');
  expect(finalHtml).toContain('waited 10.0 s in total');
  expect(finalHtml).not.toContain('{text.basis}');
});

it('counts each future once when a guest visits several nodes sharing a logical stage', () => {
  const scenario: RunRequest['scenario'] = { id: 'scenario', seed: 42, observationCutoff: 100, horizon: 200, attributes: [], assumptionOverrides: [],
    arrivalStreams: [{ id: 'guests', kind: 'records', provenance: { kind: 'synthetic' }, records: [{ id: 'p', arrivalTime: 0, attributes: {} }] }] };
  const makeService = (id: string, seconds: number): ServiceNode => ({ id, type: 'service', name: id, layout: { x: 200, y: 0 }, stageKey: 'shared-stage',
    requirements: [], openWindows: [], maxConcurrent: 1, duration: { kind: 'fixed', value: seconds, provenance: { kind: 'synthetic' } } });
  const a: Plan = { id: 'a', name: 'A', scenarioId: scenario.id, skills: [], staff: [], deviceTypes: [], assignments: [], graph: {
    nodes: [{ id: 'in', type: 'entrance', name: 'Entrance', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
      makeService('one', 10), makeService('two', 15), { id: 'out', type: 'exit', name: 'Exit', layout: { x: 600, y: 0 } }],
    edges: [{ id: 'in-one', source: 'in', target: 'one' }, { id: 'one-two', source: 'one', target: 'two' }, { id: 'two-out', source: 'two', target: 'out' }],
  } };
  const b = structuredClone(a); b.id = 'b'; b.name = 'B';
  b.graph.nodes = b.graph.nodes.filter(node => node.id !== 'two');
  service(b).duration = { kind: 'fixed', value: 20, provenance: { kind: 'synthetic' } };
  b.graph.edges = [{ id: 'in-one', source: 'in', target: 'one' }, { id: 'one-out', source: 'one', target: 'out' }];
  const runs = [a, b].map(plan => simulate({ schemaVersion: 1, scenario, plan, runMode: 'cutoff' }));
  for (const run of runs) {
    expect(run.status).toBe('succeeded');
    expect(run.issues.filter(issue => issue.severity === 'error')).toEqual([]);
  }
  const html = renderToStaticMarkup(createElement(I18nProvider, { children: createElement(GhostJourney, {
    runs, compare: true, scenario, visitorId: 'guests:p', time: 100, endTime: 100,
    picks: [], nameOf: id => id, onChoose: () => {}, onJump: () => {}, onLocate: () => {},
  }) }));
  const table = html.match(/<table class="station-table">[\s\S]*?<\/table>/)?.[0];
  expect(table).toContain('one / two');
  expect(table).toContain('<td>25.0 s</td>');
  expect(table?.match(/<td>20\.0 s<\/td>/g)).toHaveLength(1);
  expect(table?.match(/<tr[ >]/g)).toHaveLength(2); // One header and one logical station.
});
