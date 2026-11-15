import { useId, useState } from 'react';
import type { Plan, RunRequest } from '../schemas';
import { useI18n } from '../i18n';
import { Modal } from './Dialogs';

export function ComparisonPlanPicker({ plans, left, right, scope, guided, onClose, onCompare }: {
  plans: Plan[]; left: string; right: string; scope: RunRequest['runMode']; guided: boolean;
  onClose: () => void; onCompare: (left: string, right: string, scope: RunRequest['runMode']) => void;
}) {
  const { t } = useI18n();
  const [a, setA] = useState(left), [b, setB] = useState(right);
  const [runScope, setRunScope] = useState(scope);
  const errorId = useId();
  const valid = a !== b && plans.some(plan => plan.id === a) && plans.some(plan => plan.id === b);
  return <Modal title={t.comparePicker.title} onClose={onClose}>
    <form onSubmit={event => { event.preventDefault(); if (valid) onCompare(a, b, runScope); }}>
      <div className="modal-body">
        <p className="dialog-description">{t.comparePicker.hint}</p>
        {guided && <p className="notice">{t.comparePicker.leaveGuide}</p>}
        <label className="field"><span>{t.comparePicker.left}</span><select aria-label={t.comparePicker.left} value={a} onChange={event => setA(event.target.value)} aria-invalid={!valid} aria-describedby={!valid ? errorId : undefined}>
          {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </select></label>
        <label className="field"><span>{t.comparePicker.right}</span><select aria-label={t.comparePicker.right} value={b} onChange={event => setB(event.target.value)} aria-invalid={!valid} aria-describedby={!valid ? errorId : undefined}>
          {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </select></label>
        {!valid && <p id={errorId} role="alert" className="form-error">{t.comparePicker.distinct}</p>}
        <label className="field"><span>{t.run.scope}</span><select aria-label={t.run.scope} value={runScope} onChange={event => setRunScope(event.target.value as RunRequest['runMode'])}>
          <option value="cutoff">{t.run.cutoff}</option><option value="run_to_completion">{t.run.completion}</option>
        </select></label>
      </div>
      <div className="modal-footer"><button type="button" className="btn ghost" onClick={onClose}>{t.common.cancel}</button><button type="submit" className="btn primary" disabled={!valid}>{t.comparePicker.apply}</button></div>
    </form>
  </Modal>;
}
