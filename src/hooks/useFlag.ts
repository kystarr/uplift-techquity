import { useState, useCallback } from 'react';
import { amplifyDataClient } from '@/amplifyDataClient';
import { getCurrentUser } from 'aws-amplify/auth';

export type FlagReason = 'SPAM' | 'INAPPROPRIATE' | 'MISLEADING' | 'FAKE' | 'OTHER';
export type FlagTargetType = 'REVIEW' | 'BUSINESS';

interface SubmitFlagParams {
  targetType: FlagTargetType;
  targetId: string;
  reason: FlagReason;
  details?: string;
  targetName?: string;
}

export interface UseFlagResult {
  submitFlag: (params: SubmitFlagParams) => Promise<void>;
  submitting: boolean;
  error: Error | null;
}

/**
 * BE-8.2: Hook for submitting content flags.
 * Creates a Flag record and increments flagCount on the target.
 */
export function useFlag(): UseFlagResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitFlag = useCallback(async (params: SubmitFlagParams) => {
    setSubmitting(true);
    setError(null);
    try {
      const cognitoUser = await getCurrentUser();

      await (amplifyDataClient.models as any).Flag.create(
        {
          targetType: params.targetType,
          targetId: params.targetId,
          reason: params.reason,
          details: params.details ?? null,
          status: 'PENDING',
          reporterId: cognitoUser.userId,
          reporterName: cognitoUser.username,
          targetName: params.targetName ?? null,
        },
        { authMode: 'userPool' }
      );

      // Increment flagCount on the target record
      if (params.targetType === 'REVIEW') {
        try {
          const res = await (amplifyDataClient.models as any).Review.get(
            { id: params.targetId },
            { authMode: 'userPool' }
          );
          if (res.data) {
            await (amplifyDataClient.models as any).Review.update(
              {
                id: params.targetId,
                flagCount: (res.data.flagCount ?? 0) + 1,
                moderationStatus: 'hidden_pending_admin',
              },
              { authMode: 'userPool' }
            );
          }
        } catch {
          // Non-fatal: flag was created even if count update fails
        }
      } else if (params.targetType === 'BUSINESS') {
        try {
          const res = await (amplifyDataClient.models as any).Business.get(
            { id: params.targetId },
            { authMode: 'userPool' }
          );
          if (res.data) {
            await (amplifyDataClient.models as any).Business.update(
              { id: params.targetId, flagCount: (res.data.flagCount ?? 0) + 1 },
              { authMode: 'userPool' }
            );
          }
        } catch {
          // Non-fatal
        }
      }

      // Create an admin notification for this flag
      try {
        await (amplifyDataClient.models as any).AdminNotification.create(
          {
            type: 'FLAG_CREATED',
            title: `New ${params.targetType.toLowerCase()} flag`,
            message: `A ${params.targetType.toLowerCase()} was flagged for: ${params.reason}${params.details ? ` — ${params.details}` : ''}`,
            relatedId: params.targetId,
            relatedType: 'FLAG',
            read: false,
          },
          { authMode: 'userPool' }
        );
      } catch {
        // Non-fatal
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Failed to submit flag');
      setError(err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitFlag, submitting, error };
}
