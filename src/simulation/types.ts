import type { Participant, Plan, RunRequest, ValidationIssue } from '../schemas';

export type EventType = 'VISITOR_ARRIVAL' | 'ROUTE_TRANSITION' | 'QUEUE_ENTER' | 'QUEUE_BLOCKED' | 'QUEUE_REROUTED' | 'HOLD_ENTER' | 'HOLD_RELEASE' | 'SERVICE_START' | 'SERVICE_COMPLETE' | 'NODE_SCHEDULE_CHANGE' | 'RESOURCE_CHANGE' | 'VISITOR_COMPLETE' | 'VISITOR_LEAVE' | 'RUN_WARNING';
export interface SimulationEvent {
  seq: number;
  time: number;
  type: EventType;
  participantId?: string;
  nodeId?: string;
  edgeId?: string;
  resourceUnitIds?: string[];
  details?: Record<string, string | number | boolean | null | string[]>;
}
export type Outcome = 'completed' | 'rejected' | 'dismissed' | 'diverted' | 'loop_limit' | 'unfinished' | 'not_arrived';
export interface VisitorMetrics {
  id: string;
  outcome: Outcome;
  completedAt: number | null;
  waiting: number;
  queueWaiting: number;
  blockedWaiting: number;
  holdWaiting: number;
  nodeWaiting: Record<string, number>;
}
export interface NodeMetrics {
  id: string;
  visitors: number;
  completedServices: number;
  waiting: number;
  averageWaiting: number | null;
  maxQueue: number;
  queueSeconds: number;
  bottleneckSeconds: number;
}
export interface ResourceMetrics {
  id: string;
  busy: number;
  idle: number;
  unavailable: number;
  handover: number;
  offShift: number;
  unassigned: number;
  overtime: number;
  utilization: number | null;
}
export interface Statistics {
  until: number;
  arrived: number;
  outcomes: Record<Outcome, number>;
  averageWaiting: number | null;
  p90Waiting: number | null;
  visitors: VisitorMetrics[];
  nodes: NodeMetrics[];
  resources: ResourceMetrics[];
}
export interface SimulationRun {
  status: 'succeeded' | 'failed' | 'aborted';
  modelVersion: string;
  inputKey: string;
  scenarioKey: string;
  request: RunRequest;
  population: Participant[];
  events: SimulationEvent[];
  coveredUntil: number;
  statistics: Statistics | null;
  completion: Statistics | null;
  issues: ValidationIssue[];
}
export interface PlaybackState {
  visitors: Record<string, SimulationEvent>;
  nodes: Record<string, { queued: string[]; blocked: string[]; holding: string[]; serving: string[]; completed: number }>;
}
export interface Unit {
  id: string;
  skillIds: string[];
  deviceTypeId?: string;
  shifts: { start: number; end: number }[];
  unavailability: { start: number; end: number }[];
  assignment?: Plan['assignments'][number];
}
