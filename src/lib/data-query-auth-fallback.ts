import { fetchAuthSession } from "aws-amplify/auth";

const AUTH_MODES = ["userPool", "iam"] as const;

export type DataClientAuthMode = (typeof AUTH_MODES)[number];

export function parseCustomQueryArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)) {
    return (raw as { items: T[] }).items;
  }
  return [];
}

/**
 * Runs an Amplify Data custom query/mutation, trying userPool then IAM (Cognito Identity Pool).
 * Some Gen2 custom operations that return custom types reject userPool JWT unless the schema
 * also allows `authenticated('identityPool')`; signed-in users still have IAM creds available.
 */
export async function withDataAuthModeFallback<T>(
  label: string,
  attempt: (authMode: DataClientAuthMode) => Promise<{ data?: unknown; errors?: readonly { message?: string }[] }>
): Promise<{ data: T[]; authModeUsed: DataClientAuthMode }> {
  await fetchAuthSession({ forceRefresh: true });
  let lastErrors = "";
  for (const authMode of AUTH_MODES) {
    const res = await attempt(authMode);
    if (res.errors?.length) {
      lastErrors = res.errors.map((e) => e.message ?? "").join("; ");
      continue;
    }
    return { data: parseCustomQueryArray<T>(res.data), authModeUsed: authMode };
  }
  throw new Error(lastErrors || `${label}: Unauthorized`);
}

/** Same as fallback above, for mutations / scalar custom operations (single `data` value). */
export async function withDataAuthModeMutation<T>(
  label: string,
  attempt: (authMode: DataClientAuthMode) => Promise<{ data?: T | null; errors?: readonly { message?: string }[] }>
): Promise<T | null | undefined> {
  await fetchAuthSession({ forceRefresh: true });
  let lastErrors = "";
  for (const authMode of AUTH_MODES) {
    const res = await attempt(authMode);
    if (res.errors?.length) {
      lastErrors = res.errors.map((e) => e.message ?? "").join("; ");
      continue;
    }
    return res.data ?? undefined;
  }
  throw new Error(lastErrors || `${label}: Unauthorized`);
}
