import { describe, expect, it } from 'vitest';
import { executionReport, halloweenProject, initialDocument } from '../src/features/project';
import { nodeEvidence, pairedVisitors, statisticsAt } from '../src/features/analysis';
import { MESSAGES } from '../src/i18n/messages';
import { simulate } from '../src/simulation/engine';
import { playbackAt } from '../src/simulation/metrics';

const document = initialDocument();
const [a, b] = document.plans.map(plan => simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'run_to_completion' }));

describe('Open House evidence', () => {
  it('preserves the default result and pairs the same people without equating shorter waits with better outcomes', () => {
    expect([a.statistics!.outcomes.completed, b.statistics!.outcomes.completed]).toEqual([43, 41]);
    const pairs = pairedVisitors(a, b, 'cutoff');
    expect([pairs.filter(pair => pair.delta < 0).length, pairs.filter(pair => pair.delta > 0).length, pairs.filter(pair => pair.delta === 0).length]).toEqual([66, 26, 208]);
    expect(pairs.filter(pair => pair.a.outcome === 'unfinished' && pair.b.outcome === 'completed')).toHaveLength(7);
    expect(pairs.filter(pair => pair.a.outcome === 'completed' && pair.b.outcome === 'unfinished')).toHaveLength(9);
    expect(pairs.filter(pair => pair.delta < 0 && pair.a.outcome === 'unfinished' && pair.b.outcome === 'diverted')).toHaveLength(2);
    expect(pairs.filter(pair => pair.delta < 0 && pair.b.outcome === 'diverted')).toHaveLength(3);
    expect(a.statistics!.averageWaiting! - b.statistics!.averageWaiting!).toBeCloseTo(2.3833333333);
  });
  it('counts completed passages through entrances, merges, decisions and holding areas', () => {
    const view = playbackAt(a.events, a.request.plan, 1800);
    expect(view.nodes.main.completed).toBe(180);
    expect(view.nodes.intake.completed).toBe(300);
    expect(view.nodes.tickets.completed).toBe(300);
    expect(view.nodes.holding.completed).toBe(a.events.filter(event => event.time <= 1800 && event.type === 'HOLD_RELEASE' && event.nodeId === 'holding').length);
    expect(a.statistics!.nodes.find(node => node.id === 'orientation')!.maxQueue).toBe(0);
  });
  it('provides a positive-duration backlog with resource and post evidence from the owning plan', () => {
    const evidence = nodeEvidence(b, 'checkin-extra', 'cutoff')!;
    expect(evidence.node.id).toBe('checkin-extra');
    expect(evidence.to).toBeGreaterThan(evidence.from);
    expect(evidence.queued).toBeGreaterThan(0);
    expect(evidence.resources.find(item => item.id === 'check-staff')!.posted).toBe(false);
    expect(evidence.visitors.length).toBe(evidence.queued + evidence.blocked + evidence.holding);
    expect(nodeEvidence(a, 'orientation', 'cutoff')).toBeNull();
  });
  it('separates final statistics and declines incompatible pairing', () => {
    expect(statisticsAt(a, 'completion')!.until).toBe(a.coveredUntil);
    expect(statisticsAt(a, 'completion')!.outcomes).not.toEqual(statisticsAt(a, 'cutoff')!.outcomes);
    expect(pairedVisitors(a, { ...b, scenarioKey: 'changed' }, 'cutoff')).toEqual([]);
    expect(pairedVisitors(a, { ...b, completion: null }, 'completion')).toEqual([]);
    expect(pairedVisitors(a, { ...b, status: 'aborted' }, 'cutoff')).toEqual([]);
  });
  it('tests additional packing capacity with its explicit extra staffing cost', () => {
    const plan = structuredClone(document.plans[1]);
    const staff = structuredClone(plan.staff.find(item => item.id === 'pack-staff')!);
    staff.id = 'packing-support-1'; plan.staff.push(staff);
    plan.assignments.push({ resourceUnitId: staff.id, periods: [{ from: 0, nodeIds: ['packing'] }] });
    const run = simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'cutoff' });
    expect(plan.staff).toHaveLength(4);
    expect(run.statistics!.outcomes).toMatchObject({ completed: 72, unfinished: 218, diverted: 10 });
    expect(run.statistics!.averageWaiting).toBeCloseTo(954.0833333333);
    expect(run.statistics!.p90Waiting).toBe(1444.286);
  });
});

it.each(['en', 'zh'] as const)('exports actionable rules and sources in %s without serialized model JSON', lang => {
  const t = MESSAGES[lang], haunted = halloweenProject('haunted', t);
  const report = executionReport(haunted.plans[0], haunted.scenarios[0], undefined, false, t);
  expect(report).toContain(lang === 'en' ? 'Release 6 guests per batch' : '每批放行 6 人');
  expect(report).toContain(lang === 'en' ? 'hold at most 1.0 min' : '最长等待 1.0 分');
  expect(report).toContain(t.review.sources.synthetic);
  expect(report).not.toContain('```json');
  const openHouse = executionReport(document.plans[1], document.scenarios[0], b, false, t, document.plans[0]);
  expect(openHouse).toContain('ticket ∈ vip');
  expect(openHouse).toContain('10:00');
  expect(openHouse).toContain(`${t.review.devices}: 1 → 2`);
  expect(openHouse).toContain(t.inspector.fullReroute);
});
