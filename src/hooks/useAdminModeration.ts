import { useState, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCurrentUser } from 'aws-amplify/auth';

export interface UseAdminModerationResult {
  resolveFlag: (params: ResolveFlagParams) => Promise<void>;
  removeReview: (reviewId: string, businessId: string) => Promise<void>;
  updateBusinessStatus: (businessId: string, status: string) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

interface ResolveFlagParams {
  flagId: string;
  resolution: 'DISMISSED' | 'ACTION_TAKEN' | 'REVIEWED';
  adminNotes?: string;
}

/**
 * BE-8.4: Admin moderation actions.
 * Provides methods to resolve flags, remove flagged reviews,
 * and update business verification status.
 */
export function useAdminModeration(): UseAdminModerationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const resolveFlag = useCallback(async ({ flagId, resolution, adminNotes }: ResolveFlagParams) => {
    setLoading(true);
    setError(null);
    try {
      const admin = await getCurrentUser();

      await (amplifyDataClient.models as any).Flag.update(
        {
          id: flagId,
          status: resolution,
          resolvedBy: admin.userId,
          resolvedAt: new Date().toISOString(),
          adminNotes: adminNotes ?? null,
        },
        { authMode: 'userPool' }
      );

      await createNotification(
        'FLAG_RESOLVED',
        `Flag ${resolution.toLowerCase().replace('_', ' ')}`,
        `An admin resolved a flag as: ${resolution}`,
        flagId,
        'FLAG'
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to resolve flag');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeReview = useCallback(async (reviewId: string, businessId: string) => {
    setLoading(true);
    setError(null);
    try {
      await (amplifyDataClient.models as any).Review.delete(
        { id: reviewId },
        { authMode: 'userPool' }
      );

      // Recalculate business stats after review removal
      try {
        const reviewsRes = await (amplifyDataClient.models as any).Review.list({
          authMode: 'userPool',
        });
        const remaining = (reviewsRes.data ?? []).filter(
          (r: any) => r.businessId === businessId
        );
        const newCount = remaining.length;
        const newAverage = newCount > 0
          ? remaining.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / newCount
          : 0;

        await (amplifyDataClient.models as any).Business.update(
          {
            id: businessId,
            averageRating: Math.round(newAverage * 10) / 10,
            reviewCount: newCount,
          },
          { authMode: 'userPool' }
        );
      } catch {
        // Non-fatal: review was deleted even if stats update fails
      }

      await createNotification(
        'REVIEW_REMOVED',
        'Review removed by admin',
        `A flagged review was removed from business ${businessId}`,
        reviewId,
        'REVIEW'
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to remove review');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBusinessStatus = useCallback(async (businessId: string, status: string) => {
    setLoading(true);
    setError(null);
    try {
      const updatePayload: Record<string, any> = {
        id: businessId,
        verificationStatus: status,
      };

      if (status === 'APPROVED') {
        updatePayload.verified = true;
      } else if (status === 'REJECTED') {
        updatePayload.verified = false;
      }

      await (amplifyDataClient.models as any).Business.update(
        updatePayload,
        { authMode: 'userPool' }
      );

      const notifType = status === 'REJECTED' ? 'BUSINESS_SUSPENDED' : 'FLAG_RESOLVED';
      await createNotification(
        notifType,
        `Business ${status.toLowerCase()}`,
        `Business ${businessId} verification status changed to ${status}`,
        businessId,
        'BUSINESS'
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to update business status');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolveFlag, removeReview, updateBusinessStatus, loading, error };
}

async function createNotification(
  type: string,
  title: string,
  message: string,
  relatedId: string,
  relatedType: string
) {
  try {
    await (amplifyDataClient.models as any).AdminNotification.create(
      { type, title, message, relatedId, relatedType, read: false },
      { authMode: 'userPool' }
    );
  } catch {
    // Non-fatal
  }
}
