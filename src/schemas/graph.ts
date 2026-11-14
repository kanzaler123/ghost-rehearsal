import { deviceUnitIds, planSchema, scenarioSchema } from './model';
import type { Assignment, FieldPath, Node, ResourceRequirement, ValidationIssue } from './model';

function reachable(starts: string[], adjacency: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const pending = [...starts];
  while (pending.length) {
    const id = pending.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    pending.push(...(adjacency.get(id) ?? []).filter(next => !seen.has(next)));
  }
  return seen;
}

function cycles(ids: string[], adjacency: Map<string, string[]>): string[][] {
  const seen = new Set<string>();
  const order: string[] = [];
  const reverse = new Map(ids.map(id => [id, [] as string[]]));
  adjacency.forEach((targets, source) => targets.forEach(target => reverse.get(target)?.push(source)));
  for (const id of ids) {
    const stack: [string, boolean][] = [[id, false]];
    while (stack.length) {
      const [current, finish] = stack.pop()!;
      if (finish) { order.push(current); continue; }
      if (seen.has(current)) continue;
      seen.add(current);
      stack.push([current, true]);
      for (const next of adjacency.get(current) ?? []) if (!seen.has(next)) stack.push([next, false]);
    }
  }
  seen.clear();
  const result: string[][] = [];
  for (const id of order.reverse()) {
    if (seen.has(id)) continue;
    const component: string[] = [];
    const pending = [id];
    while (pending.length) {
      const current = pending.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      component.push(current);
      pending.push(...(reverse.get(current) ?? []).filter(next => !seen.has(next)));
    }
    if (component.length > 1 || adjacency.get(id)?.includes(id)) result.push(component.sort());
  }
  return result.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
}

interface ResourceUnit {
  id: string;
  skillIds: string[];
  deviceTypeId?: string;
  shifts: { start: number; end: number }[];
  unavailability: { start: number; end: number }[];
  assignment?: Assignment;
}

function satisfies(unit: ResourceUnit, requirement: ResourceRequirement): boolean {
  return requirement.kind === 'staff' ? unit.skillIds.includes(requirement.skillId) : unit.deviceTypeId === requirement.deviceTypeId;
}

function canMatch(requirements: ResourceRequirement[], units: ResourceUnit[]): boolean {
  if (requirements.reduce((sum, requirement) => sum + requirement.quantity, 0) > units.length) return false;
  const slots = requirements.flatMap(requirement => Array.from({ length: requirement.quantity }, () => requirement));
  const owners = new Map<string, number>();
  const assign = (slot: number, visited: Set<string>): boolean => {
    for (const unit of units) {
      if (visited.has(unit.id) || !satisfies(unit, slots[slot])) continue;
      visited.add(unit.id);
      const owner = owners.get(unit.id);
      if (owner === undefined || assign(owner, visited)) { owners.set(unit.id, slot); return true; }
    }
    return false;
  };
  return slots.every((_, slot) => assign(slot, new Set()));
}

export function validateGraph(scenarioInput: unknown, planInput: unknown): ValidationIssue[] {
  const scenarioResult = scenarioSchema.safeParse(scenarioInput);
  const planResult = planSchema.safeParse(planInput);
  if (!scenarioResult.success || !planResult.success) return [];
  const scenario = scenarioResult.data;
  const plan = planResult.data;
  const issues: ValidationIssue[] = [];
  const add = (code: string, message: string, entityIds: string[], path: FieldPath, severity: 'error' | 'warning' = 'error') => {
    issues.push({ code, message, entityIds, path, severity });
  };
  const nodePath = (id: string): FieldPath => ['plan', 'graph', 'nodes', plan.graph.nodes.findIndex(node => node.id === id)];
  const allNodes = new Map(plan.graph.nodes.map(node => [node.id, node]));
  const subflows = plan.graph.nodes.filter(node => node.type === 'subflow');
  const subflowIds = new Set(subflows.map(node => node.id));
  if (plan.scenarioId !== scenario.id) add('scenario_mismatch', '方案引用的场景与传入场景不一致', [plan.id], ['plan', 'scenarioId']);

  const owners = new Map<string, string[]>();
  const membership = new Map(subflows.map(node => [node.id, node.memberNodeIds.filter(id => subflowIds.has(id))]));
  for (const subflow of subflows) {
    subflow.memberNodeIds.forEach((id, index) => {
      if (!allNodes.has(id)) add('unknown_subflow_member', '子流程成员不存在', [subflow.id, id], [...nodePath(subflow.id), 'memberNodeIds', index]);
      owners.set(id, [...(owners.get(id) ?? []), subflow.id]);
    });
  }
  owners.forEach((containers, id) => {
    if (containers.length > 1) add('multiple_subflow_parents', '一个节点只能属于一个直接子流程', [id, ...containers.sort()], allNodes.has(id) ? nodePath(id) : [...nodePath(containers[0]), 'memberNodeIds']);
  });
  for (const component of cycles([...subflowIds], membership)) {
    add('subflow_cycle', '子流程不能循环包含', component, nodePath(component[0]));
  }

  const nodes = plan.graph.nodes.filter(node => node.type !== 'subflow');
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const edges = plan.graph.edges.filter((edge, index) => {
    let valid = true;
    for (const end of ['source', 'target'] as const) {
      if (subflowIds.has(edge[end])) {
        add('subflow_endpoint', '连线必须连接子流程的具体成员节点', [edge.id, edge[end]], ['plan', 'graph', 'edges', index, end]);
        valid = false;
      }
    }
    return valid;
  });
  const edgePath = (id: string): FieldPath => ['plan', 'graph', 'edges', plan.graph.edges.findIndex(edge => edge.id === id)];
  const incoming = new Map(nodes.map(node => [node.id, edges.filter(edge => edge.target === node.id)]));
  const outgoing = new Map(nodes.map(node => [node.id, edges.filter(edge => edge.source === node.id)]));
  const adjacency = new Map(nodes.map(node => [node.id, [] as string[]]));
  const termination = new Map(nodes.map(node => [node.id, [] as string[]]));
  for (const edge of edges) {
    for (const end of ['source', 'target'] as const) {
      if (!nodeMap.has(edge[end])) add(`unknown_edge_${end}`, '连线引用的节点不存在', [edge.id], [...edgePath(edge.id), end]);
    }
    if (edge.source === edge.target) add('self_edge', '连线不能直接连接节点自身', [edge.id], [...edgePath(edge.id), 'target']);
    const source = nodeMap.get(edge.source);
    if (source && source.type !== 'decision' && edge.branchKey !== undefined) {
      add('unexpected_branch_key', '只有决策节点的出边可以设置分支标识', [edge.id], [...edgePath(edge.id), 'branchKey']);
    }
    if (source && nodeMap.has(edge.target)) {
      adjacency.get(source.id)!.push(edge.target);
      if (source.type !== 'decision' || !source.loopGuard || edge.branchKey === source.loopGuard.exitBranchKey) {
        termination.get(source.id)!.push(edge.target);
      }
    }
  }

  const redirects = (node: Node): { kind: 'reroute' | 'redirect'; target: string; path: FieldPath }[] => {
    const refs: { kind: 'reroute' | 'redirect'; target: string; path: FieldPath }[] = [];
    if ((node.type === 'service' || node.type === 'waiting_area') && node.fullPolicy?.kind === 'reroute') {
      refs.push({ kind: 'reroute', target: node.fullPolicy.targetNodeId, path: [...nodePath(node.id), 'fullPolicy', 'targetNodeId'] });
    }
    if (node.type === 'service') {
      for (const mode of ['queued', 'late'] as const) {
        const policy = node.closePolicy?.[mode];
        if (policy?.kind === 'redirect') refs.push({ kind: 'redirect', target: policy.targetNodeId, path: [...nodePath(node.id), 'closePolicy', mode, 'targetNodeId'] });
      }
    }
    return refs;
  };
  for (const node of nodes) {
    for (const ref of redirects(node)) {
      const target = allNodes.get(ref.target);
      if (target?.type === 'subflow') add('subflow_reference', '必须引用子流程的具体成员节点', [node.id, ref.target], ref.path);
      else if (!target) add(`unknown_${ref.kind}_target`, '转送目标不存在', [node.id, ref.target], ref.path);
      else if (target.type === 'entrance') add(`${ref.kind}_to_entrance`, '转送目标不能是入口', [node.id, ref.target], ref.path);
      else if (target.id === node.id) add(`${ref.kind}_to_self`, '不能转送到自身', [node.id, ref.target], ref.path);
      if (target && target.type !== 'subflow') {
        adjacency.get(node.id)!.push(target.id);
        termination.get(node.id)!.push(target.id);
      }
    }
    const inEdges = incoming.get(node.id)!;
    const outEdges = outgoing.get(node.id)!;
    if (node.type === 'entrance' ? inEdges.length !== 0 : inEdges.length === 0) {
      add(node.type === 'entrance' ? 'entrance_has_incoming' : 'missing_incoming', node.type === 'entrance' ? '入口不能有入边' : '节点至少需要一条入边', [node.id, ...inEdges.map(edge => edge.id)], nodePath(node.id));
    }
    if (node.type === 'decision') {
      for (const branch of node.routing.branches) {
        const matching = outEdges.filter(edge => edge.branchKey === branch.branchKey);
        if (matching.length !== 1) add('branch_edge_count', '每个分支必须对应且仅对应一条出边', [node.id, ...matching.map(edge => edge.id)], [...nodePath(node.id), 'routing', 'branches', node.routing.branches.findIndex(item => item.branchKey === branch.branchKey)]);
      }
      for (const edge of outEdges) {
        if (!node.routing.branches.some(branch => branch.branchKey === edge.branchKey)) add('unknown_edge_branch', '决策出边须引用该节点的分支标识', [node.id, edge.id], [...edgePath(edge.id), 'branchKey']);
      }
      if (node.routing.kind === 'attribute') {
        node.routing.branches.forEach((branch, index) => {
          if (!branch.condition) return;
          const condition = branch.condition;
          const attribute = scenario.attributes.find(item => item.id === condition.attributeId);
          const path = [...nodePath(node.id), 'routing', 'branches', index, 'condition'];
          if (!attribute) add('unknown_route_attribute', '路由条件引用的属性不存在', [node.id, condition.attributeId], [...path, 'attributeId']);
          else condition.values.forEach((value, valueIndex) => {
            if (!attribute.values.includes(value)) add('unknown_route_value', '路由条件的属性取值不存在', [node.id, attribute.id], [...path, 'values', valueIndex]);
          });
        });
      }
    } else if (node.type === 'exit' ? outEdges.length !== 0 : outEdges.length !== 1) {
      add(node.type === 'exit' ? 'exit_has_outgoing' : 'outgoing_count', node.type === 'exit' ? '出口不能有出边' : '节点必须且只能有一条出边', [node.id, ...outEdges.map(edge => edge.id)], nodePath(node.id));
    }
    if (node.type === 'merge') {
      for (const edge of inEdges) {
        if (!node.incomingPriority.includes(edge.id)) add('missing_merge_priority', '汇合优先级列表缺少入边', [node.id, edge.id], [...nodePath(node.id), 'incomingPriority']);
      }
      node.incomingPriority.forEach((id, index) => {
        if (!inEdges.some(edge => edge.id === id)) add('unknown_merge_priority', '汇合优先级只能引用该节点的入边', [node.id, id], [...nodePath(node.id), 'incomingPriority', index]);
      });
    }
  }

  const entrances = nodes.filter(node => node.type === 'entrance');
  const exits = nodes.filter(node => node.type === 'exit');
  if (!entrances.length) add('missing_entrance', '流程缺少入口', [plan.id], ['plan', 'graph', 'nodes']);
  if (!exits.length) add('missing_exit', '流程缺少出口', [plan.id], ['plan', 'graph', 'nodes']);
  if (exits.length && exits.every(node => node.countsAsCompleted === false)) {
    add('no_completion_exit', '所有出口均为中途离开，正常完成人数恒为零', exits.map(node => node.id), ['plan', 'graph', 'nodes'], 'warning');
  }
  for (const entrance of entrances) {
    entrance.arrivalStreamIds.forEach((id, index) => {
      if (!scenario.arrivalStreams.some(stream => stream.id === id)) add('unknown_arrival_stream', '入口引用的到达流不存在', [entrance.id, id], [...nodePath(entrance.id), 'arrivalStreamIds', index]);
    });
  }
  scenario.arrivalStreams.forEach((stream, index) => {
    const bound = entrances.filter(node => node.arrivalStreamIds.includes(stream.id));
    if (bound.length !== 1) add('arrival_binding_count', '每个到达流必须且只能绑定一个入口', [stream.id, ...bound.map(node => node.id)], ['scenario', 'arrivalStreams', index]);
  });
  const fromEntrance = reachable(entrances.map(node => node.id), adjacency);
  const reverse = new Map(nodes.map(node => [node.id, [] as string[]]));
  adjacency.forEach((targets, source) => targets.forEach(target => reverse.get(target)?.push(source)));
  const toExit = reachable(exits.map(node => node.id), reverse);
  for (const node of nodes) {
    if (entrances.length && !fromEntrance.has(node.id)) add('unreachable_node', '节点无法从任一入口到达', [node.id], nodePath(node.id), 'warning');
    if (exits.length && fromEntrance.has(node.id) && !toExit.has(node.id)) add('no_exit_path', '从此节点无法到达任一出口', [node.id], nodePath(node.id));
  }
  for (const component of cycles(nodes.map(node => node.id), termination)) {
    add('unterminated_loop', '循环缺少能保证离开的终止条件', component, nodePath(component[0]));
  }

  const assignments = new Map(plan.assignments.map(assignment => [assignment.resourceUnitId, assignment]));
  const units: ResourceUnit[] = [
    ...plan.staff.map(staff => ({ id: staff.id, skillIds: staff.skillIds, shifts: staff.shifts, unavailability: staff.unavailability, assignment: assignments.get(staff.id) })),
    ...plan.deviceTypes.flatMap(device => deviceUnitIds(device).map(id => ({ id, skillIds: [], deviceTypeId: device.id, shifts: device.shifts, unavailability: device.unavailability.filter(window => window.resourceUnitId === id), assignment: assignments.get(id) }))),
  ];
  const unitMap = new Map(units.map(unit => [unit.id, unit]));
  const skills = new Set(plan.skills.map(skill => skill.id));
  plan.staff.forEach((staff, index) => staff.skillIds.forEach((id, skillIndex) => {
    if (!skills.has(id)) add('unknown_staff_skill', '工作人员引用的技能不存在', [staff.id, id], ['plan', 'staff', index, 'skillIds', skillIndex]);
  }));
  plan.assignments.forEach((assignment, index) => {
    const unit = unitMap.get(assignment.resourceUnitId);
    if (!unit) add('unknown_assignment_resource', '排岗引用的资源单元不存在', [assignment.resourceUnitId], ['plan', 'assignments', index, 'resourceUnitId']);
    assignment.periods.forEach((period, periodIndex) => period.nodeIds.forEach((id, nodeIndex) => {
      const target = allNodes.get(id);
      const path = ['plan', 'assignments', index, 'periods', periodIndex, 'nodeIds', nodeIndex];
      if (target?.type === 'subflow') add('subflow_reference', '排岗必须引用子流程中的服务节点', [assignment.resourceUnitId, id], path);
      else if (target?.type !== 'service') add('invalid_assignment_node', '排岗只能引用已有服务节点', [assignment.resourceUnitId, id], path);
      else if (unit && !target.requirements.some(requirement => satisfies(unit, requirement))) add('assignment_skill_mismatch', '此资源无法满足该服务节点的任何需求', [assignment.resourceUnitId, id], path, 'warning');
    }));
  });
  const boundaries = new Set<number>([0, scenario.horizon]);
  units.forEach(unit => {
    [...unit.shifts, ...unit.unavailability].forEach(window => { boundaries.add(window.start); boundaries.add(window.end); });
    unit.assignment?.periods.forEach(period => { boundaries.add(period.from); if (period.to !== undefined) boundaries.add(period.to); });
  });
  for (const node of nodes) {
    if (node.type !== 'service' || node.requirements.length === 0) continue;
    let invalid = false;
    node.requirements.forEach((requirement, index) => {
      const id = requirement.kind === 'staff' ? requirement.skillId : requirement.deviceTypeId;
      const field = requirement.kind === 'staff' ? 'skillId' : 'deviceTypeId';
      const path = [...nodePath(node.id), 'requirements', index];
      if (requirement.kind === 'staff' ? !skills.has(id) : !plan.deviceTypes.some(device => device.id === id)) {
        add('unknown_requirement_resource', '服务需求引用的技能或设备类型不存在', [node.id, id], [...path, field]);
        invalid = true;
      } else if (units.filter(unit => satisfies(unit, requirement) && (!unit.assignment || unit.assignment.periods.some(period => period.nodeIds.includes(node.id)))).length < requirement.quantity) {
        add('insufficient_resources', '有资格服务此节点的资源数量不足', [node.id, id], path);
        invalid = true;
      }
    });
    if (!canMatch(node.requirements, units.filter(unit => unit.shifts.length > 0))) {
      add('joint_resource_shortage', '即使忽略时段冲突，也无法用互不重复的在岗资源满足全部需求', [node.id], [...nodePath(node.id), 'requirements'], 'warning');
    }
    if (invalid) continue;
    const windows = node.openWindows.length ? node.openWindows.map(window => ({ start: window.openAt, end: window.closeAt })) : [{ start: 0, end: scenario.horizon }];
    const candidates = new Set(boundaries);
    windows.forEach(window => { candidates.add(window.start); candidates.add(window.end); });
    const hasAvailability = [...candidates].some(time => windows.some(window => window.start <= time && time < window.end)
      && node.requirements.every(requirement => units.filter(unit => satisfies(unit, requirement)
        && unit.shifts.some(window => window.start <= time && time < window.end)
        && !unit.unavailability.some(window => window.start <= time && time < window.end)
        && (!unit.assignment || unit.assignment.periods.some(period => period.from <= time && (period.to === undefined || time < period.to) && period.nodeIds.includes(node.id)))).length >= requirement.quantity));
    if (!hasAvailability) add('no_resource_overlap', '开放期间没有同时满足各项资源数量的时段', [node.id], nodePath(node.id), 'warning');
  }
  scenario.assumptionOverrides.forEach((override, index) => {
    if (override.kind !== 'resource_interruption') return;
    const resource = override.resource;
    const found = resource.kind === 'staff' ? plan.staff.find(staff => staff.id === resource.id) : plan.deviceTypes.find(device => device.id === resource.id);
    if (!found) add('interruption_resource_missing', '当前方案不含该中断资源', [plan.id, resource.id], ['scenario', 'assumptionOverrides', index, 'resource', 'id'], 'warning');
    else if (resource.kind === 'device_type' && 'quantity' in found && resource.quantity > found.quantity) add('interruption_quantity_exceeded', '中断数量超过当前方案的设备数量', [plan.id, resource.id], ['scenario', 'assumptionOverrides', index, 'resource', 'quantity'], 'warning');
  });
  return issues;
}
