import type { RunRequest } from '../../src/schemas';

export function playbackFixture(services = 3, guests = 12): RunRequest {
  return {
    schemaVersion: 1, runMode: 'run_to_completion',
    scenario: { id: 'scenario', seed: 42, observationCutoff: 600, horizon: 3600, attributes: [], assumptionOverrides: [],
      arrivalStreams: [{ id: 'guests', kind: 'total_in_window', count: guests, start: 0, end: 42, spacing: 'even', provenance: { kind: 'synthetic' }, attributeDistributions: {} }] },
    plan: { id: 'plan', name: 'Synthetic playback chain', scenarioId: 'scenario', skills: [], staff: [], deviceTypes: [], assignments: [],
      graph: { nodes: [
        { id: 'entrance', type: 'entrance', name: 'Entrance', layout: { x: 0, y: 0 }, arrivalStreamIds: ['guests'] },
        ...Array.from({ length: services }, (_, i) => ({ id: `service-${i}`, type: 'service' as const, name: `Service ${i}`, layout: { x: (i + 1) * 300, y: 0 }, stageKey: `stage-${i}`,
          requirements: [], duration: { kind: 'fixed' as const, value: 1.001, provenance: { kind: 'synthetic' as const } }, openWindows: [], maxConcurrent: 4, queueCapacity: 8 })),
        { id: 'exit', type: 'exit', name: 'Exit', layout: { x: (services + 1) * 300, y: 0 } },
      ], edges: [
        { id: 'in', source: 'entrance', target: 'service-0' },
        ...Array.from({ length: services - 1 }, (_, i) => ({ id: `edge-${i}`, source: `service-${i}`, target: `service-${i + 1}` })),
        { id: 'out', source: `service-${services - 1}`, target: 'exit' },
      ] } },
  };
}
