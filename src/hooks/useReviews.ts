import { useState, useEffect, useCallback } from 'react';
import { amplifyList } from '@/lib/amplify-helpers';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCurrentUser } from 'aws-amplify/auth';
import type { ReviewPreviewItem } from '@/components/business-profile/ReviewsPreview';

export interface UseReviewsResult {
  reviews: ReviewPreviewItem[];
  loading: boolean;
  submitting: boolean;
  error: Error | null;
  submitReview: (params: { businessId: string; rating: number; text: string; authorName?: string }) => Promise<void>;
  refetch: () => void;
}

/**
 * Fetches all reviews for a business and exposes a submitReview function.
 *
 * submitReview:
 *   1. Creates a Review record owned by the current user.
 *   2. Re-fetches all reviews for the business.
 *   3. Recalculates averageRating and reviewCount on the Business record.
 */
export function useReviews(businessId: string | undefined): UseReviewsResult {
  const [reviews, setReviews] = useState<ReviewPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await amplifyList('Review');

      const forBusiness = data
        .filter((r: any) => r.businessId === businessId)
        .map((r: any): ReviewPreviewItem => ({
          id: r.id,
          authorName: r.authorName,
          rating: typeof r.rating === 'number' ? r.rating : 0,
          text: r.text ?? '',
          date: r.createdAt
            ? new Date(r.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '',
        }))
        .sort((a: any, b: any) => (b.date > a.date ? 1 : -1));

      setReviews(forBusiness);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const submitReview = useCallback(
    async ({ businessId: bid, rating, text, authorName: suppliedName }: { businessId: string; rating: number; text: string; authorName?: string }) => {
      setSubmitting(true);
      try {
        const cognitoUser = await getCurrentUser();
        const authorName = suppliedName ?? cognitoUser.username;
        const authorId = cognitoUser.userId;

        await (amplifyDataClient.models as any).Review.create(
          { businessId: bid, authorId, authorName, rating, text },
          { authMode: 'userPool' }
        );

        const allData = await amplifyList('Review');
        const businessReviews = allData.filter((r: any) => r.businessId === bid);
        const newCount = businessReviews.length;
        const newAverage =
          newCount > 0
            ? businessReviews.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / newCount
            : 0;

        // Update the Business record with recalculated stats
        try {
          // Get the current business to obtain its id
          const bizRes = await (amplifyDataClient.models as any).Business.get(
            { id: bid },
            { authMode: 'userPool' }
          );
          if (bizRes.data) {
            await (amplifyDataClient.models as any).Business.update(
              { id: bid, averageRating: Math.round(newAverage * 10) / 10, reviewCount: newCount },
              { authMode: 'userPool' }
            );
          }
        } catch {
          // Non-fatal: stats update failed but review was created
        }

        await fetchReviews();
      } finally {
        setSubmitting(false);
      }
    },
    [fetchReviews]
  );

  return { reviews, loading, submitting, error, submitReview, refetch: fetchReviews };
}
