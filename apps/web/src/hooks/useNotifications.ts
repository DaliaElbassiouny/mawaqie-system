'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';

export type Notification = {
  id: string;
  title: string;
  body?: string | null;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_RESULT';
  isRead: boolean;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
  createdAt: string;
};

export function useNotifications(params?: { unreadOnly?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const res = await notificationsApi.list(params as Record<string, unknown>);
      return res.data.data as {
        items: Notification[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
      };
    },
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await notificationsApi.getUnreadCount();
      return (res.data.data as { count: number }).count;
    },
    refetchInterval: 30000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
