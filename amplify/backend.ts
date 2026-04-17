import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { postConfirmation } from './functions/post-confirmation/resource';
import { moderation } from './functions/moderation/resource';
import { chatAssistant } from './functions/chat-assistant/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  postConfirmation,
  moderation,
  chatAssistant,
  storage,
});

backend.moderation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);