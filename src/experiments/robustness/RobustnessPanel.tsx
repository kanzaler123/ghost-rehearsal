import { useEffect, useMemo, useRef, useState } from 'react';
import { parseDocument, validateGraph } from '../../schemas';
import type { ProjectDocument } from '../../schemas';
import { aggregateBatch } from './aggregate';
import { RobustnessClient } from './client';
import type { BatchState } from './client';
import { defaultConfig, prepareBatch } from './conditions';
import { exportBatch, exportGroup } from './export';
import { labels } from './labels';
import type { LabLanguage } from './labels';
import type { Condition, Distribution, JobStatus } from './types';

const statuses: JobStatus[] = ['succeeded', 'failed', 'aborted', 'canceled', 'not-run'];
const number = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(value);
const change = (value: number | null) => value == null ? '—' : `${value > 0 ? '+' : ''}${number(value)}`;
const distribution = (value: Distribution) => value.n ? `${change(value.median)} [${change(value.min)}, ${change(value.max)}]` : '—';
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RobustnessPanel({ project, baselinePlanId, candidatePlanId, lang = 'zh', embedded = false }: { project: ProjectDocument; baselinePlanId?: string; candidatePlanId?: string; lang?: LabLanguage; embedded?: boolean }) {
  const [language, setLanguage] = useState<LabLanguage>(lang);
  const t = labels[language];
  const initialConfig = useMemo(() => ({ ...defaultConfig(project), ...(baselinePlanId ? { baselinePlanId } : {}), ...(candidatePlanId ? { candidatePlanIds: [candidatePlanId] } : {}) }), [project, baselinePlanId, candidatePlanId]);
  const [document, setDocument] = useState(project);
  const [config, setConfig] = useState(initialConfig);
  const [seedText, setSeedText] = useState(() => defaultConfig(project).seeds.join(', '));
  const [conditionInputs, setConditionInputs] = useState(() => defaultConfig(project).conditions.map(item => ({ ...item, value: String(item.multiplier) })));
  const [state, setState] = useState<BatchState | null>(null);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [conditionFilter, setConditionFilter] = useState('');
  const [candidateFilter, setCandidateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupSeed, setGroupSeed] = useState('');
  const [groupCondition, setGroupCondition] = useState('');
  const client = useRef<RobustnessClient | null>(null);
  useEffect(() => {
    const next = new RobustnessClient(setState);
    client.current = next;
    return () => { next.dispose(); client.current = null; };
  }, []);
  useEffect(() => {
    const next = initialConfig;
    setDocument(project);
    setConfig(next);
    setSeedText(next.seeds.join(', '));
    setConditionInputs(next.conditions.map(item => ({ ...item, value: String(item.multiplier) })));
  }, [project, initialConfig]);

  const parsedConfig = useMemo(() => ({ ...config,
    seeds: seedText.trim() ? seedText.trim().split(/[\s,，]+/).filter(Boolean).map(Number) : [],
    conditions: conditionInputs.map(({ id, label, value }) => ({ id, label, multiplier: Number(value) })),
  }), [config, seedText, conditionInputs]);
  const preview = useMemo(() => {
    try { return { batch: prepareBatch(document, parsedConfig, 'preview'), error: '' }; }
    catch (reason) { return { batch: null, error: reason instanceof Error ? reason.message : String(reason) }; }
  }, [document, parsedConfig]);
  const running = state?.status === 'running';
  const plannedJobs = parsedConfig.seeds.length * parsedConfig.conditions.length * (1 + parsedConfig.candidatePlanIds.length);
  const baseline = document.plans.find(plan => plan.id === config.baselinePlanId);
  const rows = state?.rows ?? [];
  const groups = useMemo(() => state ? aggregateBatch(state.batch, state.rows) : [], [state]);
  const batch = state?.batch;
  const inputChanged = !!batch && (!preview.batch || JSON.stringify([batch.project, batch.config]) !== JSON.stringify([preview.batch.project, preview.batch.config]));
  const planName = (id: string) => batch?.project.plans.find(plan => plan.id === id)?.name ?? id;
  const conditionName = (condition: Condition) => condition.multiplier === 1 ? t.original : `${t.multiplier} ×${number(condition.multiplier)}`;
  const resultConditionName = (id: string) => {
    const condition = batch?.config.conditions.find(item => item.id === id);
    return condition ? `${conditionName(condition)} (${condition.id})` : id;
  };
  const visibleRows = rows.filter(row => (!conditionFilter || row.conditionId === conditionFilter)
    && (!candidateFilter || row.planId === candidateFilter || row.planId === batch?.config.baselinePlanId)
    && (!statusFilter || row.status === statusFilter));
  const visibleGroups = groups.filter(group => (!conditionFilter || group.conditionId === conditionFilter)
    && (!candidateFilter || group.candidatePlanId === candidateFilter));
  const counts = Object.fromEntries(statuses.map(status => [status, rows.filter(row => row.status === status).length])) as Record<JobStatus, number>;
  const finished = counts.succeeded + counts.failed + counts.aborted;
  const current = batch?.jobs.find(job => job.id === state?.currentJobId);

  async function importProject(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const result = parseDocument(await file.text());
      if (!result.document) { setError(result.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')); return; }
      const issues = result.document.plans.flatMap(plan => validateGraph(result.document!.scenarios.find(scenario => scenario.id === plan.scenarioId)!, plan)).filter(issue => issue.severity === 'error');
      if (issues.length) { setError(issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')); return; }
      const next = defaultConfig(result.document);
      setDocument(result.document);
      setConfig(next);
      setSeedText(next.seeds.join(', '));
      setConditionInputs(next.conditions.map(item => ({ ...item, value: String(item.multiplier) })));
      setError('');
    } catch (reason) { setError(`${t.readError}: ${reason instanceof Error ? reason.message : String(reason)}`); }
    finally { setImporting(false); }
  }
  function start() {
    try {
      const next = prepareBatch(document, parsedConfig, crypto.randomUUID());
      setError('');
      setConditionFilter(''); setCandidateFilter(''); setStatusFilter('');
      setGroupSeed(String(next.config.seeds[0])); setGroupCondition(next.config.conditions[0].id);
      client.current!.start(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  }

  return <section className={`robustness-lab${embedded ? ' is-embedded' : ''}`} data-testid="robustness-panel" lang={language === 'zh' ? 'zh-CN' : 'en'}>
    <header className="lab-header">
      <div>{!embedded && <><p className="lab-note">GHOST REHEARSAL / LAB C</p><h1>{t.title}</h1></>}<p>{t.subtitle}</p></div>
      {!embedded && <button type="button" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}>{language === 'zh' ? 'English' : '中文'}</button>}
    </header>
    <p>{t.scope}</p><p className="lab-note">{t.synthetic}</p>
    {embedded && <p className="lab-note">{t.coordination}</p>}
    <p data-testid="experiment-cutoff">{t.cutoff}: {number(document.scenarios.find(scenario => scenario.id === baseline?.scenarioId)?.observationCutoff)} s</p>
    <section className="lab-section" aria-labelledby="lab-config-title">
      <h2 id="lab-config-title">{t.configuration}</h2>
      <fieldset disabled={running || importing}>
        <div className="lab-config-grid">
          <div>
            {!embedded && <label>{t.project}<input type="file" accept="application/json,.json" onChange={event => { void importProject(event.target.files?.[0]); event.target.value = ''; }} /></label>}
            <label>{t.baseline}<select aria-label={t.baseline} value={config.baselinePlanId} onChange={event => {
              const id = event.target.value, scenarioId = document.plans.find(plan => plan.id === id)?.scenarioId;
              const possible = document.plans.filter(plan => plan.id !== id && plan.scenarioId === scenarioId).map(plan => plan.id);
              const retained = config.candidatePlanIds.filter(candidate => possible.includes(candidate));
              setConfig({ ...config, baselinePlanId: id, candidatePlanIds: retained.length ? retained : possible.slice(0, 1) });
            }}>{document.plans.map(plan => <option value={plan.id} key={plan.id}>{plan.name} · {plan.scenarioId}</option>)}</select></label>
            <fieldset><legend>{t.candidates}</legend>{document.plans.filter(plan => plan.id !== config.baselinePlanId).map(plan => <label className="lab-checkbox" key={plan.id}>
              <input type="checkbox" checked={config.candidatePlanIds.includes(plan.id)} disabled={plan.scenarioId !== baseline?.scenarioId || (!config.candidatePlanIds.includes(plan.id) && config.candidatePlanIds.length >= 2)}
                onChange={event => setConfig({ ...config, candidatePlanIds: event.target.checked ? [...config.candidatePlanIds, plan.id] : config.candidatePlanIds.filter(id => id !== plan.id) })} />
              {plan.name} · {plan.scenarioId}
            </label>)}</fieldset>
            <label>{t.seeds}<textarea aria-label={t.seeds} value={seedText} onChange={event => setSeedText(event.target.value)} /></label>
          </div>
          <div><fieldset><legend>{t.conditions}</legend>
            {conditionInputs.map((condition, index) => <div className="lab-condition" key={condition.id}>
              <label>{condition.id}<input type="number" aria-label={`${t.multiplier} ${index + 1}`} min="0" max="100" step="0.05" value={condition.value}
                onChange={event => setConditionInputs(conditionInputs.map((item, i) => i === index ? { ...item, value: event.target.value, label: `Service ×${event.target.value}` } : item))} /></label>
              <button type="button" aria-label={`${t.remove} ${condition.id}`} onClick={() => setConditionInputs(conditionInputs.filter((_, i) => i !== index))}>{t.remove}</button>
            </div>)}
            <button type="button" onClick={() => {
              let index = conditionInputs.length + 1;
              while (conditionInputs.some(item => item.id === `condition-${index}`)) index++;
              setConditionInputs([...conditionInputs, { id: `condition-${index}`, label: 'Service ×1', multiplier: 1, value: '1' }]);
            }}>{t.addCondition}</button>
          </fieldset><p className="lab-note">{t.limit}</p></div>
        </div>
      </fieldset>
      <p className="lab-count" data-testid="estimated-jobs">{t.count}: <strong>{plannedJobs}</strong> {t.jobs} ({parsedConfig.seeds.length} × {parsedConfig.conditions.length} × {1 + parsedConfig.candidatePlanIds.length})</p>
      {(error || preview.error) && <p role="alert" className="lab-error">{error || preview.error}</p>}
      <div className="lab-actions"><button type="button" className="lab-primary" disabled={running || importing || !preview.batch} onClick={start}>{t.start}</button>
        <button type="button" disabled={!running} onClick={() => client.current?.cancel()}>{t.cancel}</button></div>
    </section>
    {state && <section className="lab-section" aria-labelledby="lab-progress-title">
      <h2 id="lab-progress-title">{t.progress}</h2>
      <p data-testid="batch-status" data-status={state.status} role="status">{t[state.status]} · <span data-testid="job-count">{finished} / {state.batch.jobs.length}</span></p>
      <p className="lab-batch-id" data-testid="batch-id">{state.batch.batchId}</p>
      <progress data-testid="batch-progress" aria-label={t.progress} max={state.batch.jobs.length} value={finished} />
      <p>{statuses.map(status => `${t.statuses[status]}: ${counts[status]}`).join(' · ')}</p>
      {current && <p>{t.current}: {resultConditionName(current.conditionId)} · {t.seed} {current.seed} · {planName(current.planId)}</p>}
      {state.error && <p role="alert" className="lab-error">{state.error}</p>}
    </section>}
    <section className="lab-section" aria-labelledby="lab-results-title">
      <h2 id="lab-results-title">{t.results}</h2>
      {!state ? <p>{t.noResults}</p> : <>
        <p className="lab-note">{t.snapshot}</p>
        <p data-testid="experiment-input-status" role="status">{inputChanged ? t.inputChanged : t.inputCurrent}</p>
        <div className="lab-filters">
          <label>{t.conditionFilter}<select aria-label={t.conditionFilter} value={conditionFilter} onChange={event => setConditionFilter(event.target.value)}><option value="">{t.all}</option>{batch!.config.conditions.map(item => <option key={item.id} value={item.id}>{resultConditionName(item.id)}</option>)}</select></label>
          <label>{t.candidateFilter}<select aria-label={t.candidateFilter} value={candidateFilter} onChange={event => setCandidateFilter(event.target.value)}><option value="">{t.all}</option>{batch!.config.candidatePlanIds.map(id => <option key={id} value={id}>{planName(id)}</option>)}</select></label>
          <label>{t.statusFilter}<select aria-label={t.statusFilter} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">{t.all}</option>{statuses.map(status => <option key={status} value={status}>{t.statuses[status]}</option>)}</select></label>
        </div>
        <h3>{t.paired}</h3><p>{t.deltas}</p><p className="lab-note">{t.earlyNote}</p><p className="lab-note">{t.p90Note}</p>
        <div className="lab-summary-grid">{visibleGroups.map(group => <article className="lab-summary" data-testid="paired-summary" key={`${group.conditionId}/${group.candidatePlanId}`}>
          <h3>{resultConditionName(group.conditionId)} · {planName(group.candidatePlanId)} − {planName(group.baselinePlanId)}</h3>
          <p className="lab-pairs">{t.valid}: {group.validPairs} / {group.plannedPairs}</p>
          <p className="lab-note">cutoff: {number(group.statisticsUntil)} s</p>
          <dl>
            <dt>{t.completed}</dt><dd>{distribution(group.deltas.completed)}</dd>
            <dt>{t.unfinished}</dt><dd>{distribution(group.deltas.unfinished)}</dd>
            <dt>{t.early}</dt><dd>{distribution(group.deltas.earlyLeaving)}</dd>
            <dt>{t.average}</dt><dd>{distribution(group.deltas.averageWaiting)}</dd>
            <dt>{t.p90}</dt><dd>{distribution(group.deltas.p90Waiting)}</dd>
          </dl>
          <p>{t.completed}: {t.more} {group.completionCounts.more} / {t.same} {group.completionCounts.same} / {t.less} {group.completionCounts.less}</p>
          <p>{t.average}: {t.decreased} {group.waitingCounts.less} / {t.same} {group.waitingCounts.same} / {t.increased} {group.waitingCounts.more} / {t.unavailable} {group.waitingCounts.unavailable}</p>
          <p className="lab-note">{t.pairedWaits}: {group.deltas.averageWaiting.n} / {group.validPairs}</p>
          <p>{t.failureCounts}</p><p className="lab-note">{statuses.map(status => `${t.statuses[status]} ${group.baselineStatusCounts[status]} / ${group.candidateStatusCounts[status]}`).join(' · ')}</p>
          <details><summary>{t.resource}</summary><dl>
            <dt>{t.staff}</dt><dd>{distribution(group.deltas.staffCount)}</dd>
            <dt>{t.devices}</dt><dd>{distribution(group.deltas.deviceCount)}</dd>
            <dt>{t.staffHours}</dt><dd>{distribution(group.deltas.staffHours)}</dd>
            <dt>{t.deviceHours}</dt><dd>{distribution(group.deltas.deviceHours)}</dd>
            <dt>{t.overtime}</dt><dd>{distribution(group.deltas.overtimeSeconds)}</dd>
          </dl><p className="lab-note">{t.costNote}</p></details>
        </article>)}</div>
        <h3>{t.rows}</h3><p>{t.visible}: {visibleRows.length} / {rows.length}</p>
        <div className="lab-table-scroll" tabIndex={0} role="region" aria-label={t.rows}><table>
          <thead><tr>{[t.condition, t.seed, t.plan, t.status, t.completed, t.unfinished, t.early, t.arrived, t.average, t.p90, t.total, t.staff, t.devices, t.cutoff, t.coverage, t.staffHours, t.deviceHours, t.overtime, t.outcomes, t.details].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead>
          <tbody>{visibleRows.map(row => <tr data-testid="result-row" data-status={row.status} data-job-id={row.id} data-seed={row.seed} data-condition={row.conditionId} data-plan={row.planId} key={row.id}>
            <td>{resultConditionName(row.conditionId)}</td><td>{row.seed}</td><td>{planName(row.planId)}</td><td data-status={row.status}>{t.statuses[row.status]}</td>
            <td>{number(row.outcomes?.completed)}</td><td>{number(row.outcomes?.unfinished)}</td><td>{number(row.earlyLeaving)}</td><td>{number(row.arrived)}</td>
            <td>{number(row.averageWaiting)}</td><td>{number(row.p90Waiting)}</td><td>{number(row.totalWaiting)}</td><td>{row.staffCount}</td><td>{row.deviceCount}</td>
            <td>{number(row.statisticsUntil)}</td><td>{number(row.coveredUntil)}</td><td>{number(row.resource?.staffHours)}</td><td>{number(row.resource?.deviceHours)}</td><td>{number(row.resource?.overtimeSeconds)}</td>
            <td>{row.outcomes ? <details><summary>{t.outcomes}</summary><pre>{JSON.stringify(row.outcomes, null, 2)}</pre></details> : '—'}</td>
            <td><details><summary>{t.details} ({row.issues.length})</summary><pre>{JSON.stringify({ batchId: row.batchId, jobId: row.id, modelVersion: row.modelVersion, inputKey: row.inputKey, scenarioKey: row.scenarioKey, basis: row.basis, resource: row.resource, issues: row.issues }, null, 2)}</pre></details></td>
          </tr>)}</tbody>
        </table></div>
        <div className="lab-actions"><button type="button" onClick={() => download(`robustness-${state.status === 'complete' ? 'complete' : 'partial'}-${batch!.batchId}.json`, exportBatch(state))}>{t.export}</button></div>
        <p className="lab-note">{t.exportNote}</p>
        <h3>{t.group}</h3><div className="lab-filters">
          <label>{t.groupSeed}<select aria-label={t.groupSeed} value={groupSeed} onChange={event => setGroupSeed(event.target.value)}>{batch!.config.seeds.map(seed => <option key={seed} value={seed}>{seed}</option>)}</select></label>
          <label>{t.groupCondition}<select aria-label={t.groupCondition} value={groupCondition} onChange={event => setGroupCondition(event.target.value)}>{batch!.config.conditions.map(condition => <option key={condition.id} value={condition.id}>{resultConditionName(condition.id)}</option>)}</select></label>
          <button type="button" onClick={() => download(`robustness-group-${state.status === 'complete' ? 'complete' : 'partial'}-${groupSeed}-${groupCondition}.json`, exportGroup(batch!, Number(groupSeed), groupCondition))}>{t.groupExport}</button>
        </div><p className="lab-note">{t.groupNote}</p>
      </>}
    </section>
  </section>;
}
