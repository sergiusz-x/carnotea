import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { authClient } from '@/lib/auth-client';

// ─── Export mutation ───────────────────────────────────────────────────────────

/**
 * Triggers a data export download.
 * Uses native fetch so we can handle the binary response as a Blob and
 * programmatically click a temporary anchor — the typed API client only
 * handles JSON bodies.
 */
export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/me/export', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status.toString()}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'carnotea-export.json';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
  });
}

// ─── Delete mutation ───────────────────────────────────────────────────────────

/**
 * Permanently deletes the account.
 * On success: signs out via better-auth and navigates to /login.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (confirmation: string) => {
      const response = await fetch('/api/me', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? 'Delete failed');
      }
    },
    onSuccess: async () => {
      await authClient.signOut();
      queryClient.clear();
      await navigate({ to: '/login' });
    },
  });
}
