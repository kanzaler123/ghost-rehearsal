import type { Page } from '@playwright/test';

export async function storedProject(page: Page, kind: 'saved' | 'draft') {
  return page.evaluate(async kind => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('ghost-rehearsal.persistence.v2', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(['revisions', 'settings'], 'readonly');
        const rows = tx.objectStore('revisions').getAll();
        const pointer = tx.objectStore('settings').get('savedRevisionId');
        tx.oncomplete = () => {
          const revisions = rows.result as { id: string; kind: string; raw: string; createdAt: number }[];
          resolve((kind === 'saved' ? revisions.find(item => item.id === pointer.result)
            : revisions.filter(item => item.kind === kind).sort((a, b) => b.createdAt - a.createdAt)[0])?.raw ?? null);
        };
        tx.onabort = () => reject(tx.error);
      });
    } finally { db.close(); }
  }, kind);
}
