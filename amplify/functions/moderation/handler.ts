import type { AppSyncResolverEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
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
    case 'createFlag':
      return createFlag(event);
    case 'listFlagsForAdmin':
      return listFlagsForAdmin(event);
    case 'resolveFlag':
      return resolveFlag(event);
    case 'flagCountsForAdmin':
      return flagCountsForAdmin(event);
    default:
      throw new Error(`Unsupported moderation operation: ${String(fieldName)}`);
  }
};

async function createFlag(event: ResolverEvent) {
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
  const status = typeof requestedStatus === 'string' && requestedStatus.trim().length > 0
    ? requestedStatus.trim().toUpperCase()
    : 'PENDING';

  if (!VALID_RESOLVABLE_STATUSES.has(status)) {
    throw new Error('Invalid status filter.');
  }

  const flags = await listAllFlags(status);

  const enriched = await Promise.all(
    flags.map(async (flag) => {
      const target = await getTarget(flag.targetType, flag.targetId);
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
