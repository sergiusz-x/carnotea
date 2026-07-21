import { queryClient } from '@/lib/queryClient';

import { getMutationQueue, removeMutationFromQueue } from './mutation-queue';

export async function replayMutations() {
  if (!navigator.onLine) return;

  const queue = await getMutationQueue();
  if (queue.length === 0) return;

  for (const mutation of queue) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.body ? { 'Content-Type': 'application/json' } : undefined,
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      // Remove from queue if it succeeded or if it failed with a client error (e.g. 400 Bad Request, 409 Conflict)
      // This prevents a bad mutation from blocking the queue forever.
      // Conflicts (409) will be dropped, acting as a simple last-write-wins (server wins) resolution.
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        await removeMutationFromQueue(mutation.id);
      } else {
        // 5xx error, might be temporary, stop queue
        break;
      }
    } catch (_err) {
      // Network error (still offline or connection dropped), stop replaying for now
      break;
    }
  }

  // Invalidate queries so the UI reflects the synced state
  await queryClient.invalidateQueries();
}

export function registerSyncRunner() {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      void replayMutations();
    });
    // Also try on load
    void replayMutations();
  }
}
