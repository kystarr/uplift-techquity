import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import outputs from '../../../amplify_outputs.json';

// Configure Amplify for Lambda environment
Amplify.configure(outputs, { ssr: true });

const client = generateClient();

/**
 * Post Confirmation Lambda Handler
 * 
 * Triggered after a user confirms their email in Cognito.
 * Creates a User record in DynamoDB with data from Cognito attributes.
 * 
 * BE-1.1: Ensures User model syncs with Cognito auth logic.
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('Post Confirmation triggered for user:', event.request.userAttributes.email);

  try {
    const { email, name, 'custom:role': role } = event.request.userAttributes;

    if (!email) {
      console.error('Email missing from user attributes');
      return event;
    }

    // Extract role from custom attribute (defaults to CUSTOMER if not set)
    const userRole = role || 'CUSTOMER';
    const userName = name || email.split('@')[0]; // Fallback to email prefix if name missing

    // Create User record in DynamoDB via GraphQL API
    // Using the generated GraphQL schema from the User model
    const { data, errors } = await client.graphql({
      query: `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
            role
            createdAt
          }
        }
      `,
      variables: {
        input: {
          name: userName,
          email: email,
          role: userRole,
        },
      },
      authMode: 'iam', // Use IAM auth since this is a Lambda (not user-initiated)
    });

    if (errors && errors.length > 0) {
      throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
    }

    console.log('✅ User record created successfully:', data?.createUser);
  } catch (error: any) {
    // Log error but don't fail the confirmation (user should still be able to sign in)
    console.error('❌ Failed to create User record:', error);
    
    // If it's a duplicate key error, that's okay (user already exists)
    if (
      error.message?.includes('ConditionalCheckFailedException') ||
      error.errors?.[0]?.errorType === 'ConditionalCheckFailedException'
    ) {
      console.log('User record already exists, skipping creation');
    } else {
      // For other errors, log but continue (non-blocking)
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  }

  return event;
};
