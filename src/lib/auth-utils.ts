/**
 * Auth utilities for verifying token claims and custom attributes.
 * Used to verify BE-1.3: Login endpoint returns token with custom:role.
 */

import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Cognito ID token payload structure.
 * Fields marked optional depend on User Pool configuration.
 */
export interface CognitoIdTokenClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  token_use: 'id' | 'access';
  auth_time: number;
  email?: string;
  email_verified?: boolean;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  'custom:role'?: string;
  [key: string]: unknown;
}

export interface TokenVerificationResult {
  hasCustomRole: boolean;
  role: string | null;
  tokenClaims: CognitoIdTokenClaims | null;
  error?: string;
}

/**
 * Decodes a JWT token payload without cryptographic verification.
 * Only for client-side inspection of claims — signature validation
 * is handled server-side by Amplify/Cognito.
 */
export function decodeJWT(token: string): CognitoIdTokenClaims | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded) as CognitoIdTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Verifies that the current user's ID token contains the custom:role attribute.
 * Critical for Sprint 2 role-based features (BE-1.3).
 */
export async function verifyCustomRoleInToken(): Promise<TokenVerificationResult> {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      return {
        hasCustomRole: false,
        role: null,
        tokenClaims: null,
        error: 'No ID token found in session',
      };
    }

    const claims = decodeJWT(idToken);
    if (!claims) {
      return {
        hasCustomRole: false,
        role: null,
        tokenClaims: null,
        error: 'Failed to decode ID token',
      };
    }

    const customRole = claims['custom:role'] ?? null;
    return {
      hasCustomRole: customRole !== null,
      role: customRole,
      tokenClaims: claims,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error verifying token';
    return { hasCustomRole: false, role: null, tokenClaims: null, error: message };
  }
}

/**
 * Logs token claims to console for development debugging.
 * No-ops in production builds to avoid leaking token data.
 */
export async function logTokenClaims(): Promise<void> {
  if (import.meta.env.PROD) return;

  const result = await verifyCustomRoleInToken();
  console.group('Auth Token Verification (BE-1.3)');
  console.log('Has custom:role:', result.hasCustomRole);
  console.log('Role value:', result.role);
  if (result.error) {
    console.warn('Verification issue:', result.error);
  }
  console.log('All token claims:', result.tokenClaims);
  console.groupEnd();
}
