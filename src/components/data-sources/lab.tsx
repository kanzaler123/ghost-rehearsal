import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import example from '../../../examples/open-house.json';
import { parseDocument, projectDocumentSchema, provenanceSchema, serializeDocument } from '../../schemas';
import type { ProjectDocument, ServiceNode } from '../../schemas';
import type { Lang } from '../../i18n/messages';
import { ArrivalDataEditor } from './ArrivalDataEditor';
import { ServiceDataEditor } from './ServiceDataEditor';
import { ProvenanceFields } from './ProvenanceFields';
import '../../app/styles/tokens.css';
import './lab.css';

function ExistingSource({ value, lang, onChange }: {
  value: ServiceNode['duration']['provenance']; lang: Lang;
  onChange: (value: ServiceNode['duration']['provenance']) => void;
}) {
  const [draft, setDraft] = useState(value);
  return <section className="ds-editor" aria-label={lang === 'zh' ? '现有服务来源' : 'Existing service source'}>
    <h2>{lang === 'zh' ? '仅编辑现有服务来源' : 'Edit existing service source only'}</h2>
    <p>{lang === 'zh' ? '此处仅更改来源说明或标签，服务数值保持不变。' : 'Edit source descriptions or the label here while keeping the service values unchanged.'}</p>
    <ProvenanceFields value={draft} lang={lang} onChange={setDraft} />
    <div className="ds-actions">
      <button type="button" disabled={!provenanceSchema.safeParse(draft).success || JSON.stringify(draft) === JSON.stringify(value)} onClick={() => onChange(draft)}>{lang === 'zh' ? '应用来源到草稿' : 'Apply source to draft'}</button>
      <button type="button" onClick={() => setDraft(value)}>{lang === 'zh' ? '取消来源编辑' : 'Cancel source edit'}</button>
    </div>
  </section>;
}

function DataSourcesLab() {
  const [lang, setLang] = useState<Lang>('en');
  const [committed, setCommitted] = useState(() => projectDocumentSchema.parse(example));
  const [draft, setDraft] = useState<ProjectDocument>(committed);
  const [planId, setPlanId] = useState(committed.plans[0].id);
  const [streamId, setStreamId] = useState(committed.scenarios[0].arrivalStreams[0].id);
  const [nodeId, setNodeId] = useState('checkin');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const zh = lang === 'zh';
  const plan = draft.plans.find(item => item.id === planId)!;
  const scenario = draft.scenarios.find(item => item.id === plan.scenarioId)!;
  const stream = scenario.arrivalStreams.find(item => item.id === streamId) ?? scenario.arrivalStreams[0];
  const services = plan.graph.nodes.filter((node): node is ServiceNode => node.type === 'service');
  const service = services.find(item => item.id === nodeId) ?? services[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(committed);
  const validated = parseDocument(serializeDocument(draft));

  function exportProject() {
    const url = URL.createObjectURL(new Blob([serializeDocument(committed)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data-sources-project.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <main className="data-sources-lab" lang={lang}>
    <header>
      <p>Ghost Rehearsal · D</p>
      <h1>{zh ? '数据来源评审页' : 'Data sources lab'}</h1>
      <label>Language <select aria-label="Language" value={lang} onChange={event => setLang(event.target.value as Lang)}>
        <option value="en">English</option><option value="zh">中文</option>
      </select></label>
      <p>{zh ? '本页使用内置开放日合成示例，供独立模块评审；不是实测活动验证。' : 'This independent module review uses the built-in synthetic open-house example. It is not real-event validation.'}</p>
      <p>{zh ? '编辑器的“应用数据”只更新下方项目草稿。“应用项目”才提交；放弃草稿会恢复已提交项目。到达条件由同场景的所有方案共享，接入工作台后，输入改动会使旧结果过期。' : 'Apply data updates only the project draft below. Apply project commits it; Discard draft restores the committed project. Arrival conditions are shared by every plan using the scenario; when integrated, changed inputs make old results stale.'}</p>
    </header>
    <div className="data-sources-lab-targets">
      <label>{zh ? '方案' : 'Plan'}<select value={plan.id} onChange={event => { setPlanId(event.target.value); setRevision(value => value + 1); }}>
        {draft.plans.map(item => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}
      </select></label>
      <label>{zh ? '目标群体' : 'Target stream'}<select value={stream.id} onChange={event => setStreamId(event.target.value)}>
        {scenario.arrivalStreams.map(item => <option key={item.id} value={item.id}>{item.name ?? item.id} ({item.id})</option>)}
      </select></label>
      <label>{zh ? '服务节点' : 'Service node'}<select value={service.id} onChange={event => setNodeId(event.target.value)}>
        {services.map(item => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}
      </select></label>
    </div>
    <div className="data-sources-lab-editors">
      <ArrivalDataEditor key={`arrival-${revision}`} stream={stream} attributes={scenario.attributes}
        observationCutoff={scenario.observationCutoff} horizon={scenario.horizon} lang={lang}
        onChange={next => {
          setDraft(current => ({ ...current, scenarios: current.scenarios.map(item => item.id !== scenario.id ? item : {
            ...item, arrivalStreams: item.arrivalStreams.map(itemStream => itemStream.id === stream.id ? next : itemStream),
          }) }));
          setNotice(zh ? '到达数据已写入草稿，尚未提交项目。' : 'Arrival data is in the draft; the project has not been committed.');
        }} />
      <ServiceDataEditor key={`service-${revision}-${plan.id}-${service.id}`} duration={service.duration} targetName={`${service.name} (${service.id})`} lang={lang}
        onChange={duration => {
          setDraft(current => ({ ...current, plans: current.plans.map(item => item.id !== plan.id ? item : {
            ...item, graph: { ...item.graph, nodes: item.graph.nodes.map(node => node.id === service.id && node.type === 'service' ? { ...node, duration } : node) },
          }) }));
          setNotice(zh ? '服务样本已写入草稿，尚未提交项目。' : 'Service samples are in the draft; the project has not been committed.');
        }} />
    </div>
    <details className="data-sources-lab-project">
      <summary>{zh ? '编辑现有服务来源（不替换样本）' : 'Edit existing service source (keep current samples)'}</summary>
      <p>{service.name} ({service.id})</p>
      <ExistingSource key={`${revision}-${plan.id}-${service.id}-${JSON.stringify(service.duration)}`} value={service.duration.provenance} lang={lang}
        onChange={provenance => setDraft(current => ({ ...current, plans: current.plans.map(item => item.id !== plan.id ? item : {
          ...item, graph: { ...item.graph, nodes: item.graph.nodes.map(node => node.id === service.id && node.type === 'service' ? { ...node, duration: { ...node.duration, provenance } } : node) },
        }) }))} />
    </details>
    <section className="data-sources-lab-project" aria-label={zh ? '项目提交' : 'Project commit'}>
      <h2>{zh ? '项目草稿' : 'Project draft'}</h2>
      <p>{zh ? (dirty ? '有未提交修改' : '与已提交项目相同') : (dirty ? 'Uncommitted changes' : 'Matches committed project')}</p>
      <div className="data-sources-lab-actions">
        <button type="button" disabled={!dirty || !validated.document} onClick={() => {
          if (!validated.document) return;
          setCommitted(draft); setRevision(value => value + 1);
          setNotice(zh ? '项目已提交，可导出。' : 'Project committed and ready to export.');
        }}>{zh ? '应用项目' : 'Apply project'}</button>
        <button type="button" onClick={() => { setDraft(committed); setRevision(value => value + 1); setNotice(zh ? '已放弃全部未提交草稿。' : 'All uncommitted drafts discarded.'); }}>{zh ? '放弃草稿' : 'Discard draft'}</button>
        <button type="button" onClick={exportProject}>{zh ? '导出项目' : 'Export project'}</button>
      </div>
      <p role="status">{notice}</p>
      <p>{zh ? '导出仅包含已提交项目。' : 'Export includes only the committed project.'}</p>
      <details open><summary>{zh ? '查看草稿 JSON' : 'View draft JSON'}</summary><pre data-testid="draft-project">{serializeDocument(draft)}</pre></details>
      <details><summary>{zh ? '查看已提交 JSON' : 'View committed JSON'}</summary><pre data-testid="committed-project">{serializeDocument(committed)}</pre></details>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<DataSourcesLab />);
