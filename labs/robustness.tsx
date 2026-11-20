import { createRoot } from 'react-dom/client';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import { RobustnessPanel } from '../src/experiments/robustness/RobustnessPanel';
import '../src/app/styles/tokens.css';
import '../src/experiments/robustness/styles.css';

createRoot(document.getElementById('root')!).render(<RobustnessPanel project={projectDocumentSchema.parse(example)} />);
