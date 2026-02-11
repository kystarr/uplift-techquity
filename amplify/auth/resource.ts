// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    // This MUST match what the frontend sends
    "custom:role": {
      dataType: "String",
      mutable: true,
    },
  },
});