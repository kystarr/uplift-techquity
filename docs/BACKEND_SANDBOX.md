# Amplify sandbox and shared backend

The frontend reads **`amplify_outputs.json`** at build time (`src/main.tsx`). That file decides **which** Cognito user pool, AppSync API, and DynamoDB tables the app uses—not `npm run dev` by itself.

Each `npx ampx sandbox` deployment is **isolated** by **sandbox identifier**. If everyone runs plain `ampx sandbox` with different defaults, you get different databases.

## Which backend is “dev”?

Whatever is **committed on the branch you deploy** (e.g. `dev`) is what Vercel and teammates see after they pull—unless you replace `amplify_outputs.json` locally without committing.

To work against the **same** stack as the team, use the same **`--identifier`** and regenerate `amplify_outputs.json` from that sandbox.

## Team identifiers (this repo)

| Use case | Git branch | Command |
|----------|------------|---------|
| Shared dev / main sandbox for `dev` | `dev` | `npm run backend:sandbox:hgoll` (or `npx ampx sandbox --identifier hgoll`) |
| Darius moderation work | `backend/moderation` | `npm run backend:sandbox:darius` (or `npx ampx sandbox --identifier dariusvalere`) |

The **`hgoll`** name comes from the Amplify sandbox CloudFormation stack pattern on this project (`amplify-*-hgoll-sandbox-*`). If your stack name in AWS uses a different segment, use that identifier instead.

## Typical local workflow

1. AWS credentials (e.g. IAM Identity Center): `aws sso login` or your org’s profile.
2. From the repo root, start the backend (leave it running):

   ```bash
   npm run backend:sandbox:hgoll
   ```

3. In another terminal:

   ```bash
   npm run dev
   ```

4. Optional: seed the admin user (Cognito + DynamoDB `User` row). You need **`amplify_outputs.json`** from this sandbox (run `npx ampx sandbox --once --identifier hgoll` if you only need to deploy and refresh outputs):

   ```bash
   node scripts/seed-admin.mjs
   ```

   Default admin (unless overridden by env): `admin@uplift.local` / `Admin123!`  
   IAM must allow Cognito admin APIs on this user pool. The script signs in with the admin password to create the `User` row (owner-based auth).

5. **Uplift chat assistant (Gemini):** the `chatWithAssistant` mutation runs in Lambda and needs a Google API key in **SSM** (Amplify secret), not in the Vite `.env`:

   ```bash
   npx ampx sandbox secret set GEMINI_API_KEY
   ```

   Paste the key when prompted. Redeploy or let the running sandbox pick it up as documented for secrets.

## Who updates `amplify_outputs.json`?

After **auth or data schema** changes, the person who deploys the agreed sandbox should run sandbox once and **commit** the updated `amplify_outputs.json` so `dev` and Vercel stay in sync.

## Finding your identifier in AWS

In **CloudFormation**, open stacks whose names look like `amplify-<...>-<identifier>-sandbox-<id>`. The **`<identifier>`** segment is what you pass to `--identifier`.
