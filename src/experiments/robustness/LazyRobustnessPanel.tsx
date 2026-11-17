import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { RobustnessPanel } from './RobustnessPanel';
import { useI18n } from '../../i18n';

let stylesheet: Promise<void> | undefined;

export function LazyRobustnessPanel(props: ComponentProps<typeof RobustnessPanel>) {
  const { t } = useI18n();
  const [Panel, setPanel] = useState<typeof RobustnessPanel>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    if (!stylesheet) stylesheet = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = new URL('./styles.css', import.meta.url).href;
      link.onload = () => resolve();
      link.onerror = () => { link.remove(); stylesheet = undefined; reject(new Error('Analysis stylesheet failed to load.')); };
      document.head.append(link);
    });
    void (async () => {
      try {
        const [module] = await Promise.all([import('./RobustnessPanel'), stylesheet]);
        if (live) setPanel(() => module.RobustnessPanel);
      } catch { if (live) setFailed(true); }
    })();
    return () => { live = false; };
  }, [attempt]);
  if (Panel) return <Panel {...props} />;
  if (failed) return <div role="alert"><p>{t.analysisLoading.failed}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{t.analysisLoading.retry}</button></div>;
  return <p role="status">{t.analysisLoading.loading}</p>;
}
