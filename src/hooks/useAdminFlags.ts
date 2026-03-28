import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';

export type FlagStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTION_TAKEN';

export interface FlagItem {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: FlagStatus;
  reporterId: string;
  reporterName: string | null;
  targetName: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseAdminFlagsResult {
  flags: FlagItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  filterByStatus: (status: FlagStatus | 'ALL') => void;
  activeFilter: FlagStatus | 'ALL';
  counts: Record<FlagStatus | 'ALL', number>;
}

/**
 * BE-8.2: Hook for admin flag management.
 * Lists all flags with client-side filtering by status.
 */
export function useAdminFlags(): UseAdminFlagsResult {
  const [allFlags, setAllFlags] = useState<FlagItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FlagStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await (amplifyDataClient.models as any).Flag.list({
        authMode: 'userPool',
      });

      const items: FlagItem[] = (res.data ?? [])
        .map((f: any): FlagItem => ({
          id: f.id,
          targetType: f.targetType,
          targetId: f.targetId,
          reason: f.reason,
          details: f.details ?? null,
          status: f.status as FlagStatus,
          reporterId: f.reporterId,
          reporterName: f.reporterName ?? null,
          targetName: f.targetName ?? null,
          resolvedBy: f.resolvedBy ?? null,
          resolvedAt: f.resolvedAt ?? null,
          adminNotes: f.adminNotes ?? null,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        }))
        .sort((a: FlagItem, b: FlagItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setAllFlags(items);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load flags'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const counts: Record<FlagStatus | 'ALL', number> = {
    ALL: allFlags.length,
    PENDING: allFlags.filter((f) => f.status === 'PENDING').length,
    REVIEWED: allFlags.filter((f) => f.status === 'REVIEWED').length,
    DISMISSED: allFlags.filter((f) => f.status === 'DISMISSED').length,
    ACTION_TAKEN: allFlags.filter((f) => f.status === 'ACTION_TAKEN').length,
  };

  const flags = activeFilter === 'ALL'
    ? allFlags
    : allFlags.filter((f) => f.status === activeFilter);

  return {
    flags,
    loading,
    error,
    refetch: fetchFlags,
    filterByStatus: setActiveFilter,
    activeFilter,
    counts,
  };
}
