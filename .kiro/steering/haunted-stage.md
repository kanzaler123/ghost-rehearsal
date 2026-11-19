---
inclusion: always
---

# Haunted Stage UI guardrails

Applies to any change under `src/components/**` or `src/app/styles/**`. Background: `.kiro/specs/haunted-stage-ui/requirements.md` (R7–R9).

1. **Never touch simulation data.** Do not edit `src/simulation/**`, `src/schemas/**` or `examples/open-house.json`.
   Six frozen SHA-256 digests in `tests/ui-redesign-equivalence.test.ts` guard this. Do not update a digest to make it pass.
2. **Style through tokens only.** No literal colours, lengths, durations or inline shadows in non-token CSS.
   Keep exactly 3 `--surface-*` and 3 `--elev-*` tokens (midnight violet-black), text/tone ≥ 4.5:1 and focus/line ≥ 3:1 contrast on all three.
   Glows use `--glow-*`/`--fx-*`. `!important` only for `.react-flow__` and reduced motion.
   Under `prefers-reduced-motion`, animation and transition durations must be ≤ 0.001s. `tests/ui-styles.test.ts` guards this.
3. **Zero external runtime requests.** Icons, fonts and the atmosphere canvas are local: inline SVG, CSS or Canvas 2D. No CDN, remote font or fetch.

Also keep card sizes (232×220 run, 248×220 stage) and the existing roles, labels and selectors working in English and Chinese.

The `Guard Haunted Stage UI invariants` hook (`.kiro/hooks/guard-haunted-invariants.json`) runs both test files after saves in these folders.
A passing hook is not full acceptance. Follow `comparison-evidence.md` for `npm run check`, `npm run build` and `npm run test:browser`.
