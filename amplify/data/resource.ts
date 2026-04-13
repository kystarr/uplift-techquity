import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation/resource';
import { moderation } from '../functions/moderation/resource';

/**
 * BE-1.4: Auth Middleware via Authorization Rules
 * 
 * All models use authorization rules to protect routes/data:
 * - Unauthenticated requests are rejected (deny-by-default)
 * - Authenticated requests pass through based on rules
 * - Rules are reusable across all models
 */
const schema = a.schema({
  FlagTargetDetails: a.customType({
    businessId: a.string(),
    businessName: a.string(),
    reviewText: a.string(),
    reviewAuthorName: a.string(),
  }),

  FlagAdminView: a.customType({
    id: a.id().required(),
    targetType: a.string().required(),
    targetId: a.string().required(),
    reason: a.string().required(),
    details: a.string(),
    status: a.string().required(),
    reporterId: a.string().required(),
    reporterName: a.string(),
    targetName: a.string(),
    resolvedBy: a.string(),
    resolvedAt: a.datetime(),
    adminNotes: a.string(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    targetDetails: a.ref('FlagTargetDetails'),
  }),

  FlagCounts: a.customType({
    total: a.integer().required(),
    pending: a.integer().required(),
    resolved: a.integer().required(),
  }),

  HiddenReviewQueueItem: a.customType({
    reviewId: a.id().required(),
    businessId: a.string().required(),
    businessName: a.string(),
    authorName: a.string(),
    text: a.string(),
    rating: a.float().required(),
    createdAt: a.datetime(),
  }),

  PendingVerificationQueueItem: a.customType({
    businessId: a.id().required(),
    businessName: a.string(),
    contactEmail: a.string(),
    pendingBusinessName: a.string(),
    pendingStreet: a.string(),
    pendingCity: a.string(),
    pendingState: a.string(),
    pendingZip: a.string(),
    verificationDocumentKeys: a.string().array(),
    verificationStatus: a.string(),
  }),

  AdminActivityEntry: a.customType({
    id: a.id().required(),
    actorId: a.string().required(),
    actorName: a.string(),
    action: a.string().required(),
    targetType: a.string(),
    targetId: a.string(),
    metadata: a.string(),
    createdAt: a.datetime().required(),
  }),

  User: a.model({
    name: a.string().required(),
    email: a.string().required(),
    role: a.string().required(), // ADMIN | OWNER | CUSTOMER
    avatarUrl: a.string(),
  }).authorization((allow) => [
    /** create: first sign-in / registration syncs DynamoDB User to Cognito identity */
    allow.owner().to(['create', 'read', 'update']),
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

    /** Identity change pending admin approval (name / address) */
    pendingBusinessName: a.string(),
    pendingStreet: a.string(),
    pendingCity: a.string(),
    pendingState: a.string(),
    pendingZip: a.string(),
    verificationDocumentKeys: a.string().array(),
    customersContactedCount: a.integer().default(0),
  }).authorization((allow) => [
    /** Match app `ownerId` + `getCurrentUser().userId` (Cognito `sub`), not username */
    allow.ownerDefinedIn('ownerId').identityClaim('sub').to(['create', 'read', 'update']),
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
    /** visible | hidden_pending_admin | removed */
    moderationStatus: a.string().default('visible'),
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
    // Flags are created and moderated via custom operations to enforce validation and admin checks.
    allow.owner().to(['read']),
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

  /**
   * BE-9: Messaging system for customer-business communication.
   * Tracks conversations between users and businesses.
   */
  Conversation: a.model({
    participantId: a.string().required(), // Customer user ID
    businessId: a.string().required(),
    businessName: a.string(),
    businessImage: a.string(),
    lastMessage: a.string(),
    lastMessageTimestamp: a.datetime(),
    unreadCount: a.integer().default(0),
    /** Customer hides thread on their side only; business-facing views unaffected. */
    participantHidden: a.boolean().default(false),
    /** When true, alerts/toasts for new activity on this thread are suppressed for the participant. */
    participantMuted: a.boolean().default(false),
  }).authorization((allow) => [
    allow.owner().to(['read', 'create', 'update']),
    allow.authenticated().to(['read', 'update']),
  ]),

  /**
   * BE-9: Individual messages within a conversation.
   */
  Message: a.model({
    conversationId: a.string().required(),
    senderId: a.string().required(),
    senderName: a.string().required(),
    text: a.string(),
    attachmentUrl: a.string(),
    attachmentType: a.string(), // 'image' | 'file'
    attachmentName: a.string(),
  }).authorization((allow) => [
    allow.owner().to(['create', 'read']),
    allow.authenticated().to(['read']),
  ]),

  /**
   * BE-8.2 + BE-8.5: Validated flag creation with duplicate prevention.
   */
  /** Validated flag creation (name avoids clashing with model `createFlag`). */
  submitModerationFlag: a
    .mutation()
    .arguments({
      targetType: a.string().required(), // BUSINESS | REVIEW
      targetId: a.id().required(),
      reason: a.string().required(),
      details: a.string(),
    })
    .returns(a.ref('FlagAdminView'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  /**
   * BE-8.3: Admin queue retrieval for unresolved/reported content.
   */
  listFlagsForAdmin: a
    .query()
    .arguments({
      status: a.string(), // defaults to PENDING in resolver
    })
    .returns(a.ref('FlagAdminView').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  /**
   * BE-8.4: Admin-only resolution flow.
   */
  resolveFlag: a
    .mutation()
    .arguments({
      flagId: a.id().required(),
      adminNotes: a.string(),
    })
    .returns(a.ref('FlagAdminView'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  /**
   * BE-8.6: Optional moderation insights for prioritization.
   */
  flagCountsForAdmin: a
    .query()
    .returns(a.ref('FlagCounts'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  /** Business owner soft-hides a review until admin approves or restores. */
  hideReview: a
    .mutation()
    .arguments({
      reviewId: a.id().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  /** Admin approves permanent removal or restores visibility for a hidden review. */
  adminResolveHiddenReview: a
    .mutation()
    .arguments({
      reviewId: a.id().required(),
      /** APPROVE_HIDE | RESTORE */
      decision: a.string().required(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  listHiddenReviewsForAdmin: a
    .query()
    .returns(a.ref('HiddenReviewQueueItem').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  listPendingBusinessVerifications: a
    .query()
    .returns(a.ref('PendingVerificationQueueItem').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  /** Owner submits docs for name/address change; sets UNDER_REVIEW. */
  requestBusinessProfileVerification: a
    .mutation()
    .arguments({
      businessId: a.id().required(),
      documentKeys: a.string().array().required(),
      pendingBusinessName: a.string(),
      pendingStreet: a.string(),
      pendingCity: a.string(),
      pendingState: a.string(),
      pendingZip: a.string(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  /** Approve or reject pending business identity verification. */
  adminResolveBusinessVerification: a
    .mutation()
    .arguments({
      businessId: a.id().required(),
      /** APPROVE | REJECT */
      decision: a.string().required(),
      adminNotes: a.string(),
    })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  adminRemoveReview: a
    .mutation()
    .arguments({ reviewId: a.id().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  adminRemoveBusiness: a
    .mutation()
    .arguments({ businessId: a.id().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  adminRemoveUser: a
    .mutation()
    .arguments({ userId: a.id().required() })
    .returns(a.boolean())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),

  listAdminActivityLog: a
    .query()
    .returns(a.ref('AdminActivityEntry').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(moderation)),
}).authorization((allow) => [
  allow.resource(postConfirmation).to(['mutate']),
  allow.resource(moderation).to(['query', 'mutate']),
]);

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
});