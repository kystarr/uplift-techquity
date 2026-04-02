import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { amplifyDataClient } from '@/amplifyDataClient';

export interface MyReviewRow {
  id: string;
  businessId: string;
  rating: number;
  text: string;
  authorName: string;
  createdAt?: string;
  moderationStatus?: string | null;
}

export function useMyReviews() {
  const [reviews, setReviews] = useState<MyReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await getCurrentUser();
      const authorId = u.userId;
      const res = await (amplifyDataClient.models as any).Review.list({ authMode: 'userPool' });
      const mine = (res.data ?? [])
        .filter((r: any) => r.authorId === authorId)
        .map(
          (r: any): MyReviewRow => ({
            id: r.id,
            businessId: r.businessId,
            rating: typeof r.rating === 'number' ? r.rating : 0,
            text: r.text ?? '',
            authorName: r.authorName ?? '',
            createdAt: r.createdAt,
            moderationStatus: r.moderationStatus ?? null,
          })
        )
        .sort(
          (a: MyReviewRow, b: MyReviewRow) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );
      setReviews(mine);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const removeReview = useCallback(
    async (id: string) => {
      await (amplifyDataClient.models as any).Review.delete({ id }, { authMode: 'userPool' });
      setReviews((prev) => prev.filter((r) => r.id !== id));
    },
    []
  );

  const updateReview = useCallback(
    async (id: string, text: string, rating: number) => {
      await (amplifyDataClient.models as any).Review.update(
        { id, text, rating },
        { authMode: 'userPool' }
      );
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, text, rating } : r))
      );
    },
    []
  );

  return { reviews, loading, error, refetch: fetchReviews, removeReview, updateReview };
}
