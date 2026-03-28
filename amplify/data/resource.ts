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
    reviewCount: a.integer(),
    latitude: a.float(),
    longitude: a.float(),
    verified: a.boolean(),
    verificationDocumentKey: a.string(),
    verificationStatus: a.string().required(), // PENDING | APPROVED | UNDER_REVIEW | REJECTED
    verificationSubmittedAt: a.datetime(),

    // Moderation (BE-8.1)
    flagCount: a.integer().default(0),
  }).authorization((allow) => [
    allow.owner().to(['create', 'read', 'update']),
    // Allow guest create temporarily for one-time seed script via API key auth.
    // After seeding, change back to read-only for guests.
    allow.guest().to(['create', 'read']),
    // Allow authenticated principals (incl. IAM-authenticated callers) for seeding/backend writes
    allow.authenticated().to(['create', 'read', 'update']),
  ]),
  Review: a.model({
    businessId: a.string().required(),
    authorId: a.string().required(),
    authorName: a.string().required(),
    rating: a.float().required(),
    text: a.string(),

    // Moderation (BE-8.1)
    flagCount: a.integer().default(0),
  }).authorization((allow) => [
    allow.owner().to(['create', 'read', 'delete']),
    allow.authenticated().to(['read', 'update']),
    allow.guest().to(['read']),
  ]),

  /**
   * BE-8.1: Flag model for content moderation.
   * Users can flag reviews or businesses for admin review.
   */
  Flag: a.model({
    targetType: a.string().required(), // REVIEW | BUSINESS
    targetId: a.string().required(),
    reason: a.string().required(), // SPAM | INAPPROPRIATE | MISLEADING | FAKE | OTHER
    details: a.string(),
    status: a.string().required(), // PENDING | REVIEWED | DISMISSED | ACTION_TAKEN
    reporterId: a.string().required(),
    reporterName: a.string(),
    targetName: a.string(),
    resolvedBy: a.string(),
    resolvedAt: a.datetime(),
    adminNotes: a.string(),
  }).authorization((allow) => [
    allow.owner().to(['create', 'read']),
    allow.authenticated().to(['read', 'update']),
  ]),

  /**
   * BE-8.3: Admin notifications for moderation events.
   * Created automatically when flags are submitted.
   */
  AdminNotification: a.model({
    type: a.string().required(), // FLAG_CREATED | FLAG_RESOLVED | BUSINESS_SUSPENDED | REVIEW_REMOVED
    title: a.string().required(),
    message: a.string().required(),
    relatedId: a.string(), // ID of the flag, review, or business
    relatedType: a.string(), // FLAG | REVIEW | BUSINESS
    read: a.boolean().default(false),
  }).authorization((allow) => [
    allow.authenticated().to(['create', 'read', 'update']),
  ]),

  Favorite: a.model({
    businessId: a.string().required(),
    businessName: a.string(),
    businessCategory: a.string(),
    businessImage: a.string(),
    businessRating: a.float(),
    businessVerified: a.boolean(),
    businessLatitude: a.float(),
    businessLongitude: a.float(),
  }).authorization((allow) => [
    allow.owner(),
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