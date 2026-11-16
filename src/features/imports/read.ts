import { checkFiles, checkLimit, IMPORT_LIMITS, ImportError, type ImportText } from './limits';

export type ImportFile = Pick<File, 'name' | 'size' | 'text'>;

/** File.text() itself cannot be aborted; cancellation rejects promptly and discards its eventual result. */
export async function readImportFiles(files: readonly ImportFile[], signal: AbortSignal): Promise<ImportText[]> {
  signal.throwIfAborted();
  checkFiles(files);
  const result: ImportText[] = [];
  let totalBytes = 0;
  for (const file of files) {
    signal.throwIfAborted();
    const text = await new Promise<string>((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      Promise.resolve().then(() => { signal.throwIfAborted(); return file.text(); })
        .then(resolve, error => reject(signal.aborted ? signal.reason : new ImportError({
          code: 'read_failed', file: file.name, message: `Could not read ${file.name}: ${error instanceof Error ? error.message : String(error)}`,
        }))).finally(() => signal.removeEventListener('abort', abort));
    });
    signal.throwIfAborted();
    checkLimit('file_bytes', text.length, IMPORT_LIMITS.fileBytes, file.name);
    const bytes = new TextEncoder().encode(text).byteLength;
    checkLimit('file_bytes', bytes, IMPORT_LIMITS.fileBytes, file.name);
    checkLimit('batch_bytes', totalBytes += bytes, IMPORT_LIMITS.batchBytes);
    result.push({ name: file.name, text });
  }
  return result;
}
