import { useState, useEffect, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';

export interface OwnerReviewRow {
  id: string;
  businessId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt?: string;
  moderationStatus?: string | null;
  flagCount?: number | null;
}

/**
 * All reviews for a business (owner dashboard — includes hidden / pending).
 */
export function useOwnerBusinessReviews(businessId: string | undefined) {
  const [reviews, setReviews] = useState<OwnerReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await (amplifyDataClient.models as any).Review.list({ authMode: 'userPool' });
      const list = (res.data ?? [])
        .filter((r: any) => r.businessId === businessId)
        .map(
          (r: any): OwnerReviewRow => ({
            id: r.id,
            businessId: r.businessId,
            authorName: r.authorName ?? '',
            rating: typeof r.rating === 'number' ? r.rating : 0,
            text: r.text ?? '',
            createdAt: r.createdAt,
            moderationStatus: r.moderationStatus ?? 'visible',
            flagCount: r.flagCount ?? 0,
          })
        )
        .sort(
          (a: OwnerReviewRow, b: OwnerReviewRow) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );
      setReviews(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const hideReview = useCallback(
    async (reviewId: string) => {
      await amplifyDataClient.mutations.hideReview({ reviewId }, { authMode: 'userPool' });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, moderationStatus: 'hidden_pending_admin' } : r
        )
      );
    },
    []
  );

  return { reviews, loading, error, refetch: fetchReviews, hideReview };
}
