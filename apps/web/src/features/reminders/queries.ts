import {
  type ReminderCreate,
  type ReminderUpdate,
  REMINDER_STATUS_CODES,
  type ReminderStatusCode,
} from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const reminderKeys = {
  all: (vehicleId: string) => ['vehicles', vehicleId, 'reminders'] as const,
  filtered: (vehicleId: string, status?: string) =>
    ['vehicles', vehicleId, 'reminders', { status }] as const,
  detail: (vehicleId: string, id: string) => ['vehicles', vehicleId, 'reminders', id] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchReminders(vehicleId: string, status?: string) {
  const searchParams =
    status && status !== 'all' && REMINDER_STATUS_CODES.includes(status as ReminderStatusCode)
      ? `?status=${encodeURIComponent(status)}`
      : '';

  const { data } = await apiClient.GET(
    `/api/vehicles/{vehicleId}/reminders${searchParams}` as '/api/vehicles/{vehicleId}/reminders',
    { vehicleId },
  );
  return data;
}

async function fetchReminder(vehicleId: string, id: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/reminders/{id}', {
    vehicleId,
    id,
  });
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const remindersQueryOptions = (vehicleId: string, status?: string) =>
  queryOptions({
    queryKey: reminderKeys.filtered(vehicleId, status),
    queryFn: () => fetchReminders(vehicleId, status),
  });

export const reminderQueryOptions = (vehicleId: string, id: string) =>
  queryOptions({
    queryKey: reminderKeys.detail(vehicleId, id),
    queryFn: () => fetchReminder(vehicleId, id),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateReminder(vehicleId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ReminderCreate) =>
      apiClient.POST('/api/vehicles/{vehicleId}/reminders', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reminderKeys.all(vehicleId),
      });
      // Also invalidate dashboard upcoming-reminders (T-040)
      await queryClient.invalidateQueries({
        queryKey: ['analytics', vehicleId, 'upcoming-reminders'],
      });
      await navigate({
        to: '/vehicles/$vehicleId/reminders',
        params: { vehicleId },
      });
    },
  });
}

export function useUpdateReminder(vehicleId: string, reminderId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ReminderUpdate) =>
      apiClient.PATCH('/api/vehicles/{vehicleId}/reminders/{id}', body, {
        vehicleId,
        id: reminderId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reminderKeys.detail(vehicleId, reminderId),
      });
      await queryClient.invalidateQueries({
        queryKey: reminderKeys.all(vehicleId),
      });
      // Also invalidate dashboard upcoming-reminders (T-040)
      await queryClient.invalidateQueries({
        queryKey: ['analytics', vehicleId, 'upcoming-reminders'],
      });
      await navigate({
        to: '/vehicles/$vehicleId/reminders',
        params: { vehicleId },
      });
    },
  });
}

export function useDeleteReminder(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/reminders/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reminderKeys.all(vehicleId),
      });
      // Also invalidate dashboard upcoming-reminders (T-040)
      await queryClient.invalidateQueries({
        queryKey: ['analytics', vehicleId, 'upcoming-reminders'],
      });
    },
  });
}

export function useMarkReminderDone(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.PATCH(
        '/api/vehicles/{vehicleId}/reminders/{id}',
        { status: 'done' },
        { vehicleId, id },
      ),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({
        queryKey: reminderKeys.detail(vehicleId, id),
      });
      await queryClient.invalidateQueries({
        queryKey: reminderKeys.all(vehicleId),
      });
      // Also invalidate dashboard upcoming-reminders (T-040)
      await queryClient.invalidateQueries({
        queryKey: ['analytics', vehicleId, 'upcoming-reminders'],
      });
    },
  });
}
