import { parseImport, type ImportOptions } from './parser';
import type { ImportText } from './limits';

addEventListener('message', (event: MessageEvent<{ requestId: number; files: ImportText[]; options: ImportOptions }>) => {
  const { requestId, files, options } = event.data;
  postMessage({ requestId, result: parseImport(files, options) });
});
