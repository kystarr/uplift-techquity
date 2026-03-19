import { defineStorage } from '@aws-amplify/backend';

/**
 * Sprint 2 (F5.1): Business verification document upload storage.
 *
 * S3 key pattern used when uploading documents:
 *   verification-documents/{entity_id}/{timestamp}-{filename}
 *
 * {entity_id} maps to the Cognito identity ID (via allow.entity('identity')).
 * The resulting S3 key is stored on the Business record as verificationDocumentKey.
 *
 * Owners can read/write/delete only files under their own identity-scoped prefix.
 * Guest users have no storage access — document access is owner-only.
 */
export const storage = defineStorage({
  name: 'businessVerificationDocs',
  access: (allow) => ({
    'verification-documents/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
