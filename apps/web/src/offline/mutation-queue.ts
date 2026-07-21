import { get, set } from 'idb-keyval';

export type QueuedMutation = {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  timestamp: number;
};

const QUEUE_KEY = 'carnotea-mutation-queue';

export async function enqueueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
  const currentQueue = (await get<QueuedMutation[]>(QUEUE_KEY)) || [];
  const queued: QueuedMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  await set(QUEUE_KEY, [...currentQueue, queued]);
  return queued;
}

export async function getMutationQueue(): Promise<QueuedMutation[]> {
  return (await get<QueuedMutation[]>(QUEUE_KEY)) || [];
}

export async function clearMutationQueue() {
  await set(QUEUE_KEY, []);
}

export async function removeMutationFromQueue(id: string) {
  const queue = await getMutationQueue();
  await set(
    QUEUE_KEY,
    queue.filter((m) => m.id !== id),
  );
}
