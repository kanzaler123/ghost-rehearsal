export * from '../../src/features/persistence';
export { initialDocument, emptyProject } from '../../src/features/project';
import type { Result } from '../../src/features/persistence';

export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}
