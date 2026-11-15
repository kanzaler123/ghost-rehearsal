import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../src/i18n';
import { MESSAGES } from '../src/i18n/messages';
import { initialDocument } from '../src/features/project';
import { costOf, journeyOf, keyEvents, waitingAt } from '../src/features/analysis';
import { playbackAt } from '../src/simulation/metrics';
import { simulate } from '../src/simulation/engine';
import { comparisonMetrics, conclusionGroups } from '../src/components/shell/comparisonMetrics';
import { ComparisonSnapshot } from '../src/components/shell/ComparisonSnapshot';
import { DivergenceCard } from '../src/components/shell/DivergenceCard';
import { CompareReport } from '../src/components/CompareReport';
import { GhostJourney } from '../src/components/Journey';
import { Insights } from '../src/components/Results';
import { longestQueues, momentsSoFar } from '../src/components/shell/navigation';

const project = initialDocument(), scenario = project.scenarios[0], plans = project.plans;
const runs = plans.map(plan => simulate({ schemaVersion: 1, plan, scenario, runMode: 'run_to_completion' }));
const [a, b] = runs.map(run => run.statistics!);
const cost = costOf(plans[0], plans[1], scenario, a, b, 'cutoff');
const html = (child: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(I18nProvider, { children: child }));

describe('comparison presentation', () => {
  it('partitions gains, regressions and resource costs without losing adverse outcomes', () => {
    const metrics = comparisonMetrics(a, b, cost, MESSAGES.en);
    const groups = conclusionGroups(metrics);
    const ids = groups.flatMap(group => group.metrics.map(metric => metric.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(groups.find(group => group.kind === 'regression')!.metrics.map(metric => metric.id)).toEqual(expect.arrayContaining(['completed', 'left']));
    const unchanged = comparisonMetrics(a, a, { ...cost, staff: [1, 1], devices: [], staffHours: [1, 1], deviceHours: [1, 1], overtime: [0, 0] }, MESSAGES.en);
    expect(conclusionGroups(unchanged).every(group => group.metrics.length === 0)).toBe(true);
  });
  it('shows completed, left and unfinished figures next to the waiting delta', () => {
    const result = html(createElement(ComparisonSnapshot, { a, b, cost }));
    for (const key of ['completed', 'left', 'unfinished', 'average'] as const) expect(result).toContain(MESSAGES.en.compare.rows[key]);
    expect(result.match(/class="snapshot-item(?: resource-summary)?"/g)).toHaveLength(5);
  });
  it.each(['stale', 'missing', 'missing-final'] as const)('hides all comparison numbers for %s results', state => {
    const result = html(createElement(CompareReport, { planA: plans[0], planB: plans[1], scenario, changes: [],
      runA: runs[0], runB: state === 'missing' ? undefined : state === 'missing-final' ? { ...runs[1], completion: null } : runs[1],
      ready: state !== 'stale', basis: state === 'missing-final' ? 'completion' : 'cutoff', visitorId: '', nameOf: id => id, onFocus: () => {}, onChoose: () => {}, onRerun: () => {} }));
    expect(result).toContain('report-stale'); expect(result).not.toContain('report-snapshot'); expect(result).not.toContain('conclusion-groups');
  });
  it('shows a real divergence and disables the jump for identical journeys', () => {
    const journeys = runs.map(run => journeyOf(run, 'side-stream:10', scenario.observationCutoff));
    const changed = html(createElement(DivergenceCard, { journeys, plans, onJump: () => {}, onEvidence: () => {} }));
    expect(changed).toContain('03:30'); expect(changed).toContain('divergence-states');
    const same = html(createElement(DivergenceCard, { journeys: [journeys[0], journeys[0]], plans: [plans[0], plans[0]], onJump: () => {}, onEvidence: () => {} }));
    expect(same).toContain(MESSAGES.en.reportUi.identical); expect(same).toContain('disabled=""');
  });
  it('offers a rule choice when no paired waiting differs under the rule', () => {
    const result = html(createElement(CompareReport, { planA: plans[0], planB: plans[0], scenario, changes: [],
      runA: runs[0], runB: runs[0], ready: true, visitorId: '', nameOf: id => id, onFocus: () => {}, onChoose: () => {}, onChooseRule: () => {} }));
    expect(result).toContain('data-state="no-difference"');
    expect(result).toContain(MESSAGES.en.runStateActions['choose-rule']);
    expect(result).toContain(MESSAGES.en.evidence.minute);
  });
  it('gives empty-roster and missing-evidence states their own actions', () => {
    const empty = { ...runs[0], population: [], events: [] };
    const journey = html(createElement(GhostJourney, { runs: [empty], compare: false, scenario, visitorId: '', time: 0, endTime: 0, picks: [], nameOf: id => id, onChoose: () => {}, onJump: () => {}, onLocate: () => {}, onEditGuests: () => {} }));
    expect(journey).toContain('data-state="empty-roster"'); expect(journey).toContain(MESSAGES.en.runStateActions['edit-guests']);
    const evidence = html(createElement(Insights, { run: empty, compare: false, comparisonReady: false, changes: [], scenarioId: scenario.id, overrides: 0, basis: 'cutoff', onSelectNode: () => {}, onChoose: () => {}, onJump: () => {}, onRerun: () => {} }));
    expect(evidence).toContain('data-state="no-evidence"'); expect(evidence).toContain(MESSAGES.en.runStateActions.rerun);
  });
  it('orders guest, outcomes, divergence, timelines, stations and raw events', () => {
    const result = html(createElement(GhostJourney, { runs, compare: true, scenario, visitorId: 'side-stream:10', time: 210, endTime: 1800, picks: [], nameOf: id => id, onChoose: () => {}, onJump: () => {}, onLocate: () => {} }));
    const order = ['class="ghost-card"', 'class="ghost-futures"', 'class="diff-note"', 'class="lanes"', 'class="station-table"', 'class="evidence"'].map(value => result.indexOf(value));
    expect(order.every(value => value >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(result).toContain('lane-text-alternative');
  });
  it('keeps the existing four queues and six past moments tied to the replay state', () => {
    for (const time of [0, 210, 900, 1800]) {
      const view = playbackAt(runs[0].events, plans[0], time);
      const queues = longestQueues(plans[0], view);
      expect(queues.length).toBeLessThanOrEqual(4);
      for (const row of queues) { expect(row.waiting).toBeGreaterThan(0); expect(row.waiting).toBe(waitingAt(view, row.node.id)); }
      expect(queues.map(row => row.waiting)).toEqual(queues.map(row => row.waiting).sort((a, b) => b - a));
      const moments = momentsSoFar(keyEvents(runs[0]), time);
      expect(moments.length).toBeLessThanOrEqual(6);
      expect(moments.every(moment => moment.time <= time)).toBe(true);
      expect(moments.map(moment => moment.time)).toEqual(moments.map(moment => moment.time).sort((a, b) => b - a));
    }
  });
});
