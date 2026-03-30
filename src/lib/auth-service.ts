/**
 * Centralised authentication service wrapping AWS Amplify Cognito operations.
 *
 * Extracted from Auth.tsx to decouple auth business logic from the UI layer.
 * Each function performs a single Cognito operation and returns a typed result,
 * allowing the calling component to decide how to present success/failure.
 */

import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
} from 'aws-amplify/auth';
import { verifyCustomRoleInToken, logTokenClaims } from '@/lib/auth-utils';

export interface AuthLoginParams {
  email: string;
  password: string;
}

export interface AuthSignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthLoginResult {
  isSignedIn: boolean;
  hasCustomRole: boolean;
  role: string | null;
}

/**
 * Authenticates a user with Cognito credentials and verifies their
 * ID token contains the custom:role claim (BE-1.3 requirement).
 */
export async function login(params: AuthLoginParams): Promise<AuthLoginResult> {
  const { isSignedIn } = await amplifySignIn({
    username: params.email,
    password: params.password,
  });

  if (!isSignedIn) {
    return { isSignedIn: false, hasCustomRole: false, role: null };
  }

  const tokenCheck = await verifyCustomRoleInToken();

  if (!tokenCheck.hasCustomRole) {
    console.warn('BE-1.3: custom:role NOT found in ID token.');
  }

  if (import.meta.env.DEV) {
    await logTokenClaims();
  }

  return {
    isSignedIn: true,
    hasCustomRole: tokenCheck.hasCustomRole,
    role: tokenCheck.role,
  };
}

/**
 * Registers a new user with the CUSTOMER role.
 * On success the caller should prompt for the email verification code.
 */
export async function register(params: AuthSignUpParams): Promise<void> {
  await amplifySignUp({
    username: params.email,
    password: params.password,
    options: {
      userAttributes: {
        email: params.email,
        name: `${params.firstName} ${params.lastName}`.trim(),
        'custom:role': 'CUSTOMER',
      },
    },
  });
}

/**
 * Confirms a sign-up with the 6-digit verification code sent to the user's email.
 */
export async function confirmRegistration(
  email: string,
  code: string,
): Promise<void> {
  await amplifyConfirmSignUp({
    username: email,
    confirmationCode: code,
  });
}
