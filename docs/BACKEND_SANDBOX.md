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

4. Optional: seed the admin user (Cognito + GraphQL) after the sandbox is up:

   ```bash
   node scripts/seed-admin.mjs
   ```

   Default admin (unless overridden by env): `admin@uplift.local` / `Admin123!`

## Who updates `amplify_outputs.json`?

After **auth or data schema** changes, the person who deploys the agreed sandbox should run sandbox once and **commit** the updated `amplify_outputs.json` so `dev` and Vercel stay in sync.

## Finding your identifier in AWS

In **CloudFormation**, open stacks whose names look like `amplify-<...>-<identifier>-sandbox-<id>`. The **`<identifier>`** segment is what you pass to `--identifier`.
