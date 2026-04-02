import { defineFunction } from '@aws-amplify/backend';

/**
 * Central moderation function that powers secure flagging/admin moderation operations.
 */
export const moderation = defineFunction({
  name: 'moderation',
  entry: './handler.ts',
  depsLockFilePath: '../../package-lock.json',
});
