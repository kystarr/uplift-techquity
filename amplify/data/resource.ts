import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation/resource';

/**
 * BE-1.4: Auth Middleware via Authorization Rules
 * 
 * All models use authorization rules to protect routes/data:
 * - Unauthenticated requests are rejected (deny-by-default)
 * - Authenticated requests pass through based on rules
 * - Rules are reusable across all models
 * 
 * User: matches what the app collects (Auth/SignUpForm) and Cognito custom:role.
 * Roles: ADMIN | OWNER | CUSTOMER (see auth flow and "Register Your Business" for OWNER).
 * Owner auth ties each record to the signed-in Cognito user.
 */
const schema = a
  .schema({
    User: a
      .model({
        name: a.string().required(),
        email: a.string().required(),
        role: a.string().required(), // ADMIN | OWNER | CUSTOMER
      })
      .authorization((allow) => [
        allow.owner().to(['read', 'update']), // Users can read/update their own profile
        // When you add an ADMIN Cognito group, uncomment: allow.group('ADMIN').to(['read', 'update', 'delete']),
      ]),
    Todo: a.model({ content: a.string() }).authorization((allow) => [
      allow.owner(), // Users can CRUD their own todos
    ]),
    Business: a
      .model({
        businessName: a.string().required(),
        legalBusinessName: a.string(),
        businessType: a.string(),
        contactName: a.string().required(),
        contactEmail: a.string().required(),
        phone: a.string(),
        website: a.url(),
        description: a.string(),
        verificationDocumentKey: a.string(),
        verificationStatus: a.string().required(), // PENDING | UNDER_REVIEW | APPROVED | REJECTED
        verificationSubmittedAt: a.datetime(),
      })
      .authorization((allow) => [
        allow.owner().to(['create', 'read', 'update']),
        // When ADMIN groups are enabled, allow.group('ADMIN').to(['read', 'update']),
      ]),
  })
  .authorization((allow) => [
    // Grant Post Confirmation Lambda IAM access to create User records
    allow.resource(postConfirmation).to(['mutate']),
  ]);

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ 
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool', // Cognito User Pool auth (requires authentication)
    // IAM mode enabled for Lambda functions (Post Confirmation)
  },
});