/**
 * Spectral fate card: one guest, two futures, as a standalone SVG poster.
 * Pure and self-contained. Colours are literals here because the file leaves the app and cannot use CSS tokens.
 */
import type { Difference, Journey, ResultBasis } from './analysis';
import { formatTime } from './project';
import type { Messages } from '../i18n';
import type { VisitorMetrics } from '../simulation/types';

export interface FateCardSide {
  planName: string;
  journey: Journey;
  /** Outcome and waiting from the selected statistics basis; absent when the guest has no record. */
  outcome?: Pick<VisitorMetrics, 'outcome' | 'waiting'>;
  /** Actual statistics end of this side. */
  until: number;
}
export interface FateCardInput {
  t: Messages;
  visitorId: string;
  visitorName: string;
  eventName: string;
  basis: ResultBasis;
  /** Shared span of both bands: the cutoff, or the later final end. */
  cutoff: number;
  sides: [FateCardSide, FateCardSide];
  difference: Difference | null;
}

export const FATE_CARD_SIZE = { width: 1200, height: 630 } as const;
const COLORS = { ground: '#0e0b14', raised: '#1f1a2b', gold: '#e6c36a', text: '#f1ecfa', muted: '#b9afcf', mint: '#6ee7b7', purple: '#a78bfa', alert: '#ff8fa3', track: '#2a2338' } as const;
const FONT = { serif: "Fraunces, Georgia, 'Times New Roman', serif", sans: "Inter, 'Segoe UI', system-ui, sans-serif", mono: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace" } as const;
const LEFT = 200, RIGHT = 1120;
const OPACITY = { queue: 0.55, hold: 0.4, blocked: 0.85, service: 1, move: 0.2 } as const;

/** Escapes text and attribute values, and drops characters XML 1.0 forbids. */
export function escapeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
/** SVG has no text wrapping, so long names are shortened by estimated width (CJK counts double). */
function clip(value: string, units: number): string {
  let used = 0;
  const chars = [...value];
  for (let index = 0; index < chars.length; index++) {
    used += /[\u2e80-\u9fff\uff00-\uffef]/.test(chars[index]) ? 2 : 1;
    if (used > units) return `${chars.slice(0, Math.max(0, index - 1)).join('')}…`;
  }
  return value;
}
const num = (value: number) => (Math.round(value * 10) / 10).toString();
const text = (x: number, y: number, size: number, content: string, fill: string, extra = '') =>
  `<text x="${num(x)}" y="${num(y)}" font-size="${size}" fill="${fill}"${extra}>${escapeXml(content)}</text>`;

export function fateCardFilename(visitorId: string): string {
  return `ghost-fate-card-${visitorId.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'guest'}.svg`;
}
const signed = (delta: number, t: Messages) => {
  const rounded = Math.round(delta * 1000) / 1000;
  return rounded === 0 ? '0' : `${rounded > 0 ? '+' : '−'}${t.formatWait(Math.abs(rounded))}`;
};

export function buildFateCardSvg(input: FateCardInput): string {
  const { t, sides, difference } = input;
  const card = t.encore.fateCard;
  const span = Math.max(1, input.cutoff);
  const x = (time: number) => LEFT + Math.max(0, Math.min(1, time / span)) * (RIGHT - LEFT);
  const basisLine = input.basis === 'completion' ? card.basisFinal : card.basisCutoff(formatTime(input.cutoff));
  const parts: string[] = [];

  // Header
  parts.push(`<g transform="translate(80 44) scale(2.6)" fill="${COLORS.gold}"><path d="M0 22V10a10 10 0 0 1 20 0v12l-3.4-3-3.3 3-3.3-3-3.3 3-3.4-3z"/><circle cx="7" cy="10" r="1.8" fill="${COLORS.ground}"/><circle cx="13" cy="10" r="1.8" fill="${COLORS.ground}"/></g>`);
  parts.push(text(150, 62, 15, card.badge.toUpperCase(), COLORS.gold, ` font-family="${FONT.sans}" letter-spacing="2.5"`));
  parts.push(text(150, 108, 40, clip(input.visitorName, 26), COLORS.text, ` font-family="${FONT.serif}" font-weight="600"`));
  parts.push(text(150, 138, 18, clip(input.visitorId, 38), COLORS.muted, ` font-family="${FONT.mono}"`));
  const right = (y: number, content: string, size: number, fill: string) => text(RIGHT, y, size, clip(content, 60), fill, ` font-family="${FONT.sans}" text-anchor="end"`);
  parts.push(right(62, card.event(input.eventName), 17, COLORS.text));
  parts.push(right(92, basisLine, 16, COLORS.muted));
  parts.push(right(120, card.ends(formatTime(sides[0].until), formatTime(sides[1].until)), 16, COLORS.muted));
  parts.push(`<line x1="80" y1="164" x2="${RIGHT}" y2="164" stroke="${COLORS.gold}" stroke-opacity="0.45"/>`);

  // Aligned bands
  const bands = [{ y: 228, color: COLORS.mint, label: card.planA }, { y: 314, color: COLORS.purple, label: card.planB }];
  sides.forEach((side, index) => {
    const { y, color, label } = bands[index];
    parts.push(text(80, y + 20, 15, label, color, ` font-family="${FONT.sans}" font-weight="600"`));
    parts.push(text(80, y + 40, 13, card.ends1(formatTime(side.until)), COLORS.muted, ` font-family="${FONT.mono}"`));
    parts.push(`<rect x="${LEFT}" y="${y}" width="${RIGHT - LEFT}" height="44" rx="8" fill="${COLORS.track}"/>`);
    for (const segment of side.journey.segments) {
      const left = x(segment.start), width = Math.max(2, x(segment.end) - left);
      const stroke = segment.kind === 'blocked' ? ` stroke="${COLORS.alert}" stroke-width="1.5"` : '';
      parts.push(`<rect x="${num(left)}" y="${y + 4}" width="${num(Math.min(width, RIGHT - left))}" height="36" rx="4" fill="${color}" fill-opacity="${OPACITY[segment.kind]}"${stroke}/>`);
    }
    parts.push(`<line x1="${num(x(side.until))}" y1="${y - 4}" x2="${num(x(side.until))}" y2="${y + 48}" stroke="${COLORS.muted}" stroke-dasharray="3 3"/>`);
    if (side.journey.end) {
      const cx = x(side.journey.end.time);
      parts.push(side.journey.end.kind === 'complete'
        ? `<circle cx="${num(cx)}" cy="${y + 22}" r="7" fill="${COLORS.text}" stroke="${color}" stroke-width="3"/>`
        : `<circle cx="${num(cx)}" cy="${y + 22}" r="7" fill="none" stroke="${COLORS.alert}" stroke-width="3"/>`);
    }
  });
  parts.push(text(LEFT, 392, 13, formatTime(0), COLORS.muted, ` font-family="${FONT.mono}"`));
  parts.push(text(RIGHT, 392, 13, formatTime(span), COLORS.muted, ` font-family="${FONT.mono}" text-anchor="end"`));
  // Legend: the shape of each state, in neutral light.
  (['queue', 'hold', 'blocked', 'service'] as const).forEach((kind, index) => {
    const lx = LEFT + 150 + index * 150;
    parts.push(`<rect x="${lx}" y="380" width="14" height="14" rx="3" fill="${COLORS.text}" fill-opacity="${OPACITY[kind]}"${kind === 'blocked' ? ` stroke="${COLORS.alert}"` : ''}/>`);
    parts.push(text(lx + 20, 392, 13, t.journey.segments[kind], COLORS.muted, ` font-family="${FONT.sans}"`));
  });
  if (difference && Number.isFinite(difference.time)) {
    const rx = x(difference.time);
    parts.push(`<line x1="${num(rx - 2)}" y1="206" x2="${num(rx - 2)}" y2="366" stroke="${COLORS.mint}" stroke-width="3"/>`);
    parts.push(`<line x1="${num(rx + 2)}" y1="206" x2="${num(rx + 2)}" y2="366" stroke="${COLORS.purple}" stroke-width="3"/>`);
    const anchor = rx < 330 ? 'start' : rx > 990 ? 'end' : 'middle';
    parts.push(text(anchor === 'start' ? rx - 6 : anchor === 'end' ? rx + 6 : rx, 196, 16, card.riftAt(formatTime(difference.time)), COLORS.gold, ` font-family="${FONT.sans}" font-weight="600" text-anchor="${anchor}"`));
  } else {
    parts.push(text(LEFT, 196, 16, card.noDifference, COLORS.muted, ` font-family="${FONT.sans}"`));
  }

  // Outcomes
  sides.forEach((side, index) => {
    const { color, label } = bands[index];
    const left = index ? 610 : 80;
    parts.push(`<rect x="${left}" y="414" width="510" height="102" rx="12" fill="${COLORS.raised}" stroke="${color}" stroke-opacity="0.7"/>`);
    const titleClip = `fate-plan-title-${index}`;
    parts.push(`<clipPath id="${titleClip}"><rect x="${left + 20}" y="422" width="470" height="26"/></clipPath>`);
    parts.push(text(left + 20, 442, 15, `${label} · ${clip(side.planName, 36)}`, color, ` font-family="${FONT.sans}" font-weight="600" clip-path="url(#${titleClip})"`));
    const outcome = side.outcome;
    parts.push(text(left + 20, 475, 19, `${card.outcome}: ${outcome ? t.outcomes[outcome.outcome] ?? outcome.outcome : card.noData}`, COLORS.text, ` font-family="${FONT.sans}"`));
    parts.push(text(left + 20, 503, 19, `${card.totalWait}: ${outcome ? t.formatWait(outcome.waiting) : card.noData}`, COLORS.text, ` font-family="${FONT.sans}"`));
  });
  const [a, b] = sides.map(side => side.outcome);
  parts.push(text(600, 552, 22, `${card.delta}: ${a && b ? signed(b.waiting - a.waiting, t) : card.noData}`, COLORS.gold, ` font-family="${FONT.sans}" font-weight="700" text-anchor="middle"`));
  parts.push(text(600, 584, 13, card.footnote1, COLORS.muted, ` font-family="${FONT.sans}" text-anchor="middle"`));
  parts.push(text(600, 606, 13, card.footnote2, COLORS.muted, ` font-family="${FONT.sans}" text-anchor="middle"`));

  const { width, height } = FATE_CARD_SIZE;
  const shortName = clip(input.visitorName, 40);
  const title = `${card.badge} · ${shortName} (${clip(input.visitorId, 40)})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="fate-title fate-desc" lang="${escapeXml(t.lang)}">`
    + `<title id="fate-title">${escapeXml(title)}</title><desc id="fate-desc">${escapeXml(card.description(shortName))}</desc>`
    + `<defs><linearGradient id="fate-ground" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.ground}"/><stop offset="1" stop-color="${COLORS.raised}"/></linearGradient></defs>`
    + `<rect width="${width}" height="${height}" fill="url(#fate-ground)"/>`
    + `<rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="18" fill="none" stroke="${COLORS.gold}" stroke-opacity="0.55" stroke-width="2"/>`
    + parts.join('') + '</svg>';
}
