import { amplifyDataClient } from '@/amplifyDataClient';

type AuthMode = 'userPool' | 'iam' | 'apiKey';

const AUTH_MODE_PRIORITY: readonly AuthMode[] = ['userPool', 'iam', 'apiKey'] as const;

interface AmplifyResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

/**
 * Attempts an Amplify Data operation across auth modes in priority order
 * (userPool → iam → apiKey). Returns the first successful result.
 *
 * This eliminates the duplicated try-each-auth-mode loop that was
 * previously copy-pasted across useBusinessSearch, useBusinessProfile,
 * and useReviews.
 */
async function withAuthFallback<T>(
  operation: (authMode: AuthMode) => Promise<AmplifyResponse<T>>,
): Promise<T> {
  let lastError: unknown;

  for (const authMode of AUTH_MODE_PRIORITY) {
    try {
      const res = await operation(authMode);

      if (res.errors && res.errors.length > 0) {
        throw new Error(res.errors.map((e) => e.message).join(', '));
      }

      return res.data;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError ?? new Error('All auth modes failed');
}

/**
 * Lists all records for a given model, trying each auth mode in order.
 */
export async function amplifyList<T = any>(
  modelName: keyof typeof amplifyDataClient.models,
): Promise<T[]> {
  const model = amplifyDataClient.models[modelName] as any;
  const data = await withAuthFallback<T[]>((authMode) => model.list({ authMode }));
  return data ?? [];
}

/**
 * Gets a single record by ID, trying each auth mode in order.
 */
export async function amplifyGet<T = any>(
  modelName: keyof typeof amplifyDataClient.models,
  id: string,
): Promise<T | null> {
  const model = amplifyDataClient.models[modelName] as any;
  return withAuthFallback<T | null>((authMode) => model.get({ id }, { authMode }));
}
