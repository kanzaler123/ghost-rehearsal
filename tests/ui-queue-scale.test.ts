import { describe, expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { QUEUE_SCALE_FLOOR, queueFill, queueScale } from '../src/components/queueScale';
import { frameInterval, particleBudget, parseHex, seeded, tempoOf } from '../src/components/spectral';
import { LABEL_OFFSET, labelAnchor } from '../src/components/routeLabel';
import { getBezierPath, Position } from '@xyflow/react';

describe('branch rune labels', () => {
  it('sit just after the source handle on long forward routes and keep the midpoint otherwise', () => {
    const [path, midX, midY] = getBezierPath({ sourceX: 100, sourceY: 50, targetX: 700, targetY: 260, sourcePosition: Position.Right, targetPosition: Position.Left, curvature: 0.4 });
    const [x, y] = labelAnchor(path, [midX, midY]);
    expect(x).toBeGreaterThanOrEqual(100 + LABEL_OFFSET); expect(x).toBeLessThan(100 + LABEL_OFFSET * 2);
    expect(y).toBeGreaterThanOrEqual(50); expect(y).toBeLessThan(midY);
    const [short, sx, sy] = getBezierPath({ sourceX: 100, sourceY: 50, targetX: 150, targetY: 50, sourcePosition: Position.Right, targetPosition: Position.Left });
    expect(labelAnchor(short, [sx, sy])).toEqual([sx, sy]);
    expect(labelAnchor('', [1, 2])).toEqual([1, 2]);
  });
});

const document = projectDocumentSchema.parse(example);
const runs = document.plans.slice(0, 2).map(plan => simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode: 'run_to_completion' }));

describe('shared queue gauge scale', () => {
  it('uses the largest recorded node queue of the shown runs, never below the crowd floor', () => {
    const peak = Math.max(...runs.flatMap(run => [run.statistics, run.completion].flatMap(stats => stats?.nodes.map(node => node.maxQueue) ?? [])));
    expect(queueScale(runs)).toBe(Math.max(QUEUE_SCALE_FLOOR, peak));
    expect(queueScale([runs[1], runs[0]])).toBe(queueScale(runs));
    expect(queueScale(runs)).toBeGreaterThanOrEqual(queueScale([runs[0]]));
    expect(queueScale([])).toBe(QUEUE_SCALE_FLOOR);
    expect(queueScale([undefined])).toBe(QUEUE_SCALE_FLOOR);
  });
  it('fills proportionally and clamps aggregated stage queues to the track', () => {
    expect(queueFill(0, 20)).toBe(0);
    expect(queueFill(5, 20)).toBe(25);
    expect(queueFill(45, 20)).toBe(100);
    expect(queueFill(3, 0)).toBe(100);
  });
});

describe('stage atmosphere helpers', () => {
  it('breathes while paused and drifts faster, but sub-linearly, at higher replay speeds', () => {
    const speeds = [0.5, 1, 2, 4, 8].map(speed => tempoOf(true, speed));
    for (let index = 1; index < speeds.length; index++) expect(speeds[index]).toBeGreaterThan(speeds[index - 1]);
    expect(speeds[4] / speeds[0]).toBeLessThan(16);
    expect(tempoOf(false, 8)).toBe(tempoOf(false, 0.5));
    expect(tempoOf(false, 1)).toBeLessThan(speeds[0]);
    expect(tempoOf(true, Number.NaN)).toBe(tempoOf(true, 1));
  });
  it('keeps particle counts bounded, empty for zero-size layers and smaller when quiet', () => {
    expect(particleBudget(0, 600).embers).toBe(0);
    const large = particleBudget(4000, 3000);
    expect(large.embers).toBeLessThanOrEqual(72); expect(large.wisps).toBeLessThanOrEqual(14);
    expect(particleBudget(1200, 700, true).embers).toBeLessThan(particleBudget(1200, 700).embers);
  });
  it('slows the decoration down when its draw cost grows', () => {
    expect(frameInterval(1)).toBeCloseTo(1000 / 30);
    expect(frameInterval(Number.NaN)).toBeCloseTo(1000 / 30);
    expect(frameInterval(20)).toBeCloseTo(1000 / 15);
  });
  it('produces a stable still frame sequence and parses token colours', () => {
    const a = seeded(7), b = seeded(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(parseHex(' #ffb35c', [0, 0, 0])).toEqual([255, 179, 92]);
    expect(parseHex('#abc', [0, 0, 0])).toEqual([170, 187, 204]);
    expect(parseHex('#11223344', [0, 0, 0])).toEqual([17, 34, 51]);
    expect(parseHex('', [1, 2, 3])).toEqual([1, 2, 3]);
  });
});
