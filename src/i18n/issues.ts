import type { ValidationIssue } from '../schemas';
import type { Lang } from './messages';

/**
 * Validation and engine messages are produced in Chinese by the schema layer (tests rely on that).
 * The interface translates them by their stable issue code.
 */
const EN_BY_CODE: Record<string, string> = {
  scenario_mismatch: 'The plan references a different scenario than the one supplied.',
  unknown_subflow_member: 'A subflow member does not exist.',
  multiple_subflow_parents: 'A node can belong to only one direct subflow.',
  subflow_cycle: 'Subflows cannot contain each other in a cycle.',
  subflow_endpoint: 'Routes must connect to a concrete member node, not the subflow itself.',
  subflow_reference: 'Reference a concrete member node rather than the subflow.',
  unknown_edge_source: 'The route starts from a node that does not exist.',
  unknown_edge_target: 'The route points to a node that does not exist.',
  self_edge: 'A route cannot connect a node to itself.',
  unexpected_branch_key: 'Only routes leaving a decision node can have a branch key.',
  unknown_reroute_target: 'The overflow target does not exist.',
  unknown_redirect_target: 'The redirect target does not exist.',
  reroute_to_entrance: 'The overflow target cannot be an entrance.',
  redirect_to_entrance: 'The redirect target cannot be an entrance.',
  reroute_to_self: 'A node cannot send guests to itself.',
  redirect_to_self: 'A node cannot redirect guests to itself.',
  entrance_has_incoming: 'Entrances cannot have incoming routes.',
  missing_incoming: 'This node needs at least one incoming route.',
  branch_edge_count: 'Each branch needs exactly one outgoing route.',
  unknown_edge_branch: 'Decision routes must use one of the node’s branch keys.',
  unknown_route_attribute: 'The routing condition uses an attribute that does not exist.',
  unknown_route_value: 'The routing condition uses an attribute value that does not exist.',
  exit_has_outgoing: 'Exits cannot have outgoing routes.',
  outgoing_count: 'This node needs exactly one outgoing route.',
  missing_merge_priority: 'The merge priority list is missing an incoming route.',
  unknown_merge_priority: 'Merge priority can only list this node’s incoming routes.',
  missing_entrance: 'The flow has no entrance.',
  missing_exit: 'The flow has no exit.',
  no_completion_exit: 'Every exit counts as leaving early, so completions will always be zero.',
  unknown_arrival_stream: 'The entrance references an arrival stream that does not exist.',
  arrival_binding_count: 'Each arrival stream must be bound to exactly one entrance.',
  unreachable_node: 'No entrance can reach this node.',
  no_exit_path: 'No exit can be reached from this node.',
  unterminated_loop: 'This loop has no condition that guarantees guests can leave.',
  unknown_staff_skill: 'A staff member references a skill that does not exist.',
  unknown_assignment_resource: 'A post references a resource unit that does not exist.',
  invalid_assignment_node: 'Posts can only reference existing service nodes.',
  assignment_skill_mismatch: 'This resource cannot meet any requirement of that service node.',
  unknown_requirement_resource: 'A service requirement references a skill or device type that does not exist.',
  insufficient_resources: 'Not enough qualified resources exist to serve this node.',
  joint_resource_shortage: 'Even ignoring schedule conflicts, distinct on-shift resources cannot meet every requirement.',
  no_resource_overlap: 'While open, there is no period where every resource requirement is met at once.',
  interruption_resource_missing: 'This plan does not include the interrupted resource.',
  interruption_quantity_exceeded: 'The interruption exceeds the number of devices in this plan.',
  duplicate_id: 'IDs must be unique within the same scope.',
  window_order: 'Time windows must be in ascending order without overlaps.',
  invalid_window: 'The end time must be later than the start time.',
  invalid_distribution: 'The distribution bounds are out of order (min ≤ mode ≤ max).',
  invalid_probability_sum: 'Probabilities must add up to 1.',
  invalid_default_branch: 'Attribute routing needs exactly one default branch.',
  unknown_guard_branch: 'The loop exit must reference an existing branch.',
  batch_exceeds_capacity: 'The batch size cannot exceed the holding capacity.',
  unknown_device_unit: 'An unavailability window references a device unit that does not exist.',
  assignment_overlap: 'Post periods must be ascending and non-overlapping; an open-ended period must come last.',
  peak_outside_window: 'The peak time must fall inside the arrival window.',
  bucket_overlap: 'Arrival time slots cannot overlap.',
  horizon_before_cutoff: 'The run limit cannot be earlier than the observation cutoff.',
  missing_attribute: 'A guest attribute or its distribution is missing.',
  unknown_attribute: 'This attribute is not defined in the scenario.',
  invalid_attribute_value: 'The value is not one of the attribute’s allowed values.',
  duplicate_multiplier: 'Each stage (or the global scope) can have only one service-time multiplier.',
  unknown_scenario: 'The plan references a scenario that does not exist.',
  unknown_field: 'This field is not defined for this type.',
  batch_without_timeout: 'Guests short of a full batch may never be released before the run ends.',
  prototype_population_limit: 'This preview runs at most 10,000 guests at a time. Reduce the scenario first.',
  max_steps_exceeded: 'A guest reached the maximum number of flow steps.',
  max_events_exceeded: 'The event limit was reached. Only partial records exist, so no statistics are produced.',
};

const EN_BY_MESSAGE: Record<string, string> = {
  '名称须包含非空白字符且不超过 100 个 Unicode 码点': 'Names need at least one visible character and at most 100 characters.',
  '文本不得超过 1000 个 Unicode 码点': 'Text cannot exceed 1,000 characters.',
  '预演未能完成': 'The rehearsal could not finish.',
};

export function issueText(issue: Pick<ValidationIssue, 'code' | 'message'>, lang: Lang): string {
  if (lang === 'zh') return issue.message;
  return EN_BY_CODE[issue.code] ?? EN_BY_MESSAGE[issue.message] ?? 'A field is missing, has the wrong type, or is out of range.';
}

/** Zod issues from direct schema parsing (JSON editor). Custom refinements carry the rule code in params. */
export function zodIssueText(issue: { code: string; message: string; params?: Record<string, unknown> }, lang: Lang): string {
  if (lang === 'zh' || issue.code !== 'custom') return issue.message;
  const rule = typeof issue.params?.rule === 'string' ? issue.params.rule : '';
  return EN_BY_CODE[rule] ?? EN_BY_MESSAGE[issue.message] ?? issue.message;
}

/** Raw error strings (for example from the worker) are translated when known. */
export function errorText(message: string, lang: Lang): string {
  if (lang === 'zh') return message;
  return EN_BY_MESSAGE[message] ?? message;
}
