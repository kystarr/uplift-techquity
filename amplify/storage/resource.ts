import { defineStorage } from '@aws-amplify/backend';

/**
 * Sprint 2 (F5.1): Business verification document upload storage.
 *
 * Owners can read/write/delete only files in their own identity-scoped prefix.
 */
export const storage = defineStorage({
  name: 'businessVerificationDocs',
  access: (allow) => ({
    'verification-documents/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
