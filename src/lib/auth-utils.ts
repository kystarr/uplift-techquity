/**
 * Auth utilities for verifying token claims and custom attributes.
 * Used to verify BE-1.3: Login endpoint returns token with custom:role.
 */

import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Decodes a JWT token (without verification - just for inspection).
 * Returns the payload as an object.
 */
function decodeJWT(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Verifies that the current user's ID token contains the custom:role attribute.
 * This is critical for Sprint 2 role-based features.
 * 
 * @returns Object with:
 *   - hasCustomRole: boolean - whether custom:role exists in token
 *   - role: string | null - the role value if present
 *   - tokenClaims: Record<string, any> | null - full decoded token payload for debugging
 */
export async function verifyCustomRoleInToken(): Promise<{
  hasCustomRole: boolean;
  role: string | null;
  tokenClaims: Record<string, any> | null;
}> {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      console.warn('No ID token found in session');
      return { hasCustomRole: false, role: null, tokenClaims: null };
    }

    const claims = decodeJWT(idToken);
    if (!claims) {
      console.warn('Failed to decode ID token');
      return { hasCustomRole: false, role: null, tokenClaims: null };
    }

    // Check for custom:role (Cognito custom attributes are prefixed with 'custom:')
    const customRole = claims['custom:role'] || claims['custom_role'] || null;
    const hasCustomRole = customRole !== null;

    return {
      hasCustomRole,
      role: customRole,
      tokenClaims: claims,
    };
  } catch (error) {
    console.error('Error verifying custom role in token:', error);
    return { hasCustomRole: false, role: null, tokenClaims: null };
  }
}

/**
 * Logs token claims to console for debugging.
 * Useful during development to verify what's in the token.
 */
export async function logTokenClaims(): Promise<void> {
  const result = await verifyCustomRoleInToken();
  console.group('🔐 Auth Token Verification (BE-1.3)');
  console.log('Has custom:role:', result.hasCustomRole);
  console.log('Role value:', result.role);
  console.log('All token claims:', result.tokenClaims);
  console.groupEnd();
}
