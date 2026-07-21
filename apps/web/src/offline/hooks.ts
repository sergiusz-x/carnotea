import { useState, useEffect } from 'react';
import { getMutationQueue, type QueuedMutation } from './mutation-queue';

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

export function useSyncQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);

  useEffect(() => {
    let mounted = true;

    const checkQueue = async () => {
      const q = await getMutationQueue();
      if (mounted) setQueue(q);
    };

    void checkQueue();

    const intervalId = window.setInterval(() => {
      void checkQueue();
    }, 2000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return queue;
}
