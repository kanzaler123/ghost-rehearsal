import { useEffect, useRef } from 'react';
import { frameInterval, parseHex, particleBudget, seeded } from './spectral';

type RGB = [number, number, number];
interface Palette { velvet: RGB; mist: RGB; ember: RGB; emberHot: RGB; mint: RGB; violet: RGB; moon: RGB }
interface Ember { x: number; y: number; size: number; rise: number; sway: number; phase: number; flicker: number; hot: boolean }
interface Wisp { x: number; y: number; ax: number; ay: number; fx: number; fy: number; phase: number; size: number; violet: boolean }
interface Mist { x: number; y: number; w: number; h: number; drift: number; phase: number; alpha: number }
interface Scene { embers: Ember[]; wisps: Wisp[]; mist: Mist[] }

const TOKENS: Record<keyof Palette, [string, RGB]> = {
  velvet: ['--fx-velvet', [43, 23, 69]], mist: ['--fx-mist', [201, 188, 232]], ember: ['--fx-ember', [255, 179, 92]], emberHot: ['--fx-ember-hot', [255, 215, 138]],
  mint: ['--fx-wisp-mint', [145, 223, 195]], violet: ['--fx-wisp-violet', [179, 155, 255]], moon: ['--fx-moon', [243, 232, 200]],
};
/** The layer is soft light and mist, so half resolution is indistinguishable and quarters the raster cost. */
const RESOLUTION = 0.5;
const STILL_TIME = 11.7;

function readPalette(element: Element): Palette {
  const style = getComputedStyle(element);
  return Object.fromEntries(Object.entries(TOKENS).map(([key, [token, fallback]]) => [key, parseHex(style.getPropertyValue(token), fallback)])) as unknown as Palette;
}

/** A soft round light, drawn once and stamped many times. */
function glowSprite([r, g, b]: RGB, size = 64, core = 0.18): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const context = sprite.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gradient.addColorStop(core, `rgba(${r},${g},${b},0.75)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return sprite;
}

function moonSprite([r, g, b]: RGB): HTMLCanvasElement {
  const size = 160, sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const context = sprite.getContext('2d')!, c = size / 2;
  const halo = context.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, `rgba(${r},${g},${b},0.22)`); halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
  context.fillStyle = halo; context.fillRect(0, 0, size, size);
  context.fillStyle = `rgba(${r},${g},${b},0.62)`;
  context.beginPath(); context.arc(c, c, 24, 0, Math.PI * 2); context.fill();
  context.globalCompositeOperation = 'destination-out';
  context.beginPath(); context.arc(c + 11, c - 7, 21, 0, Math.PI * 2); context.fill();
  return sprite;
}

function createScene(width: number, height: number, quiet: boolean, seed: number): Scene {
  const random = seeded(seed), budget = particleBudget(width, height, quiet);
  return {
    embers: Array.from({ length: budget.embers }, () => ({ x: random(), y: random() * 1.1, size: 1 + random() * 2.2, rise: 0.025 + random() * 0.05,
      sway: 0.4 + random() * 0.9, phase: random() * Math.PI * 2, flicker: 2 + random() * 5, hot: random() < 0.22 })),
    wisps: Array.from({ length: budget.wisps }, (_, index) => ({ x: 0.1 + random() * 0.8, y: 0.15 + random() * 0.7, ax: 0.04 + random() * 0.1, ay: 0.03 + random() * 0.08,
      fx: 0.12 + random() * 0.22, fy: 0.1 + random() * 0.2, phase: random() * Math.PI * 2, size: 18 + random() * 26, violet: index % 2 === 1 })),
    mist: Array.from({ length: budget.mist }, (_, index) => ({ x: (index + 0.5) / budget.mist, y: 0.62 + random() * 0.38, w: 0.45 + random() * 0.35, h: 0.18 + random() * 0.16,
      drift: 0.05 + random() * 0.08, phase: random() * Math.PI * 2, alpha: 0.05 + random() * 0.05 })),
  };
}

/**
 * Decorative Canvas 2D atmosphere behind the stage: velvet light, ectoplasm mist, amber embers and mint/violet wisps.
 * It never reads simulation data. `tempo` only changes how fast the decoration drifts. With reduced motion it draws
 * one still frame and never schedules animation frames.
 */
export function SpectralStageBackdrop({ tempo = 0.35, reducedMotion = false, moon = false, quiet = false, paused = false, className }: {
  tempo?: number; reducedMotion?: boolean; moon?: boolean; quiet?: boolean; className?: string;
  /** Stop animating (keeping the last frame) while something covers the stage, such as a dialog. */
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  useEffect(() => {
    const canvas = canvasRef.current, context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const palette = readPalette(canvas);
    const sprites = { ember: glowSprite(palette.ember), hot: glowSprite(palette.emberHot), mint: glowSprite(palette.mint, 96, 0.08), violet: glowSprite(palette.violet, 96, 0.08),
      mist: glowSprite(palette.mist, 128, 0.02), moon: moon ? moonSprite(palette.moon) : undefined };
    let width = 0, height = 0, dpr = 1, frame = 0, last = 0, clock = STILL_TIME, pace = tempoRef.current;
    let scene: Scene = { embers: [], wisps: [], mist: [] };
    const [vr, vg, vb] = palette.velvet, [er, eg, eb] = palette.ember;

    function draw(time: number) {
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      context!.globalCompositeOperation = 'source-over';
      context!.globalAlpha = 1;
      context!.clearRect(0, 0, width, height);
      const velvet = context!.createRadialGradient(width * 0.5, -height * 0.15, 0, width * 0.5, -height * 0.15, Math.max(width, height) * 0.95);
      velvet.addColorStop(0, `rgba(${vr},${vg},${vb},${quiet ? 0.42 : 0.6})`); velvet.addColorStop(1, `rgba(${vr},${vg},${vb},0)`);
      context!.fillStyle = velvet; context!.fillRect(0, 0, width, height);
      const warmth = context!.createRadialGradient(width * 0.5, height * 1.2, 0, width * 0.5, height * 1.2, Math.max(width, height) * 0.7);
      warmth.addColorStop(0, `rgba(${er},${eg},${eb},${quiet ? 0.06 : 0.1})`); warmth.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
      context!.fillStyle = warmth; context!.fillRect(0, 0, width, height);
      if (sprites.moon) context!.drawImage(sprites.moon, width - 150, -38, 160, 160);
      for (const blob of scene.mist) {
        const x = (blob.x + Math.sin(time * blob.drift + blob.phase) * 0.09) * width, y = blob.y * height + Math.sin(time * 0.31 + blob.phase) * 10;
        context!.globalAlpha = blob.alpha * (quiet ? 0.7 : 1);
        context!.drawImage(sprites.mist, x - blob.w * width / 2, y - blob.h * height / 2, blob.w * width, blob.h * height);
      }
      context!.globalCompositeOperation = 'lighter';
      for (const wisp of scene.wisps) {
        const x = (wisp.x + Math.sin(time * wisp.fx + wisp.phase) * wisp.ax) * width, y = (wisp.y + Math.cos(time * wisp.fy + wisp.phase * 1.3) * wisp.ay) * height;
        const breathe = 0.55 + 0.45 * Math.sin(time * 0.9 + wisp.phase);
        context!.globalAlpha = (quiet ? 0.1 : 0.16) * breathe;
        context!.drawImage(wisp.violet ? sprites.violet : sprites.mint, x - wisp.size, y - wisp.size, wisp.size * 2, wisp.size * 2);
      }
      for (const ember of scene.embers) {
        const x = (ember.x + Math.sin(time * ember.sway + ember.phase) * 0.012) * width, y = ember.y * height;
        const fade = Math.min(1, Math.max(0, ember.y * 1.6)) * Math.min(1, Math.max(0, (1.1 - ember.y) * 4));
        context!.globalAlpha = (0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * ember.flicker + ember.phase))) * fade * (quiet ? 0.6 : 1);
        const size = ember.size * 4;
        context!.drawImage(ember.hot ? sprites.hot : sprites.ember, x - size / 2, y - size / 2, size, size);
      }
      context!.globalAlpha = 1;
      context!.globalCompositeOperation = 'source-over';
    }
    function step(delta: number) {
      for (const ember of scene.embers) {
        ember.y -= ember.rise * delta;
        if (ember.y < -0.05) { ember.y = 1.08; ember.x = (ember.x + 0.37) % 1; }
      }
    }
    const running = () => !reducedMotion && !paused && width > 0 && height > 0 && !document.hidden;
    // Adaptive pacing: every frame while drawing is cheap (GPU canvas); fewer frames when it is not
    // (software rendering, slow devices), so the decoration never competes with the replay itself.
    let cost = 0;
    function tick(now: number) {
      const interval = frameInterval(cost);
      if (now - last >= interval) {
        const delta = Math.min(0.1, (now - last) / 1000); last = now;
        pace += (tempoRef.current - pace) * Math.min(1, delta * 2.5);
        clock += delta * pace;
        const started = performance.now();
        step(delta * pace); draw(clock);
        cost = cost * 0.9 + (performance.now() - started) * 0.1;
      }
      frame = running() ? requestAnimationFrame(tick) : 0;
    }
    function schedule() {
      if (frame || !running()) return;
      last = performance.now(); frame = requestAnimationFrame(tick);
    }
    function resize() {
      const box = canvas!.getBoundingClientRect();
      const nextWidth = Math.round(box.width), nextHeight = Math.round(box.height);
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight; dpr = RESOLUTION;
      canvas!.width = Math.max(1, Math.round(width * dpr)); canvas!.height = Math.max(1, Math.round(height * dpr));
      scene = createScene(width, height, quiet, 20261031);
      if (width && height) draw(clock);
      schedule();
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : undefined;
    observer?.observe(canvas);
    const visibility = () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else schedule(); };
    document.addEventListener('visibilitychange', visibility);
    resize();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); if (frame) cancelAnimationFrame(frame); };
  }, [reducedMotion, moon, quiet, paused]);
  return <canvas ref={canvasRef} className={className ? `spectral-backdrop ${className}` : 'spectral-backdrop'} aria-hidden="true" />;
}
