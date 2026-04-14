import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * Grounded chat: loads approved Business rows from DynamoDB and calls Gemini on the server.
 * Set secret once per sandbox / branch: `npx ampx sandbox secret set GEMINI_API_KEY`
 */
export const chatAssistant = defineFunction({
  name: 'chat-assistant',
  entry: './handler.ts',
  depsLockFilePath: '../../package-lock.json',
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    GEMINI_API_KEY: secret('GEMINI_API_KEY'),
    GEMINI_MODEL: 'gemini-2.5-flash',
  },
});
