import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './styles.css';
import { App } from './App';
import { I18nProvider } from '../i18n';

createRoot(document.getElementById('root')!).render(<StrictMode><I18nProvider><App /></I18nProvider></StrictMode>);
