import { uploadData } from 'aws-amplify/storage';
import { fetchAuthSession } from 'aws-amplify/auth';
import { amplifyDataClient } from '../amplifyDataClient';
import type { Schema } from '../../amplify/data/resource';
import type { Step1BusinessInfoValues } from './validations/register';

/**
 * Creates a Business record from the multi-step registration flow.
 * Handles Step 2 document uploads and persists Step 1 data to DynamoDB.
 *
 * Signed-in users: `ownerId` is Cognito `sub`; create uses user pool auth.
 * Guests: omit `ownerId`; create uses IAM (unauthenticated identity) per schema `allow.guest().to(['create'])`.
 */
export async function createBusinessFromRegistration(input: {
  step1: Step1BusinessInfoValues;
  ownerId?: string;
  documents?: File[];
}): Promise<any> {
  const { step1, ownerId, documents = [] } = input;

  const displayName = step1.businessName.trim();
  const contactName = `${step1.ownerFirstName} ${step1.ownerLastName}`.trim();

  // 1. Upload verification documents to S3
  let verificationDocumentKey: string | undefined;
  let verificationDocumentKeys: string[] = [];

  if (documents.length > 0) {
    const session = await fetchAuthSession();
    const identityId = session.identityId;

    if (!identityId) {
      throw new Error('Could not resolve identity ID for document upload.');
    }

    const uploadedResults = await Promise.all(
      documents.map(async (file) => {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `verification-documents/${identityId}/${timestamp}-${safeName}`;

        await uploadData({
          path: key,
          data: file,
          options: { contentType: file.type || 'application/octet-stream' }
        }).result;

        return key;
      })
    );
    verificationDocumentKeys = uploadedResults;
    verificationDocumentKey = uploadedResults[0];
  }

  // 2. Create Business record in DynamoDB
  // Using explicit property assignment and normalizing empties to undefined
  const authMode = ownerId ? ('userPool' as const) : ('iam' as const);

  const createInput = {
    businessName: displayName,
    legalBusinessName: displayName,
    businessType: step1.category,
    contactName: contactName,
    contactEmail: step1.email,
    ...(ownerId ? { ownerId } : {}),

    phone: step1.phone || undefined,
    website: step1.website || undefined,
    description: step1.description || undefined,
    street: step1.street || undefined,
    city: step1.city || undefined,
    state: step1.state || undefined,
    zip: step1.zip || undefined,

    images: [] as string[],
    tags: [] as string[],
    categories: step1.category ? [step1.category] : [] as string[],

    averageRating: 0,
    verified: false,
    verificationStatus: 'UNDER_REVIEW',
    verificationSubmittedAt: new Date().toISOString(),
    verificationDocumentKey: verificationDocumentKey || undefined,
    verificationDocumentKeys,
  };

  const { data, errors } = await (amplifyDataClient.models.Business.create as any)(createInput, {
    authMode,
  });

  if (errors && errors.length > 0) {
    throw new Error(errors[0].message || 'Failed to create business');
  }

  if (!data) {
    throw new Error('No data returned on create');
  }

  return data;
}
