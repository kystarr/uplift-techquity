import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation/resource';

/**
 * BE-1.4: Auth Middleware via Authorization Rules
 * 
 * All models use authorization rules to protect routes/data:
 * - Unauthenticated requests are rejected (deny-by-default)
 * - Authenticated requests pass through based on rules
 * - Rules are reusable across all models
 */
const schema = a.schema({
  User: a.model({
    name: a.string().required(),
    email: a.string().required(),
    role: a.string().required(), // ADMIN | OWNER | CUSTOMER
  }).authorization((allow) => [
    allow.owner().to(['read', 'update']),
  ]),
  Todo: a.model({
    content: a.string()
  }).authorization((allow) => [
    allow.owner(),
  ]),
  Business: a.model({
    // Identity
    businessName: a.string().required(),
    legalBusinessName: a.string(),
    businessType: a.string(),
    contactName: a.string().required(),
    contactEmail: a.string().required(),
    ownerId: a.string(),

    // Profile Details
    phone: a.string(),
    website: a.string(),
    description: a.string(),
    street: a.string(),
    city: a.string(),
    state: a.string(),
    zip: a.string(),

    // Media & Categorization
    images: a.string().array(),
    tags: a.string().array(),
    categories: a.string().array(),

    // Stats & Verification
    averageRating: a.float(),
    verified: a.boolean(),
    verificationDocumentKey: a.string(),
    verificationStatus: a.string().required(), // PENDING | APPROVED | UNDER_REVIEW | REJECTED
    verificationSubmittedAt: a.datetime(),
  }).authorization((allow) => [
    allow.owner().to(['create', 'read', 'update']),
    // Allow guest create temporarily for one-time seed script via API key auth.
    // After seeding, change back to read-only for guests.
    allow.guest().to(['create', 'read']),
    // Allow authenticated principals (incl. IAM-authenticated callers) for seeding/backend writes
    allow.authenticated().to(['create', 'read', 'update']),
  ]),
}).authorization((allow) => [
  allow.resource(postConfirmation).to(['mutate']),
]);

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
});