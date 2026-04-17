import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import {
  withDataAuthModeFallback,
  withDataAuthModeMutation,
} from '@/lib/data-query-auth-fallback';

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId: string | null;
  relatedType: string | null;
  read: boolean;
  createdAt: string;
}

export interface UseAdminNotificationsResult {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => void;
}

/**
 * BE-8.3: Hook for admin notifications.
 * Lists notifications and provides methods to mark them as read.
 */
export function useAdminNotifications(): UseAdminNotificationsResult {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows } = await withDataAuthModeFallback<Record<string, unknown>>(
        'AdminNotification.list',
        (authMode) =>
          (amplifyDataClient.models as any).AdminNotification.list({ authMode })
      );

      const items: AdminNotificationItem[] = (rows ?? [])
        .filter((n: Record<string, unknown>) => String(n.type ?? '') !== 'ADMIN_ACTIVITY')
        .map((n: any): AdminNotificationItem => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          relatedId: n.relatedId ?? null,
          relatedType: n.relatedType ?? null,
          read: n.read ?? false,
          createdAt: n.createdAt,
        }))
        .sort((a: AdminNotificationItem, b: AdminNotificationItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setNotifications(items);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await withDataAuthModeMutation('AdminNotification.update', (authMode) =>
        (amplifyDataClient.models as any).AdminNotification.update(
          { id, read: true },
          { authMode }
        )
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Non-fatal
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.allSettled(
      unread.map((n) =>
        withDataAuthModeMutation('AdminNotification.update', (authMode) =>
          (amplifyDataClient.models as any).AdminNotification.update(
            { id: n.id, read: true },
            { authMode }
          )
        )
      )
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
