import type { ProjectDocument } from '../schemas';
import type { Lang } from './messages';

type Names = Record<string, Record<Lang, string>>;

/** Display names of the built-in example and the blank project, keyed by entity ID. */
const SCENARIOS: Names = {
  'open-house': { zh: '双入口开放日', en: 'Two-Entrance Open House' },
  'scenario-1': { zh: '新活动', en: 'New event' },
};
const ATTRIBUTES: Names = {
  ticket: { zh: '票种', en: 'Ticket type' },
  visit: { zh: '参与方式', en: 'Visit type' },
};
const STREAMS: Names = {
  'main-stream': { zh: '主入口到达', en: 'Main entrance arrivals' },
  'side-stream': { zh: '侧入口到达', en: 'Side entrance arrivals' },
};
const PLANS: Names = {
  baseline: { zh: '方案 A · 基线', en: 'Plan A · Baseline' },
  alternative: { zh: '方案 B · 双核验通道', en: 'Plan B · Two check-in lanes' },
  'plan-1': { zh: '方案 A', en: 'Plan A' },
};
const NODES: Names = {
  main: { zh: '主入口', en: 'Main entrance' },
  side: { zh: '侧入口', en: 'Side entrance' },
  intake: { zh: '入口汇合', en: 'Entry merge' },
  tickets: { zh: '按票种分流', en: 'Split by ticket' },
  checkin: { zh: '身份核验', en: 'ID check' },
  checked: { zh: '核验后汇合', en: 'After-check merge' },
  review: { zh: '是否复检', en: 'Needs recheck?' },
  recheck: { zh: '人工复检', en: 'Manual recheck' },
  holding: { zh: '分批等候', en: 'Batch holding' },
  packing: { zh: '领取资料', en: 'Kit pickup' },
  'visit-choice': { zh: '参与方式', en: 'Visit choice' },
  orientation: { zh: '现场导览', en: 'Guided tour' },
  finish: { zh: '正常完成', en: 'Completed' },
  leave: { zh: '中途离开', en: 'Left early' },
  verification: { zh: '核验与复检', en: 'Check & recheck' },
  'lane-choice': { zh: '核验通道选择', en: 'Pick a check lane' },
  'checkin-extra': { zh: '第二核验通道', en: 'Second check lane' },
  briefing: { zh: '自助说明', en: 'Self-guided briefing' },
};
const SKILLS: Names = {
  check: { zh: '身份核验', en: 'ID check' },
  pack: { zh: '资料发放', en: 'Kit handout' },
};
const STAFF: Names = {
  'check-staff': { zh: '核验工作人员', en: 'Check-in staff' },
  'pack-staff': { zh: '资料工作人员', en: 'Kit staff' },
  floater: { zh: '机动工作人员', en: 'Floater' },
};
const DEVICES: Names = {
  scanner: { zh: '核验终端', en: 'ID scanner' },
};

function rename<T extends { id: string; name?: string }>(items: T[], names: Names, from: Lang, to: Lang): T[] {
  return items.map(item => {
    const entry = names[item.id];
    return entry && item.name === entry[from] ? { ...item, name: entry[to] } : item;
  });
}

/**
 * Switches built-in example names between languages. Only names that still match the
 * other language exactly are touched, so anything the user renamed stays as written.
 * Names are excluded from simulation keys, so existing results stay valid.
 */
export function localizeDocument<D extends Pick<ProjectDocument, 'scenarios' | 'plans'>>(document: D, from: Lang, to: Lang): D {
  if (from === to) return document;
  return {
    ...document,
    scenarios: rename(document.scenarios, SCENARIOS, from, to).map(scenario => ({
      ...scenario,
      attributes: rename(scenario.attributes, ATTRIBUTES, from, to),
      arrivalStreams: rename(scenario.arrivalStreams, STREAMS, from, to),
    })),
    plans: rename(document.plans, PLANS, from, to).map(plan => ({
      ...plan,
      graph: { ...plan.graph, nodes: rename(plan.graph.nodes, NODES, from, to) },
      skills: rename(plan.skills, SKILLS, from, to),
      staff: rename(plan.staff, STAFF, from, to),
      deviceTypes: rename(plan.deviceTypes, DEVICES, from, to),
    })),
  };
}
