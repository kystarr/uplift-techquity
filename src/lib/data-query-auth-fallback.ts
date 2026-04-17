import { fetchAuthSession } from "aws-amplify/auth";

const AUTH_MODES = ["userPool", "identityPool", "iam"] as const;

export type DataClientAuthMode = (typeof AUTH_MODES)[number];

export function parseCustomQueryArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)) {
    return (raw as { items: T[] }).items;
  }
  return [];
}

/** AppSync often returns errors in the payload; the Amplify client may also throw with this text. */
function responseLooksLikeAuthFailure(res: {
  errors?: readonly { message?: string }[];
}): boolean {
  return Boolean(
    res.errors?.some((e) => /unauthorized|not authorized|access denied/i.test(e.message ?? ""))
  );
}

function thrownErrorLooksLikeAuthFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (/unauthorized|not authorized|access denied/i.test(msg)) return true;
  // Thrown wrapper: GraphQL transport error: {"data":{},"errors":[{"message":"Unauthorized",...}]}
  if (/GraphQL transport error/i.test(msg) && /unauthorized/i.test(msg)) return true;
  return false;
}

/**
 * Runs an Amplify Data custom query/mutation, trying userPool then IAM (Cognito Identity Pool).
 * Some Gen2 custom operations that return custom types reject userPool JWT unless the schema
 * also allows `authenticated('identityPool')`; signed-in users still have IAM creds available.
 *
 * Retries when AppSync returns **Unauthorized** (including when the client **throws**
 * `GraphQL transport error: {...}` instead of filling `res.errors`).
 */
export async function withDataAuthModeFallback<T>(
  label: string,
  attempt: (authMode: DataClientAuthMode) => Promise<{ data?: unknown; errors?: readonly { message?: string }[] }>
): Promise<{ data: T[]; authModeUsed: DataClientAuthMode }> {
  await fetchAuthSession({ forceRefresh: true });
  let lastFailure = "";
  for (let i = 0; i < AUTH_MODES.length; i++) {
    const authMode = AUTH_MODES[i];
    try {
      const res = await attempt(authMode);
      if (res.errors?.length) {
        lastFailure = res.errors.map((e) => e.message ?? "").join("; ");
        if (responseLooksLikeAuthFailure(res) && i < AUTH_MODES.length - 1) {
          continue;
        }
        throw new Error(lastFailure || `${label}: request failed`);
      }
      return { data: parseCustomQueryArray<T>(res.data), authModeUsed: authMode };
    } catch (e) {
      lastFailure = e instanceof Error ? e.message : String(e);
      if (thrownErrorLooksLikeAuthFailure(e) && i < AUTH_MODES.length - 1) {
        continue;
      }
      throw e;
    }
  }
  throw new Error(lastFailure || `${label}: Unauthorized`);
}

/** Same as fallback above, for mutations / scalar custom operations (single `data` value). */
export async function withDataAuthModeMutation<T>(
  label: string,
  attempt: (authMode: DataClientAuthMode) => Promise<{ data?: T | null; errors?: readonly { message?: string }[] }>
): Promise<T | null | undefined> {
  await fetchAuthSession({ forceRefresh: true });
  let lastFailure = "";
  for (let i = 0; i < AUTH_MODES.length; i++) {
    const authMode = AUTH_MODES[i];
    try {
      const res = await attempt(authMode);
      if (res.errors?.length) {
        lastFailure = res.errors.map((e) => e.message ?? "").join("; ");
        if (responseLooksLikeAuthFailure(res) && i < AUTH_MODES.length - 1) {
          continue;
        }
        throw new Error(lastFailure || `${label}: request failed`);
      }
      return res.data ?? undefined;
    } catch (e) {
      lastFailure = e instanceof Error ? e.message : String(e);
      if (thrownErrorLooksLikeAuthFailure(e) && i < AUTH_MODES.length - 1) {
        continue;
      }
      throw e;
    }
  }
  throw new Error(lastFailure || `${label}: Unauthorized`);
}
