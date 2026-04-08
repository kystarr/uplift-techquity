import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';

export type FlagStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTION_TAKEN' | 'RESOLVED';

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
  targetDetails?: {
    businessId?: string | null;
    businessName?: string | null;
    reviewText?: string | null;
    reviewAuthorName?: string | null;
  } | null;
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
 * Admin flag queue via secure `listFlagsForAdmin` (Lambda + IAM).
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
      const res = await amplifyDataClient.queries.listFlagsForAdmin(
        { status: 'ALL' },
        { authMode: 'userPool' }
      );

      const raw = Array.isArray(res.data) ? res.data : [];
      const items: FlagItem[] = raw
        .map((f: Record<string, unknown>): FlagItem => ({
          id: String(f.id),
          targetType: String(f.targetType),
          targetId: String(f.targetId),
          reason: String(f.reason),
          details: f.details != null ? String(f.details) : null,
          status: f.status as FlagStatus,
          reporterId: String(f.reporterId),
          reporterName: f.reporterName != null ? String(f.reporterName) : null,
          targetName: f.targetName != null ? String(f.targetName) : null,
          resolvedBy: f.resolvedBy != null ? String(f.resolvedBy) : null,
          resolvedAt: f.resolvedAt != null ? String(f.resolvedAt) : null,
          adminNotes: f.adminNotes != null ? String(f.adminNotes) : null,
          createdAt: String(f.createdAt),
          updatedAt: String(f.updatedAt),
          targetDetails: (f.targetDetails as FlagItem['targetDetails']) ?? null,
        }))
        .sort(
          (a: FlagItem, b: FlagItem) =>
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
    RESOLVED: allFlags.filter((f) => f.status === 'RESOLVED').length,
  };

  const flags =
    activeFilter === 'ALL' ? allFlags : allFlags.filter((f) => f.status === activeFilter);

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
