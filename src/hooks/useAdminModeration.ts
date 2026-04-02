import { useState, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCurrentUser } from 'aws-amplify/auth';

export interface UseAdminModerationResult {
  resolveFlag: (params: ResolveFlagParams) => Promise<void>;
  removeReview: (reviewId: string, businessId: string) => Promise<void>;
  updateBusinessStatus: (businessId: string, status: string) => Promise<void>;
  adminResolveHiddenReview: (reviewId: string, decision: 'APPROVE_HIDE' | 'RESTORE') => Promise<void>;
  adminRemoveBusiness: (businessId: string) => Promise<void>;
  adminRemoveUser: (userId: string) => Promise<void>;
  adminResolveBusinessVerification: (
    businessId: string,
    decision: 'APPROVE' | 'REJECT',
    adminNotes?: string
  ) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

interface ResolveFlagParams {
  flagId: string;
  adminNotes?: string;
}

/**
 * Admin moderation: prefer secure GraphQL mutations backed by the moderation Lambda where available.
 */
export function useAdminModeration(): UseAdminModerationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const resolveFlag = useCallback(async ({ flagId, adminNotes }: ResolveFlagParams) => {
    setLoading(true);
    setError(null);
    try {
      await amplifyDataClient.mutations.resolveFlag(
        { flagId, adminNotes: adminNotes ?? undefined },
        { authMode: 'userPool' }
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to resolve flag');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeReview = useCallback(async (reviewId: string, _businessId: string) => {
    setLoading(true);
    setError(null);
    try {
      await amplifyDataClient.mutations.adminRemoveReview(
        { reviewId },
        { authMode: 'userPool' }
      );

      await amplifyDataClient.models.AdminNotification.create(
        {
          type: 'REVIEW_REMOVED',
          title: 'Review removed by admin',
          message: `Review ${reviewId} was removed.`,
          relatedId: reviewId,
          relatedType: 'REVIEW',
          read: false,
        },
        { authMode: 'userPool' }
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
      const updatePayload: Record<string, unknown> = {
        id: businessId,
        verificationStatus: status,
      };

      if (status === 'APPROVED') {
        updatePayload.verified = true;
      } else if (status === 'REJECTED') {
        updatePayload.verified = false;
      }

      await amplifyDataClient.models.Business.update(updatePayload as never, {
        authMode: 'userPool',
      });

      const notifType = status === 'REJECTED' ? 'BUSINESS_SUSPENDED' : 'FLAG_RESOLVED';
      await amplifyDataClient.models.AdminNotification.create(
        {
          type: notifType,
          title: `Business ${status.toLowerCase()}`,
          message: `Business ${businessId} verification status changed to ${status}`,
          relatedId: businessId,
          relatedType: 'BUSINESS',
          read: false,
        },
        { authMode: 'userPool' }
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to update business status');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const adminResolveHiddenReview = useCallback(
    async (reviewId: string, decision: 'APPROVE_HIDE' | 'RESTORE') => {
      setLoading(true);
      setError(null);
      try {
        await amplifyDataClient.mutations.adminResolveHiddenReview(
          { reviewId, decision },
          { authMode: 'userPool' }
        );
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Failed to resolve hidden review');
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const adminRemoveBusiness = useCallback(async (businessId: string) => {
    setLoading(true);
    setError(null);
    try {
      await amplifyDataClient.mutations.adminRemoveBusiness(
        { businessId },
        { authMode: 'userPool' }
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to remove business');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const adminRemoveUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await amplifyDataClient.mutations.adminRemoveUser({ userId }, { authMode: 'userPool' });
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to remove user');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const adminResolveBusinessVerification = useCallback(
    async (businessId: string, decision: 'APPROVE' | 'REJECT', adminNotes?: string) => {
      setLoading(true);
      setError(null);
      try {
        await amplifyDataClient.mutations.adminResolveBusinessVerification(
          { businessId, decision, adminNotes: adminNotes ?? undefined },
          { authMode: 'userPool' }
        );
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Failed to resolve verification');
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    resolveFlag,
    removeReview,
    updateBusinessStatus,
    adminResolveHiddenReview,
    adminRemoveBusiness,
    adminRemoveUser,
    adminResolveBusinessVerification,
    loading,
    error,
  };
}
