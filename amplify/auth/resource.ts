// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation/resource';

export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    // This MUST match what the frontend sends
    "custom:role": {
      dataType: "String",
      mutable: true,
    },
  },
  triggers: {
    postConfirmation: postConfirmation,
  },
});