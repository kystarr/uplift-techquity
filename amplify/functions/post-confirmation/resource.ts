import { defineFunction } from '@aws-amplify/backend';

/**
 * Post Confirmation Lambda: Creates User record in DynamoDB when Cognito user confirms email.
 * This syncs Cognito users to the User table (BE-1.1 integration).
 */
export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  entry: './handler.ts',
});
