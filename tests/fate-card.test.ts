import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { formatTime } from '../src/features/project';
import { buildFateCardSvg, escapeXml, fateCardFilename } from '../src/features/fateCard';
import type { FateCardInput, FateCardSide } from '../src/features/fateCard';
import { firstDifference, journeyOf, statisticsAt } from '../src/features/analysis';
import { MESSAGES } from '../src/i18n/messages';
import { projectDocumentSchema } from '../src/schemas';
import { simulate } from '../src/simulation/engine';

const document = projectDocumentSchema.parse(example);
const scenario = document.scenarios[0];
const [planA, planB] = document.plans;
const [runA, runB] = [planA, planB].map(plan => simulate({ schemaVersion: 1, scenario, plan, runMode: 'cutoff' }));
const id = 'side-stream:10';

function input(lang: 'en' | 'zh', patch: Partial<FateCardInput> = {}, same = false): FateCardInput {
  const cutoff = scenario.observationCutoff;
  const sides = [runA, same ? runA : runB].map((run, column) => {
    const stats = statisticsAt(run, 'cutoff')!;
    return { planName: [planA, same ? planA : planB][column].name, journey: journeyOf(run, id, stats.until), until: stats.until, outcome: stats.visitors.find(item => item.id === id) };
  }) as [FateCardSide, FateCardSide];
  return { t: MESSAGES[lang], visitorId: id, visitorName: 'Side entrance #10', eventName: scenario.name ?? scenario.id, basis: 'cutoff', cutoff, sides,
    difference: firstDifference(sides[0].journey, sides[1].journey, planA, same ? planA : planB), ...patch };
}
/** Minimal well-formedness check: balanced tags, quoted attributes, and no raw `&` or `<` in text. */
function assertWellFormed(svg: string) {
  expect(svg).not.toMatch(/&(?!(?:amp|lt|gt|quot|apos);)/);
  const stack: string[] = [];
  for (const match of svg.matchAll(/<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g)) {
    if (match[4]) continue;
    if (match[1]) expect(stack.pop()).toBe(match[2]); else stack.push(match[2]);
  }
  expect(stack).toEqual([]);
  expect(svg.replace(/<[^>]*>/g, '')).not.toMatch(/</);
}

describe('buildFateCardSvg', () => {
  it.each(['en', 'zh'] as const)('builds a self-contained, well-formed card in %s', lang => {
    const data = input(lang);
    const svg = buildFateCardSvg(data);
    const card = data.t.encore.fateCard;
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    assertWellFormed(svg);
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)|<image|<script|href=|@import|url\((?!#)/);
    for (const expected of [card.badge.toUpperCase(), 'Side entrance #10', id, card.planA, card.planB, card.outcome, card.totalWait, card.footnote1, card.footnote2, '#6ee7b7', '#a78bfa']) expect(svg).toContain(escapeXml(expected));
    expect(svg).toContain(escapeXml(card.basisCutoff(formatTime(data.cutoff))));
    const [a, b] = data.sides;
    expect(svg).toContain(escapeXml(card.ends(formatTime(a.until), formatTime(b.until))));
  });
  it('draws a two-colour rift and the first difference time when the futures differ', () => {
    const data = input('en');
    expect(data.difference).not.toBeNull();
    const svg = buildFateCardSvg(data);
    expect(svg).toContain(data.t.encore.fateCard.riftAt('03:30'));
    expect(svg).not.toContain(data.t.encore.fateCard.noDifference);
    expect(svg.match(/stroke="#6ee7b7" stroke-width="3"\/>/g)?.length).toBeGreaterThanOrEqual(1);
    expect(svg.match(/stroke="#a78bfa" stroke-width="3"\/>/g)?.length).toBeGreaterThanOrEqual(1);
  });
  it('states that there is no difference when the journeys match', () => {
    const data = input('zh', {}, true);
    expect(data.difference).toBeNull();
    const svg = buildFateCardSvg(data);
    expect(svg).toContain(data.t.encore.fateCard.noDifference);
    expect(svg).not.toContain('首次差异');
    expect(svg).toContain(`${data.t.encore.fateCard.delta}: 0`);
  });
  it('prints the signed comparison minus baseline difference', () => {
    const data = input('en');
    const [a, b] = data.sides.map(side => side.outcome!.waiting);
    const svg = buildFateCardSvg(data);
    const delta = b - a;
    expect(delta).not.toBe(0);
    expect(svg).toContain(`${data.t.encore.fateCard.delta}: ${delta > 0 ? '+' : '−'}${data.t.formatWait(Math.abs(delta))}`);
    const flipped = buildFateCardSvg({ ...data, sides: [data.sides[1], data.sides[0]] });
    expect(flipped).toContain(`: ${delta > 0 ? '−' : '+'}${data.t.formatWait(Math.abs(delta))}`);
  });
  it('labels the final basis and shows no data instead of inventing outcomes', () => {
    const data = input('en');
    const svg = buildFateCardSvg({ ...data, basis: 'completion', sides: [{ ...data.sides[0], outcome: undefined }, data.sides[1]] });
    expect(svg).toContain(data.t.encore.fateCard.basisFinal);
    expect(svg).toContain(`${data.t.encore.fateCard.outcome}: ${data.t.encore.fateCard.noData}`);
    expect(svg).toContain(`${data.t.encore.fateCard.delta}: ${data.t.encore.fateCard.noData}`);
  });
  it('escapes hostile names and strips characters XML forbids', () => {
    const hostile = `<script>alert("x")</script> & 'q' \u0001\u0008`;
    const svg = buildFateCardSvg(input('en', { visitorName: hostile, eventName: hostile, visitorId: 'a&b<c>' }));
    assertWellFormed(svg);
    expect(svg).not.toContain('<script');
    expect(svg).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('a&amp;b&lt;c&gt;');
  });
  it('keeps long names and visitor IDs within the card', () => {
    const data = input('zh', { visitorName: '长'.repeat(80), visitorId: 'stream-'.repeat(20) });
    data.sides[0].planName = data.sides[1].planName = 'W'.repeat(36);
    const svg = buildFateCardSvg(data);
    expect(svg).toContain('…');
    expect(svg).not.toContain('长'.repeat(30));
    expect(svg).not.toContain('stream-'.repeat(10));
    expect(svg).toContain('<clipPath id="fate-plan-title-0"><rect x="100" y="422" width="470" height="26"/>');
    expect(svg).toContain('<clipPath id="fate-plan-title-1"><rect x="630" y="422" width="470" height="26"/>');
    for (const index of [0, 1]) expect(svg).toContain(`clip-path="url(#fate-plan-title-${index})"`);
  });
  it('treats sub-millisecond floating-point noise in waiting delta as zero', () => {
    const data = input('en');
    const a = { ...data.sides[0], outcome: { outcome: 'completed' as const, waiting: 100 } };
    const b = { ...data.sides[1], outcome: { outcome: 'completed' as const, waiting: 100 + 1e-12 } };
    const svg = buildFateCardSvg({ ...data, sides: [a, b] });
    expect(svg).toContain(`${data.t.encore.fateCard.delta}: 0`);
    expect(svg).not.toContain('+0.0 s');
  });
  it('is deterministic', () => { expect(buildFateCardSvg(input('en'))).toBe(buildFateCardSvg(input('en'))); });
});

describe('fateCardFilename', () => {
  it('makes a safe .svg name', () => {
    expect(fateCardFilename(id)).toBe('ghost-fate-card-side-stream-10.svg');
    expect(fateCardFilename('../a b\\c')).toBe('ghost-fate-card-a-b-c.svg');
    expect(fateCardFilename('???')).toBe('ghost-fate-card-guest.svg');
  });
});
