import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

/**
 * Cognito `sub` — matches `Business.ownerId` and AppSync owner auth (`identityClaim('sub')`).
 * Retries briefly: right after sign-in / first paint, `fetchAuthSession()` sometimes returns
 * no idToken yet; without this, owner business list can be empty until a full refresh.
 */
export async function getCognitoSub(): Promise<string | null> {
  const maxAttempts = 8;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { tokens } = await fetchAuthSession();
    const sub = tokens?.idToken?.payload?.sub;
    if (typeof sub === "string" && sub.length > 0) {
      return sub;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
    }
  }
  try {
    const u = await getCurrentUser();
    if (typeof u.userId === "string" && u.userId.length > 0) {
      return u.userId;
    }
  } catch {
    /* not signed in */
  }
  return null;
}
