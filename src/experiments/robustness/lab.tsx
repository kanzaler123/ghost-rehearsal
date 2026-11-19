import { createRoot } from 'react-dom/client';
import example from '../../../examples/open-house.json';
import { projectDocumentSchema } from '../../schemas';
import { RobustnessPanel } from './RobustnessPanel';
import '../../app/styles/tokens.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(<RobustnessPanel project={projectDocumentSchema.parse(example)} />);
