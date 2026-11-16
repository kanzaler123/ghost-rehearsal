import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { RobustnessPanel } from './RobustnessPanel';
import { useI18n } from '../../i18n';

export function LazyRobustnessPanel(props: ComponentProps<typeof RobustnessPanel>) {
  const { t } = useI18n();
  const [Panel, setPanel] = useState<typeof RobustnessPanel>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    void import('./RobustnessPanel').then(module => { if (live) setPanel(() => module.RobustnessPanel); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [attempt]);
  if (Panel) return <Panel {...props} />;
  if (failed) return <div role="alert"><p>{t.analysisLoading.failed}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{t.analysisLoading.retry}</button></div>;
  return <p role="status">{t.analysisLoading.loading}</p>;
}
