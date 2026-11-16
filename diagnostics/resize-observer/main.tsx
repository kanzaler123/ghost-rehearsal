import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import '../../src/app/styles.css';
import { Canvas } from '../../src/components/Canvas';
import { I18nProvider } from '../../src/i18n';
import { projectDocumentSchema } from '../../src/schemas';
import { playbackAt } from '../../src/simulation/metrics';
import type { SimulationRun } from '../../src/simulation/types';
import example from '../../examples/open-house.json';

const plan = projectDocumentSchema.parse(example).plans[0];
const view = playbackAt([], plan, 0);
const noop = () => {};
const expanded = new Set<string>();
// Canvas only reads whether run exists; this fixture intentionally omits Worker,
// App, reports, replay, comparison header and timeline from the reproduction.
const run = { request: { plan } } as SimulationRun;
function Reproduction() {
  const [step, setStep] = useState(0);
  const compare = step % 2 === 1;
  return <>
    <button type="button" onClick={() => setStep(value => value + 1)}>Toggle layout</button>
    <output data-step={step}>{compare ? 'Compare geometry' : 'Build geometry'}</output>
    <div style={{ position: 'relative', width: compare ? 1056 : 1156, height: compare ? 334.078125 : 806 }}>
      <Canvas plan={plan} selected="" onSelect={noop} onMove={noop} onConnect={noop} onDelete={noop} onAdd={noop}
        editable={!compare} issues={[]} view={view} run={compare ? run : undefined} time={0} stale={false}
        chooseVisitor={noop} visitorName={id => id} request={{ token: step, target: 'default' }}
        stageView={compare} expanded={expanded} onStage={noop} />
    </div>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><I18nProvider><Reproduction /></I18nProvider></StrictMode>);
