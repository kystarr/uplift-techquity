import type { AppSyncResolverEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import outputs from '../../../amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });
const client = generateClient();

type Identity = {
  sub?: string;
  username?: string;
  claims?: Record<string, unknown>;
};

type ResolverEvent = AppSyncResolverEvent<Record<string, unknown>>;

type TargetType = 'BUSINESS' | 'REVIEW';

type FlagRecord = {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  details?: string | null;
  status: string;
  reporterId: string;
  reporterName?: string | null;
  targetName?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TargetDetails = {
  businessId?: string;
  businessName?: string;
  reviewText?: string;
  reviewAuthorName?: string;
};

const VALID_TARGET_TYPES = new Set(['BUSINESS', 'REVIEW']);
const VALID_RESOLVABLE_STATUSES = new Set(['PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN', 'RESOLVED']);

export const handler = async (event: ResolverEvent) => {
  const fieldName = event.info?.fieldName;

  switch (fieldName) {
    case 'submitModerationFlag':
      return submitModerationFlag(event);
    case 'listFlagsForAdmin':
      return listFlagsForAdmin(event);
    case 'resolveFlag':
      return resolveFlag(event);
    case 'flagCountsForAdmin':
      return flagCountsForAdmin(event);
    case 'hideReview':
      return hideReview(event);
    case 'adminResolveHiddenReview':
      return adminResolveHiddenReview(event);
    case 'listHiddenReviewsForAdmin':
      return listHiddenReviewsForAdmin(event);
    case 'listPendingBusinessVerifications':
      return listPendingBusinessVerifications(event);
    case 'requestBusinessProfileVerification':
      return requestBusinessProfileVerification(event);
    case 'adminResolveBusinessVerification':
      return adminResolveBusinessVerification(event);
    case 'adminRemoveReview':
      return adminRemoveReview(event);
    case 'adminRemoveBusiness':
      return adminRemoveBusiness(event);
    case 'adminRemoveUser':
      return adminRemoveUser(event);
    case 'listAdminActivityLog':
      return listAdminActivityLog(event);
    default:
      throw new Error(`Unsupported moderation operation: ${String(fieldName)}`);
  }
};

async function submitModerationFlag(event: ResolverEvent) {
  const identity = requireAuthenticatedUser(event);
  const reporterId = identity.sub ?? identity.username;

  if (!reporterId) {
    throw new Error('Unable to determine authenticated user identity');
  }

  const targetType = String(event.arguments?.targetType ?? '').toUpperCase();
  const targetId = String(event.arguments?.targetId ?? '').trim();
  const reason = String(event.arguments?.reason ?? '').trim();
  const detailsRaw = event.arguments?.details;
  const details = typeof detailsRaw === 'string' && detailsRaw.trim().length > 0
    ? detailsRaw.trim()
    : null;

  if (!VALID_TARGET_TYPES.has(targetType)) {
    throw new Error('Invalid targetType. Expected BUSINESS or REVIEW.');
  }

  if (!targetId) {
    throw new Error('targetId is required.');
  }

  if (!reason) {
    throw new Error('reason is required.');
  }

  const target = await getTarget(targetType as TargetType, targetId);
  if (!target.exists) {
    throw new Error(`${targetType} with id ${targetId} was not found.`);
  }

  const duplicate = await findExistingPendingFlag(reporterId, targetType as TargetType, targetId);
  if (duplicate) {
    throw new Error('You already have an open flag for this item.');
  }

  const createRes = await graphql<{ createFlag: FlagRecord }>(
    `
      mutation CreateFlag($input: CreateFlagInput!) {
        createFlag(input: $input) {
          id
          targetType
          targetId
          reason
          details
          status
          reporterId
          reporterName
          targetName
          resolvedBy
          resolvedAt
          adminNotes
          createdAt
          updatedAt
        }
      }
    `,
    {
      input: {
        targetType,
        targetId,
        reason,
        details,
        status: 'PENDING',
        reporterId,
        reporterName: identity.username ?? null,
        targetName: target.targetName ?? null,
      },
    }
  );

  const created = createRes.createFlag;

  await incrementTargetFlagCount(targetType as TargetType, targetId, target.flagCount ?? 0);
  await createAdminNotification(
    'FLAG_CREATED',
    `New ${targetType.toLowerCase()} flag`,
    `${targetType} ${target.targetName ?? targetId} was flagged for: ${reason}`,
    created.id,
    'FLAG'
  );

  return {
    ...created,
    targetDetails: target.details,
  };
}

async function listFlagsForAdmin(event: ResolverEvent) {
  requireAdminUser(event);

  const requestedStatus = event.arguments?.status;
  const raw =
    typeof requestedStatus === 'string' && requestedStatus.trim().length > 0
      ? requestedStatus.trim().toUpperCase()
      : 'ALL';

  let flags: FlagRecord[];
  if (raw === 'ALL') {
    flags = await listAllFlags();
  } else {
    if (!VALID_RESOLVABLE_STATUSES.has(raw)) {
      throw new Error('Invalid status filter.');
    }
    flags = await listAllFlags(raw);
  }

  const enriched = await Promise.all(
    flags.map(async (flag) => {
      const target = await getTarget(flag.targetType as TargetType, flag.targetId);
      return {
        ...flag,
        targetDetails: target.details,
      };
    })
  );

  return enriched;
}

async function resolveFlag(event: ResolverEvent) {
  const identity = requireAdminUser(event);
  const flagId = String(event.arguments?.flagId ?? '').trim();
  const adminNotesRaw = event.arguments?.adminNotes;
  const adminNotes = typeof adminNotesRaw === 'string' && adminNotesRaw.trim().length > 0
    ? adminNotesRaw.trim()
    : null;

  if (!flagId) {
    throw new Error('flagId is required.');
  }

  const existing = await getFlagById(flagId);
  if (!existing) {
    throw new Error(`Flag ${flagId} was not found.`);
  }

  const resolvedBy = identity.sub ?? identity.username;
  if (!resolvedBy) {
    throw new Error('Unable to determine admin identity.');
  }

  const now = new Date().toISOString();
  const updateRes = await graphql<{ updateFlag: FlagRecord }>(
    `
      mutation ResolveFlag($input: UpdateFlagInput!) {
        updateFlag(input: $input) {
          id
          targetType
          targetId
          reason
          details
          status
          reporterId
          reporterName
          targetName
          resolvedBy
          resolvedAt
          adminNotes
          createdAt
          updatedAt
        }
      }
    `,
    {
      input: {
        id: flagId,
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: now,
        adminNotes,
      },
    }
  );

  const updated = updateRes.updateFlag;
  await createAdminNotification(
    'FLAG_RESOLVED',
    'Flag resolved',
    `Flag ${flagId} was resolved by an admin.`,
    flagId,
    'FLAG'
  );

  const target = await getTarget(updated.targetType, updated.targetId);
  return {
    ...updated,
    targetDetails: target.details,
  };
}

async function flagCountsForAdmin(event: ResolverEvent) {
  requireAdminUser(event);

  const all = await listAllFlags();
  const pending = all.filter((flag) => flag.status === 'PENDING').length;
  const resolved = all.filter((flag) => flag.status === 'RESOLVED').length;

  return {
    total: all.length,
    pending,
    resolved,
  };
}

function requireAuthenticatedUser(event: ResolverEvent): Identity {
  const identity = event.identity as Identity | null;
  if (!identity) {
    throw new Error('Authentication required.');
  }
  return identity;
}

function requireAdminUser(event: ResolverEvent): Identity {
  const identity = requireAuthenticatedUser(event);
  const claims = identity.claims ?? {};

  const customRole = String(claims['custom:role'] ?? '').toUpperCase();
  const groupsClaim = claims['cognito:groups'];
  const groups = Array.isArray(groupsClaim)
    ? groupsClaim.map((g) => String(g).toUpperCase())
    : String(groupsClaim ?? '')
        .split(',')
        .map((g) => g.trim().toUpperCase())
        .filter(Boolean);

  const isAdmin = customRole === 'ADMIN' || groups.includes('ADMIN');
  if (!isAdmin) {
    throw new Error('Admin access required.');
  }

  return identity;
}

async function findExistingPendingFlag(reporterId: string, targetType: TargetType, targetId: string) {
  const result = await graphql<{ listFlags: { items: Array<{ id: string }> } }>(
    `
      query FindDuplicateFlag($filter: ModelFlagFilterInput, $limit: Int) {
        listFlags(filter: $filter, limit: $limit) {
          items {
            id
          }
        }
      }
    `,
    {
      filter: {
        reporterId: { eq: reporterId },
        targetType: { eq: targetType },
        targetId: { eq: targetId },
        status: { eq: 'PENDING' },
      },
      limit: 1,
    }
  );

  return (result.listFlags.items ?? [])[0] ?? null;
}

async function getFlagById(id: string): Promise<FlagRecord | null> {
  const result = await graphql<{ getFlag: FlagRecord | null }>(
    `
      query GetFlag($id: ID!) {
        getFlag(id: $id) {
          id
          targetType
          targetId
          reason
          details
          status
          reporterId
          reporterName
          targetName
          resolvedBy
          resolvedAt
          adminNotes
          createdAt
          updatedAt
        }
      }
    `,
    { id }
  );

  return result.getFlag;
}

async function listAllFlags(status?: string): Promise<FlagRecord[]> {
  const items: FlagRecord[] = [];
  let nextToken: string | null | undefined;

  do {
    const result = await graphql<{ listFlags: { items: FlagRecord[]; nextToken?: string | null } }>(
      `
        query ListFlags($filter: ModelFlagFilterInput, $limit: Int, $nextToken: String) {
          listFlags(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items {
              id
              targetType
              targetId
              reason
              details
              status
              reporterId
              reporterName
              targetName
              resolvedBy
              resolvedAt
              adminNotes
              createdAt
              updatedAt
            }
            nextToken
          }
        }
      `,
      {
        filter: status ? { status: { eq: status } } : undefined,
        limit: 100,
        nextToken,
      }
    );

    items.push(...(result.listFlags.items ?? []));
    nextToken = result.listFlags.nextToken;
  } while (nextToken);

  return items;
}

async function getTarget(targetType: TargetType, targetId: string): Promise<{
  exists: boolean;
  targetName?: string;
  flagCount?: number;
  details: TargetDetails;
}> {
  if (targetType === 'BUSINESS') {
    const business = await graphql<{ getBusiness: { id: string; businessName?: string | null; flagCount?: number | null } | null }>(
      `
        query GetBusiness($id: ID!) {
          getBusiness(id: $id) {
            id
            businessName
            flagCount
          }
        }
      `,
      { id: targetId }
    );

    if (!business.getBusiness) {
      return { exists: false, details: {} };
    }

    return {
      exists: true,
      targetName: business.getBusiness.businessName ?? undefined,
      flagCount: business.getBusiness.flagCount ?? 0,
      details: {
        businessName: business.getBusiness.businessName ?? undefined,
      },
    };
  }

  const review = await graphql<{
    getReview: {
      id: string;
      businessId: string;
      authorName?: string | null;
      text?: string | null;
      flagCount?: number | null;
    } | null;
  }>(
    `
      query GetReview($id: ID!) {
        getReview(id: $id) {
          id
          businessId
          authorName
          text
          flagCount
        }
      }
    `,
    { id: targetId }
  );

  if (!review.getReview) {
    return { exists: false, details: {} };
  }

  const excerpt = review.getReview.text
    ? review.getReview.text.slice(0, 140)
    : undefined;

  return {
    exists: true,
    targetName: review.getReview.authorName ?? 'Review',
    flagCount: review.getReview.flagCount ?? 0,
    details: {
      businessId: review.getReview.businessId,
      reviewText: excerpt,
      reviewAuthorName: review.getReview.authorName ?? undefined,
    },
  };
}

async function incrementTargetFlagCount(targetType: TargetType, targetId: string, currentFlagCount: number) {
  const nextCount = (currentFlagCount || 0) + 1;

  if (targetType === 'BUSINESS') {
    await graphql(
      `
        mutation IncrementBusinessFlagCount($input: UpdateBusinessInput!) {
          updateBusiness(input: $input) {
            id
          }
        }
      `,
      { input: { id: targetId, flagCount: nextCount } }
    );
    return;
  }

  await graphql(
    `
      mutation IncrementReviewFlagCount($input: UpdateReviewInput!) {
        updateReview(input: $input) {
          id
        }
      }
    `,
    { input: { id: targetId, flagCount: nextCount } }
  );
}

async function createAdminNotification(
  type: string,
  title: string,
  message: string,
  relatedId: string,
  relatedType: string
) {
  await graphql(
    `
      mutation CreateAdminNotification($input: CreateAdminNotificationInput!) {
        createAdminNotification(input: $input) {
          id
        }
      }
    `,
    {
      input: {
        type,
        title,
        message,
        relatedId,
        relatedType,
        read: false,
      },
    }
  );
}

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function sendModerationEmail(subject: string, body: string, toAddresses?: string[]) {
  const from = process.env.SES_FROM_EMAIL;
  const fallback = process.env.MODERATION_NOTIFY_EMAIL;
  const to = toAddresses?.length
    ? toAddresses
    : fallback
      ? fallback.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  if (!from || to.length === 0) {
    console.warn('SES_FROM_EMAIL or recipients not configured; skip email');
    return;
  }
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: to },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Text: { Data: body, Charset: 'UTF-8' } },
        },
      })
    );
  } catch (e) {
    console.error('sendModerationEmail failed', e);
  }
}

async function appendActivityLog(
  identity: Identity,
  action: string,
  targetType: string | undefined,
  targetId: string | undefined,
  metadata: Record<string, unknown>
) {
  const actorId = identity.sub ?? identity.username ?? 'unknown';
  const actorName = typeof identity.username === 'string' ? identity.username : undefined;
  try {
    const payload = JSON.stringify({
      actorId,
      actorName,
      action,
      targetType,
      targetId,
      ...metadata,
    });
    await graphql(
      `
        mutation CreateAdminNotification($input: CreateAdminNotificationInput!) {
          createAdminNotification(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          type: 'ADMIN_ACTIVITY',
          title: action,
          message: payload,
          relatedId: targetId ?? actorId,
          relatedType: 'ACTIVITY',
          read: false,
        },
      }
    );
  } catch (e) {
    console.error('appendActivityLog failed', e);
  }
}

type ReviewRow = {
  id: string;
  businessId: string;
  authorId?: string | null;
  authorName?: string | null;
  text?: string | null;
  rating: number;
  moderationStatus?: string | null;
  createdAt?: string | null;
};

async function listAllReviewsForBusiness(businessId: string): Promise<ReviewRow[]> {
  const items: ReviewRow[] = [];
  let nextToken: string | null | undefined;
  do {
    const result = await graphql<{ listReviews: { items: ReviewRow[]; nextToken?: string | null } }>(
      `
        query LR($filter: ModelReviewFilterInput, $limit: Int, $nextToken: String) {
          listReviews(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items {
              id businessId authorId authorName text rating moderationStatus createdAt
            }
            nextToken
          }
        }
      `,
      {
        filter: { businessId: { eq: businessId } },
        limit: 200,
        nextToken,
      }
    );
    items.push(...(result.listReviews.items ?? []));
    nextToken = result.listReviews.nextToken;
  } while (nextToken);
  return items;
}

async function listAllReviews(): Promise<ReviewRow[]> {
  const items: ReviewRow[] = [];
  let nextToken: string | null | undefined;
  do {
    const result = await graphql<{ listReviews: { items: ReviewRow[]; nextToken?: string | null } }>(
      `
        query LRAll($limit: Int, $nextToken: String) {
          listReviews(limit: $limit, nextToken: $nextToken) {
            items {
              id businessId authorId authorName text rating moderationStatus createdAt
            }
            nextToken
          }
        }
      `,
      { limit: 500, nextToken }
    );
    items.push(...(result.listReviews.items ?? []));
    nextToken = result.listReviews.nextToken;
  } while (nextToken);
  return items;
}

type BizRow = {
  id: string;
  businessName: string;
  contactEmail: string;
  contactName?: string | null;
  ownerId?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  verificationStatus: string;
  pendingBusinessName?: string | null;
  pendingStreet?: string | null;
  pendingCity?: string | null;
  pendingState?: string | null;
  pendingZip?: string | null;
  verificationDocumentKeys?: string[] | null;
};

async function listAllBusinesses(): Promise<BizRow[]> {
  const items: BizRow[] = [];
  let nextToken: string | null | undefined;
  do {
    const result = await graphql<{ listBusinesses: { items: BizRow[]; nextToken?: string | null } }>(
      `
        query LB($limit: Int, $nextToken: String) {
          listBusinesses(limit: $limit, nextToken: $nextToken) {
            items {
              id businessName contactEmail contactName ownerId street city state zip verificationStatus
              pendingBusinessName pendingStreet pendingCity pendingState pendingZip verificationDocumentKeys
            }
            nextToken
          }
        }
      `,
      { limit: 200, nextToken }
    );
    items.push(...(result.listBusinesses.items ?? []));
    nextToken = result.listBusinesses.nextToken;
  } while (nextToken);
  return items;
}

async function recalculateBusinessReviewStats(businessId: string) {
  const reviews = await listAllReviewsForBusiness(businessId);
  const visible = reviews.filter((r) => !r.moderationStatus || r.moderationStatus === 'visible');
  const newCount = visible.length;
  const newAverage =
    newCount > 0 ? visible.reduce((s, r) => s + (r.rating ?? 0), 0) / newCount : 0;
  await graphql(
    `
      mutation RecalcBiz($input: UpdateBusinessInput!) {
        updateBusiness(input: $input) {
          id
        }
      }
    `,
    {
      input: {
        id: businessId,
        reviewCount: newCount,
        averageRating: Math.round(newAverage * 10) / 10,
      },
    }
  );
}

async function hideReview(event: ResolverEvent) {
  const identity = requireAuthenticatedUser(event);
  const sub = identity.sub ?? identity.username;
  const reviewId = String(event.arguments?.reviewId ?? '').trim();
  if (!reviewId) throw new Error('reviewId is required.');
  if (!sub) throw new Error('Unable to determine user identity.');

  const rev = await graphql<{ getReview: { id: string; businessId: string } | null }>(
    `
      query GR($id: ID!) {
        getReview(id: $id) {
          id
          businessId
        }
      }
    `,
    { id: reviewId }
  );
  if (!rev.getReview) throw new Error('Review not found.');

  const biz = await graphql<{ getBusiness: { ownerId?: string | null } | null }>(
    `
      query GB($id: ID!) {
        getBusiness(id: $id) {
          ownerId
        }
      }
    `,
    { id: rev.getReview.businessId }
  );
  if (!biz.getBusiness?.ownerId || biz.getBusiness.ownerId !== sub) {
    throw new Error('Only the business owner can hide reviews for this business.');
  }

  await graphql(
    `
      mutation UR($input: UpdateReviewInput!) {
        updateReview(input: $input) {
          id
        }
      }
    `,
    { input: { id: reviewId, moderationStatus: 'hidden_pending_admin' } }
  );
  await recalculateBusinessReviewStats(rev.getReview.businessId);
  await createAdminNotification(
    'FLAG_CREATED',
    'Review hidden pending admin',
    `Review ${reviewId} was hidden by the business owner and awaits admin review.`,
    reviewId,
    'REVIEW'
  );
  await appendActivityLog(identity, 'HIDE_REVIEW', 'REVIEW', reviewId, {});
  await sendModerationEmail(
    'Review hidden (pending admin)',
    `Review ${reviewId} on business ${rev.getReview.businessId} was soft-hidden by the owner.`
  );
  return true;
}

async function adminResolveHiddenReview(event: ResolverEvent) {
  const identity = requireAdminUser(event);
  const reviewId = String(event.arguments?.reviewId ?? '').trim();
  const decision = String(event.arguments?.decision ?? '').trim().toUpperCase();
  if (!reviewId) throw new Error('reviewId is required.');
  if (decision !== 'APPROVE_HIDE' && decision !== 'RESTORE') {
    throw new Error('decision must be APPROVE_HIDE or RESTORE');
  }

  const rev = await graphql<{ getReview: { id: string; businessId: string } | null }>(
    `
      query GR2($id: ID!) {
        getReview(id: $id) {
          id
          businessId
        }
      }
    `,
    { id: reviewId }
  );
  if (!rev.getReview) throw new Error('Review not found.');

  const nextStatus = decision === 'APPROVE_HIDE' ? 'removed' : 'visible';
  await graphql(
    `
      mutation UR2($input: UpdateReviewInput!) {
        updateReview(input: $input) {
          id
        }
      }
    `,
    { input: { id: reviewId, moderationStatus: nextStatus } }
  );
  await recalculateBusinessReviewStats(rev.getReview.businessId);
  await appendActivityLog(identity, `RESOLVE_HIDDEN_${decision}`, 'REVIEW', reviewId, { decision });
  await sendModerationEmail(
    `Hidden review ${decision === 'APPROVE_HIDE' ? 'approved (removed from public)' : 'restored'}`,
    `Review ${reviewId}: admin decision ${decision}`
  );
  return true;
}

async function listHiddenReviewsForAdmin(event: ResolverEvent) {
  requireAdminUser(event);
  const all = await listAllReviews();
  const hidden = all.filter((r) => r.moderationStatus === 'hidden_pending_admin');
  const out = await Promise.all(
    hidden.map(async (r) => {
      const b = await graphql<{ getBusiness: { businessName?: string | null } | null }>(
        `
          query GBN($id: ID!) {
            getBusiness(id: $id) {
              businessName
            }
          }
        `,
        { id: r.businessId }
      );
      return {
        reviewId: r.id,
        businessId: r.businessId,
        businessName: b.getBusiness?.businessName ?? undefined,
        authorName: r.authorName ?? undefined,
        text: r.text ?? undefined,
        rating: typeof r.rating === 'number' ? r.rating : 0,
        createdAt: r.createdAt ?? undefined,
      };
    })
  );
  return out;
}

async function listPendingBusinessVerifications(event: ResolverEvent) {
  requireAdminUser(event);
  const businesses = await listAllBusinesses();
  return businesses
    .filter(
      (b) =>
        b.verificationStatus === 'UNDER_REVIEW' &&
        ((b.verificationDocumentKeys?.length ?? 0) > 0 ||
          !!(b.pendingBusinessName || b.pendingStreet || b.pendingCity))
    )
    .map((b) => ({
      businessId: b.id,
      businessName: b.businessName,
      contactEmail: b.contactEmail,
      pendingBusinessName: b.pendingBusinessName ?? undefined,
      pendingStreet: b.pendingStreet ?? undefined,
      pendingCity: b.pendingCity ?? undefined,
      pendingState: b.pendingState ?? undefined,
      pendingZip: b.pendingZip ?? undefined,
      verificationDocumentKeys: b.verificationDocumentKeys ?? [],
      verificationStatus: b.verificationStatus,
    }));
}

async function requestBusinessProfileVerification(event: ResolverEvent) {
  const identity = requireAuthenticatedUser(event);
  const sub = identity.sub ?? identity.username;
  const businessId = String(event.arguments?.businessId ?? '').trim();
  const documentKeys = (event.arguments?.documentKeys as string[]) ?? [];
  if (!businessId) throw new Error('businessId is required.');
  if (!documentKeys.length) throw new Error('documentKeys are required.');
  if (!sub) throw new Error('Unable to determine user identity.');

  const biz = await graphql<{
    getBusiness: { ownerId?: string | null; businessName?: string | null } | null;
  }>(
    `
      query GB2($id: ID!) {
        getBusiness(id: $id) {
          ownerId
          businessName
        }
      }
    `,
    { id: businessId }
  );
  if (!biz.getBusiness?.ownerId || biz.getBusiness.ownerId !== sub) {
    throw new Error('Only the business owner can request verification.');
  }

  const pendingBusinessName = event.arguments?.pendingBusinessName as string | undefined;
  const pendingStreet = event.arguments?.pendingStreet as string | undefined;
  const pendingCity = event.arguments?.pendingCity as string | undefined;
  const pendingState = event.arguments?.pendingState as string | undefined;
  const pendingZip = event.arguments?.pendingZip as string | undefined;

  const hasIdentityChange = !!(
    (pendingBusinessName && pendingBusinessName.trim()) ||
    (pendingStreet && pendingStreet.trim()) ||
    (pendingCity && pendingCity.trim()) ||
    (pendingState && pendingState.trim()) ||
    (pendingZip && pendingZip.trim())
  );
  if (!hasIdentityChange) {
    throw new Error('Provide at least one pending name or address field to verify.');
  }

  await graphql(
    `
      mutation UB($input: UpdateBusinessInput!) {
        updateBusiness(input: $input) {
          id
        }
      }
    `,
    {
      input: {
        id: businessId,
        verificationStatus: 'UNDER_REVIEW',
        verificationDocumentKeys: documentKeys,
        pendingBusinessName: pendingBusinessName?.trim() || undefined,
        pendingStreet: pendingStreet?.trim() || undefined,
        pendingCity: pendingCity?.trim() || undefined,
        pendingState: pendingState?.trim() || undefined,
        pendingZip: pendingZip?.trim() || undefined,
        verificationSubmittedAt: new Date().toISOString(),
      },
    }
  );
  await createAdminNotification(
    'FLAG_CREATED',
    'Business verification requested',
    `Business ${biz.getBusiness.businessName ?? businessId} submitted documents for name/address change.`,
    businessId,
    'BUSINESS'
  );
  await appendActivityLog(identity, 'REQUEST_BUSINESS_VERIFICATION', 'BUSINESS', businessId, {});
  await sendModerationEmail(
    'Business verification requested',
    `Business ${businessId} submitted profile verification with documents.`
  );
  return true;
}

async function adminResolveBusinessVerification(event: ResolverEvent) {
  const identity = requireAdminUser(event);
  const businessId = String(event.arguments?.businessId ?? '').trim();
  const decision = String(event.arguments?.decision ?? '').trim().toUpperCase();
  const adminNotesRaw = event.arguments?.adminNotes;
  const adminNotes =
    typeof adminNotesRaw === 'string' && adminNotesRaw.trim().length > 0 ? adminNotesRaw.trim() : null;

  if (!businessId) throw new Error('businessId is required.');
  if (decision !== 'APPROVE' && decision !== 'REJECT') throw new Error('decision must be APPROVE or REJECT');

  const biz = await graphql<{
    getBusiness: {
      id: string;
      businessName: string;
      contactEmail: string;
      street?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      pendingBusinessName?: string | null;
      pendingStreet?: string | null;
      pendingCity?: string | null;
      pendingState?: string | null;
      pendingZip?: string | null;
    } | null;
  }>(
    `
      query GB3($id: ID!) {
        getBusiness(id: $id) {
          id
          businessName
          contactEmail
          street
          city
          state
          zip
          pendingBusinessName
          pendingStreet
          pendingCity
          pendingState
          pendingZip
        }
      }
    `,
    { id: businessId }
  );
  if (!biz.getBusiness) throw new Error('Business not found.');

  const emailTo = biz.getBusiness.contactEmail;

  if (decision === 'APPROVE') {
    const nextName = biz.getBusiness.pendingBusinessName?.trim() || biz.getBusiness.businessName;
    await graphql(
      `
        mutation UB2($input: UpdateBusinessInput!) {
          updateBusiness(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          id: businessId,
          businessName: nextName,
          street: biz.getBusiness.pendingStreet ?? biz.getBusiness.street,
          city: biz.getBusiness.pendingCity ?? biz.getBusiness.city,
          state: biz.getBusiness.pendingState ?? biz.getBusiness.state,
          zip: biz.getBusiness.pendingZip ?? biz.getBusiness.zip,
          verificationStatus: 'APPROVED',
          verified: true,
          pendingBusinessName: null,
          pendingStreet: null,
          pendingCity: null,
          pendingState: null,
          pendingZip: null,
          verificationDocumentKeys: null,
        },
      }
    );
    await sendModerationEmail(
      'Your business verification was approved',
      `Your business profile changes for ${nextName} were approved.${adminNotes ? ` Notes: ${adminNotes}` : ''}`,
      [emailTo]
    );
  } else {
    await graphql(
      `
        mutation UB3($input: UpdateBusinessInput!) {
          updateBusiness(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          id: businessId,
          verificationStatus: 'APPROVED',
          pendingBusinessName: null,
          pendingStreet: null,
          pendingCity: null,
          pendingState: null,
          pendingZip: null,
          verificationDocumentKeys: null,
        },
      }
    );
    await sendModerationEmail(
      'Your business verification was rejected',
      `Your requested name or address changes for ${biz.getBusiness.businessName} were not approved.${adminNotes ? ` Notes: ${adminNotes}` : ''}`,
      [emailTo]
    );
  }

  await appendActivityLog(identity, `BUSINESS_VERIFY_${decision}`, 'BUSINESS', businessId, {
    adminNotes: adminNotes ?? '',
  });
  return true;
}

async function adminRemoveReview(event: ResolverEvent) {
  const identity = requireAdminUser(event);
  const reviewId = String(event.arguments?.reviewId ?? '').trim();
  if (!reviewId) throw new Error('reviewId is required.');

  const rev = await graphql<{ getReview: { id: string; businessId: string } | null }>(
    `
      query GR3($id: ID!) {
        getReview(id: $id) {
          id
          businessId
        }
      }
    `,
    { id: reviewId }
  );
  if (!rev.getReview) throw new Error('Review not found.');

  await graphql(
    `
      mutation UR3($input: UpdateReviewInput!) {
        updateReview(input: $input) {
          id
        }
      }
    `,
    { input: { id: reviewId, moderationStatus: 'removed' } }
  );
  await recalculateBusinessReviewStats(rev.getReview.businessId);
  await appendActivityLog(identity, 'ADMIN_REMOVE_REVIEW', 'REVIEW', reviewId, {});
  await sendModerationEmail('Review removed by admin', `Review ${reviewId} was marked removed.`);
  return true;
}

async function adminRemoveBusiness(event: ResolverEvent) {
  const identity = requireAdminUser(event);
  const businessId = String(event.arguments?.businessId ?? '').trim();
  if (!businessId) throw new Error('businessId is required.');

  const biz = await graphql<{ getBusiness: { contactEmail?: string | null; businessName?: string | null } | null }>(
    `
      query GB4($id: ID!) {
        getBusiness(id: $id) {
          contactEmail
          businessName
        }
      }
    `,
    { id: businessId }
  );

  const reviews = await listAllReviewsForBusiness(businessId);
  for (const r of reviews) {
    await graphql(
      `
        mutation DR($input: DeleteReviewInput!) {
          deleteReview(input: $input) {
            id
          }
        }
      `,
      { input: { id: r.id } }
    );
  }

  await graphql(
    `
      mutation DB($input: DeleteBusinessInput!) {
        deleteBusiness(input: $input) {
          id
        }
      }
    `,
    { input: { id: businessId } }
  );

  await appendActivityLog(identity, 'ADMIN_REMOVE_BUSINESS', 'BUSINESS', businessId, {});
  const notify = biz.getBusiness?.contactEmail;
  if (notify) {
    await sendModerationEmail(
      'Your business was removed',
      `The business listing "${biz.getBusiness?.businessName ?? businessId}" was removed by an administrator.`,
      [notify]
    );
  }
  await sendModerationEmail(`Business ${businessId} removed`, `Admin removed business ${businessId}.`);
  return true;
}

async function adminRemoveUser(event: ResolverEvent) {
  const identity = requireAdminUser(event);
  const userId = String(event.arguments?.userId ?? '').trim();
  if (!userId) throw new Error('userId is required.');

  const u = await graphql<{ getUser: { email?: string | null; name?: string | null } | null }>(
    `
      query GU($id: ID!) {
        getUser(id: $id) {
          email
          name
        }
      }
    `,
    { id: userId }
  );

  await graphql(
    `
      mutation DU($input: DeleteUserInput!) {
        deleteUser(input: $input) {
          id
        }
      }
    `,
    { input: { id: userId } }
  );

  await appendActivityLog(identity, 'ADMIN_REMOVE_USER', 'USER', userId, {});
  const email = u.getUser?.email;
  if (email) {
    await sendModerationEmail(
      'Your account was removed',
      `Hello ${u.getUser?.name ?? ''}, your Uplift account has been removed by an administrator.`,
      [email]
    );
  }
  await sendModerationEmail(`User ${userId} removed`, `Admin removed user record ${userId}.`);
  return true;
}

async function listAdminActivityLog(event: ResolverEvent) {
  requireAdminUser(event);
  const result = await graphql<{
    listAdminNotifications: { items: Array<Record<string, unknown>> };
  }>(
    `
      query LAL2($filter: ModelAdminNotificationFilterInput, $limit: Int) {
        listAdminNotifications(filter: $filter, limit: $limit) {
          items {
            id
            type
            title
            message
            relatedId
            relatedType
            createdAt
          }
        }
      }
    `,
    {
      filter: { type: { eq: 'ADMIN_ACTIVITY' } },
      limit: 100,
    }
  );
  const items = (result.listAdminNotifications.items ?? []).sort(
    (a, b) =>
      new Date(String(b.createdAt ?? 0)).getTime() - new Date(String(a.createdAt ?? 0)).getTime()
  );
  return items.slice(0, 10).map((row) => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(String(row.message ?? '{}')) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    return {
      id: String(row.id),
      actorId: String(parsed.actorId ?? ''),
      actorName: parsed.actorName != null ? String(parsed.actorName) : undefined,
      action: String(parsed.action ?? row.title ?? ''),
      targetType: parsed.targetType != null ? String(parsed.targetType) : undefined,
      targetId: parsed.targetId != null ? String(parsed.targetId) : undefined,
      metadata: JSON.stringify(
        Object.fromEntries(
          Object.entries(parsed).filter(
            ([k]) => !['actorId', 'actorName', 'action', 'targetType', 'targetId'].includes(k)
          )
        )
      ),
      createdAt: String(row.createdAt ?? ''),
    };
  });
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await client.graphql({
    query,
    variables,
    authMode: 'iam',
  } as never);

  const errors = (response as { errors?: Array<{ message?: string }> }).errors;
  if (errors && errors.length > 0) {
    throw new Error(errors.map((err) => err.message ?? 'Unknown GraphQL error').join('; '));
  }

  return (response as { data: T }).data;
}
