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
 *
 * Guest (unauthenticated) business registration uploads verification PDFs using the
 * same identity-scoped keys. The unauthenticated IAM role needs explicit `guest` write
 * here; `entity('identity')` alone can yield PutObject 403 for guests.
 */
export const storage = defineStorage({
  name: 'businessVerificationDocs',
  access: (allow) => ({
    'verification-documents/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.guest.to(['write']),
    ],
    'business-media/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
    ],
    'profile-avatars/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
    ],
  }),
});
