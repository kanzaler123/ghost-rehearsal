import { describe, expect, it } from 'vitest';
import { comparisonReport, initialDocument } from '../src/features/project';
import { MESSAGES } from '../src/i18n/messages';
import { simulate } from '../src/simulation/engine';

const project = initialDocument();
const scenario = { ...project.scenarios[0], name: 'Recorded event', seed: 173, observationCutoff: 900, horizon: 3600 };
const [a, b] = project.plans;
const cutoff = simulate({ schemaVersion: 1, scenario, plan: a, runMode: 'cutoff' });
const cutoffB = simulate({ schemaVersion: 1, scenario, plan: b, runMode: 'cutoff' });
const fullA = simulate({ schemaVersion: 1, scenario, plan: a, runMode: 'run_to_completion' });
const fullB = simulate({ schemaVersion: 1, scenario, plan: b, runMode: 'run_to_completion' });

describe('comparison report run context', () => {
  for (const lang of ['en', 'zh'] as const) {
    const t = MESSAGES[lang];
    it(`records the actual cutoff execution inputs in ${lang}`, () => {
      const text = comparisonReport(cutoff, cutoffB, true, t, 'cutoff', 60);
      expect(text).toContain(t.report.scenario('Recorded event', scenario.id));
      expect(text).toContain(t.report.seed(173));
      expect(text).toContain(t.report.window(900, 3600));
      expect(text).toContain(`${t.review.basis}: ${t.review.cutoff}`);
      expect(text).toContain(`A · ${t.run.scope}: ${t.run.cutoff}`);
      expect(text).toContain(`B · ${t.run.scope}: ${t.run.cutoff}`);
      expect(text).toContain(`Input SHA-256: ${cutoff.inputKey}`);
      expect(text).toContain(`Input SHA-256: ${cutoffB.inputKey}`);
    });
    it(`keeps recorded scope when switching a full run's report basis in ${lang}`, () => {
      for (const basis of ['cutoff', 'completion'] as const) {
        const text = comparisonReport(fullA, fullB, true, t, basis, 0);
        expect(text).toContain(`${t.review.basis}: ${t.review[basis]}`);
        expect(text).toContain(`A · ${t.run.scope}: ${t.run.completion}`);
        expect(text).toContain(`B · ${t.run.scope}: ${t.run.completion}`);
        expect(text).toContain(t.report.seed(173));
        expect(text).toContain(t.report.window(900, 3600));
      }
    });
    it(`does not export context as usable evidence for stale or missing final results in ${lang}`, () => {
      expect(comparisonReport(fullA, fullB, false, t, 'cutoff', 60)).toBe(t.report.noRun);
      expect(comparisonReport(cutoff, cutoffB, true, t, 'completion', 60)).toBe(t.report.noRun);
      expect(comparisonReport(cutoff, fullB, true, t, 'cutoff', 60)).toBe(t.report.noRun);
    });
  }
});
