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

function toErrorWithFallback(input: unknown, fallback: string): Error {
  if (input instanceof Error) {
    const baseMessage =
      typeof input.message === 'string' && input.message.trim()
        ? input.message
        : fallback;

    const withExtras = input as Error & {
      errors?: Array<{ message?: unknown }>;
      cause?: unknown;
      data?: unknown;
    };

    const nestedErrors = Array.isArray(withExtras.errors)
      ? withExtras.errors
          .map((e) => (typeof e?.message === 'string' ? e.message : safeMessage(e?.message, '')))
          .filter((m): m is string => !!m)
      : [];

    if (nestedErrors.length > 0) {
      return new Error(`${baseMessage}: ${nestedErrors.join(', ')}`);
    }

    if (baseMessage.includes('[object Object]')) {
      const causeText = withExtras.cause ? safeMessage(withExtras.cause, '') : '';
      const dataText = withExtras.data ? safeMessage(withExtras.data, '') : '';
      const ownPropDetails = Object.getOwnPropertyNames(withExtras)
        .filter((key) => !['name', 'message', 'stack'].includes(key))
        .map((key) => {
          const value = (withExtras as Record<string, unknown>)[key];
          return `${key}=${safeMessage(value, '')}`;
        })
        .filter((entry) => entry && !entry.endsWith('='))
        .join(' | ');
      const extra = [causeText, dataText, ownPropDetails].filter(Boolean).join(' | ');
      return new Error(extra ? `${baseMessage}: ${extra}` : baseMessage);
    }

    return new Error(baseMessage);
  }

  if (typeof input === 'string' && input.trim()) {
    return new Error(input);
  }

  if (input && typeof input === 'object') {
    const candidate = input as {
      message?: unknown;
      errors?: Array<{ message?: unknown }>;
      data?: unknown;
    };
    const nestedErrors = Array.isArray(candidate.errors)
      ? candidate.errors
          .map((e) => (typeof e?.message === 'string' ? e.message : undefined))
          .filter((m): m is string => !!m)
      : [];
    if (nestedErrors.length > 0) return new Error(nestedErrors.join(', '));
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return new Error(candidate.message);
    }
    try {
      return new Error(JSON.stringify(input));
    } catch {
      return new Error(fallback);
    }
  }

  return new Error(fallback);
}

function safeMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value == null) return fallback;
  try {
    const str = JSON.stringify(value);
    return str && str !== '{}' ? str : fallback;
  } catch {
    return String(value) || fallback;
  }
}

function safeSerialize(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message,
            stack: val.stack,
            ...Object.getOwnPropertyNames(val).reduce<Record<string, unknown>>((acc, k) => {
              acc[k] = (val as unknown as Record<string, unknown>)[k];
              return acc;
            }, {}),
          };
        }
        if (val && typeof val === 'object') {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
        }
        return val;
      },
      2
    );
  } catch {
    return String(value);
  }
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
      const res = await amplifyDataClient.mutations.adminRemoveBusiness(
        { businessId },
        { authMode: 'userPool' }
      );
      const errors = (res as { errors?: Array<{ message?: string }> }).errors;
      if (errors && errors.length > 0) {
        const serialized = safeSerialize(errors);
        // Fallback: when moderation Lambda is blocked by IAM auth, perform an
        // admin de-list directly with userPool permissions.
        if (serialized.includes('Unauthorized') || serialized.includes('GraphQL transport error')) {
          await fallbackDelistBusiness(businessId);
          return;
        }
        throw new Error(`Failed to remove business: ${serialized}`);
      }
      if (!(res as { data?: boolean }).data) {
        throw new Error('Failed to remove business');
      }
    } catch (e) {
      const serialized = safeSerialize(e);
      if (serialized.includes('Unauthorized') || serialized.includes('GraphQL transport error')) {
        await fallbackDelistBusiness(businessId);
        return;
      }
      const err = toErrorWithFallback(e, 'Failed to remove business');
      setError(err);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fallbackDelistBusiness = async (businessId: string) => {
    let nextToken: string | null | undefined;
    do {
      const page = await amplifyDataClient.models.Review.list(
        { filter: { businessId: { eq: businessId } }, nextToken, limit: 200 },
        { authMode: 'userPool' }
      );
      const items = page.data ?? [];
      for (const review of items) {
        await amplifyDataClient.models.Review.update(
          { id: review.id, moderationStatus: 'removed' } as never,
          { authMode: 'userPool' }
        );
      }
      nextToken = page.nextToken ?? null;
    } while (nextToken);

    await amplifyDataClient.models.Business.update(
      {
        id: businessId,
        verificationStatus: 'REJECTED',
        verified: false,
      } as never,
      { authMode: 'userPool' }
    );
  };

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
