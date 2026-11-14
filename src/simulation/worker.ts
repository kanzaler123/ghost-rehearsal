import { simulate } from './engine';
import type { RunRequest } from '../schemas';

addEventListener('message', (event: MessageEvent<{ requests: RunRequest[] }>) => {
  try { postMessage({ runs: event.data.requests.map(request => simulate(request)) }); }
  catch (error) { postMessage({ error: error instanceof Error ? error.message : '预演未能完成' }); }
});
