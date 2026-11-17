import { createRoot } from 'react-dom/client';
import example from '../../../examples/open-house.json';
import { projectDocumentSchema } from '../../schemas';
import { RobustnessPanel } from './RobustnessPanel';
import './styles.css';

createRoot(document.getElementById('root')!).render(<RobustnessPanel project={projectDocumentSchema.parse(example)} />);
