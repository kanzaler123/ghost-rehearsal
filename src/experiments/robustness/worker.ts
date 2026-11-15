import { runBatch } from './runner';
import type { PreparedBatch, Job, JobSummary } from './types';

export type WorkerMessage =
  | { type: 'started'; batchId: string; job: Job }
  | { type: 'summary'; batchId: string; row: JobSummary }
  | { type: 'complete'; batchId: string }
  | { type: 'error'; batchId: string; message: string };

addEventListener('message', (event: MessageEvent<PreparedBatch>) => {
  const batch = event.data;
  const send = (message: WorkerMessage) => postMessage(message);
  try {
    runBatch(batch,
      job => send({ type: 'started', batchId: batch.batchId, job }),
      row => send({ type: 'summary', batchId: batch.batchId, row }));
    send({ type: 'complete', batchId: batch.batchId });
  } catch (error) {
    send({ type: 'error', batchId: batch.batchId, message: error instanceof Error ? error.message : String(error) });
  }
});
