import { deviceUnitIds, fingerprintRunRequest, scenarioFingerprint } from '../schemas';
import type { Participant, Plan, RunRequest, Scenario, ServiceNode } from '../schemas';
import type { Unit } from './types';

export const MODEL_VERSION = '0.1.0-alpha';
export const milliseconds = (seconds: number) => Math.floor(seconds * 1000 + 0.5);
export const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function keyedDraw(seed: number, purpose: string, subject: string, key: string, visit: number): number {
  const text = JSON.stringify([seed, purpose, subject, key, visit]);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  return ((hash ^ (hash >>> 15)) >>> 0) / 4294967296;
}

export function sample(duration: ServiceNode['duration'], u: number): number {
  if (duration.kind === 'fixed') return duration.value;
  if (duration.kind === 'uniform') return duration.min + u * (duration.max - duration.min);
  if (duration.kind === 'empirical') return [...duration.samples].sort((a, b) => a - b)[Math.floor(u * duration.samples.length)];
  if (duration.min === duration.max) return duration.min;
  const c = (duration.mode - duration.min) / (duration.max - duration.min);
  return u < c ? duration.min + Math.sqrt(u * (duration.max - duration.min) * (duration.mode - duration.min))
    : duration.max - Math.sqrt((1 - u) * (duration.max - duration.min) * (duration.max - duration.mode));
}

export function populationSize(scenario: Scenario): number {
  return scenario.arrivalStreams.reduce((sum, stream) => sum + (stream.kind === 'records' ? stream.records.length
    : stream.kind === 'bucketed' ? stream.buckets.reduce((count, bucket) => count + bucket.count, 0) : stream.count), 0);
}

export function generatePopulation(scenario: Scenario): Participant[] {
  const people: Participant[] = [];
  for (const stream of scenario.arrivalStreams) {
    if (stream.kind === 'records') {
      stream.records.forEach(record => people.push({ id: `${stream.id}:${record.id}`, arrivalStreamId: stream.id, arrivalTime: milliseconds(record.arrivalTime) / 1000, attributes: { ...record.attributes } }));
      continue;
    }
    const times: number[] = [];
    if (stream.kind === 'bucketed') {
      [...stream.buckets].sort((a, b) => a.start - b.start).forEach(bucket => {
        for (let j = 0; j < bucket.count; j++) times.push(bucket.start + j * (bucket.end - bucket.start) / bucket.count);
      });
    } else {
      for (let j = 0; j < stream.count; j++) {
        const u = keyedDraw(scenario.seed, 'arrival', stream.id, stream.id, j + 1);
        let fraction = stream.kind === 'total_in_window' && stream.spacing === 'even' ? j / stream.count : u;
        if (stream.kind === 'preset_profile' && stream.profile.kind !== 'uniform') {
          const mode = stream.profile.kind === 'early_peak' ? 0 : stream.profile.kind === 'late_peak' ? 1 : (stream.profile.peakAt - stream.start) / (stream.end - stream.start);
          fraction = u < mode ? Math.sqrt(u * mode) : 1 - Math.sqrt((1 - u) * (1 - mode));
        }
        times.push(stream.start + fraction * (stream.end - stream.start));
      }
    }
    times.forEach((arrivalTime, index) => {
      const id = `${stream.id}:${index + 1}`;
      const attributes: Record<string, string> = {};
      for (const attribute of scenario.attributes) {
        const distribution = stream.attributeDistributions[attribute.id].values;
        const u = keyedDraw(scenario.seed, 'attribute', id, attribute.id, 1);
        let cumulative = 0;
        attributes[attribute.id] = distribution.find(item => (cumulative += item.probability) > u)?.value ?? distribution.filter(item => item.probability > 0).at(-1)!.value;
      }
      people.push({ id, arrivalStreamId: stream.id, arrivalTime: milliseconds(arrivalTime) / 1000, attributes });
    });
  }
  return people.sort((a, b) => a.arrivalTime - b.arrivalTime || compareIds(a.id, b.id));
}

export function resourceUnits(plan: Plan, scenario: Scenario): Unit[] {
  const units: Unit[] = [
    ...plan.staff.map(staff => ({ id: staff.id, skillIds: staff.skillIds, shifts: staff.shifts, unavailability: [...staff.unavailability] })),
    ...plan.deviceTypes.flatMap(device => deviceUnitIds(device).map(id => ({ id, skillIds: [], deviceTypeId: device.id, shifts: device.shifts, unavailability: device.unavailability.filter(window => window.resourceUnitId === id).map(({ start, end }) => ({ start, end })) }))),
  ];
  for (const unit of units) {
    unit.assignment = plan.assignments.find(assignment => assignment.resourceUnitId === unit.id);
    for (const override of scenario.assumptionOverrides) {
      if (override.kind !== 'resource_interruption') continue;
      const resource = override.resource;
      if ((resource.kind === 'staff' && resource.id === unit.id) || (resource.kind === 'device_type' && resource.id === unit.deviceTypeId && Number(unit.id.split(':')[1]) <= resource.quantity)) unit.unavailability.push(override.window);
    }
  }
  return units.sort((a, b) => compareIds(a.id, b.id));
}

function canonical(value: unknown, field = ''): unknown {
  if (Array.isArray(value)) {
    const items = value.map(item => canonical(item));
    if (['nodes', 'edges', 'staff', 'deviceTypes', 'skills', 'attributes', 'arrivalStreams'].includes(field)) items.sort((a, b) => compareIds((a as { id: string }).id, (b as { id: string }).id));
    if (field === 'assignments') items.sort((a, b) => compareIds((a as { resourceUnitId: string }).resourceUnitId, (b as { resourceUnitId: string }).resourceUnitId));
    if (['arrivalStreamIds', 'memberNodeIds', 'skillIds', 'nodeIds'].includes(field)) items.sort((a, b) => compareIds(a as string, b as string));
    return items;
  }
  if (value && typeof value === 'object') {
    const ignored = ['layout', 'name', 'description', 'notes', 'source', 'startClock', 'sourcePlanId', 'sourceScenarioId'];
    return Object.fromEntries(Object.entries(value).filter(([key, item]) => !ignored.includes(key) || (key === 'source' && typeof item === 'string' && 'target' in value))
      .sort(([a], [b]) => compareIds(a, b)).map(([key, item]) => [key, canonical(item, key)]));
  }
  return value;
}

export const scenarioKey = (scenario: Scenario) => scenarioFingerprint(scenario, MODEL_VERSION).fingerprint;
export const semanticKey = (value: unknown) => JSON.stringify(canonical(value));
export function inputKey(request: RunRequest): string {
  return fingerprintRunRequest(request, MODEL_VERSION).inputFingerprint;
}
