# Cursor Migration Guide: Uplift Techquity

This document provides an overview of the Uplift Techquity codebase and step-by-step instructions to disconnect from Lovable.dev and run the application in a local development environment.

---

## Codebase Overview

### Project Summary

**Uplift** is a React web application that helps users discover and connect with minority-owned businesses. The app enables discovery, favoriting, and messaging with Black-owned and minority-owned businesses in the community.

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool and dev server |
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **React Router v6** | Client-side routing |
| **shadcn/ui** | UI component library (Radix-based) |
| **Tailwind CSS** | Styling |
| **TanStack Query** | Server state management |
| **React Hook Form + Zod** | Form handling and validation |

### Project Structure

```
uplift-techquity/
├── src/
│   ├── App.tsx           # Root component, routing, providers
│   ├── main.tsx          # Entry point
│   ├── index.css         # Global styles
│   ├── pages/            # Route-level components
│   │   ├── Index.tsx     # Home / landing page
│   │   ├── Search.tsx    # Business search
│   │   ├── Auth.tsx      # Authentication (login/signup)
│   │   ├── Favorites.tsx # Saved businesses
│   │   ├── MessagesInbox.tsx
│   │   ├── Messages.tsx
│   │   └── NotFound.tsx
│   ├── components/       # Reusable UI
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Hero.tsx
│   │   ├── Navigation.tsx
│   │   ├── FeaturesSection.tsx
│   │   └── BusinessCard.tsx
│   ├── hooks/
│   └── lib/utils.ts
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── components.json       # shadcn/ui config
```

### Key Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Index | Landing page |
| `/search` | Search | Business search |
| `/auth` | Auth | Login/signup |
| `/favorites` | Favorites | Saved businesses |
| `/messages` | MessagesInbox | Message list |
| `/messages/:businessId` | Messages | Conversation view |

---

## Lovable Dependencies Identified

The following Lovable-specific items were found in the codebase:

1. **`lovable-tagger`** (package.json) — Dev dependency that injects component metadata for Lovable’s IDE
2. **vite.config.ts** — Uses `componentTagger()` from lovable-tagger
3. **index.html** — Meta tags pointing to Lovable’s Open Graph image and Twitter handle
4. **README.md** — Lovable-focused project documentation

---

## Step-by-Step Migration Plan

### Step 1: Remove `lovable-tagger` from vite.config.ts

Edit `vite.config.ts` and remove the Lovable plugin:

**Before:**
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

**After:**
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Step 2: Remove `lovable-tagger` from package.json

Remove the `lovable-tagger` entry from `devDependencies` in `package.json`:

```json
"devDependencies": {
  ...
  "lovable-tagger": "^1.1.11",   // DELETE THIS LINE
  ...
}
```

### Step 3: Update index.html meta tags

Replace Lovable-specific Open Graph and Twitter meta tags with project-appropriate values (or placeholders until you have your own assets):

**Before:**
```html
<meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
<meta name="twitter:site" content="@lovable_dev" />
<meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
```

**After** (example with placeholders):
```html
<meta property="og:image" content="/placeholder.svg" />
<meta name="twitter:site" content="@uplift_app" />
<meta name="twitter:image" content="/placeholder.svg" />
```

### Step 4: Reinstall dependencies

From the project root:

```sh
# If using npm
npm install

# If using bun (bun.lockb is present)
bun install
```

This updates the lockfile and removes `lovable-tagger` from `node_modules`.

### Step 5: Update README.md (optional)

Replace the Lovable-focused README with project-specific docs (e.g., local setup, scripts, deployment). The content below is a minimal example:

```markdown
# Uplift - Discover Minority-Owned Businesses

Connect with and support Black-owned and minority-owned businesses in your community.

## Local Development

1. Install dependencies: `npm install` or `bun install`
2. Start the dev server: `npm run dev` or `bun dev`
3. Open http://localhost:8080
```

### Step 6: Verify the app runs locally

```sh
npm run dev
# or
bun run dev
```

Then open http://localhost:8080 and confirm the app loads and routes work.

---

## Post-Migration Checklist

- [ ] `lovable-tagger` removed from package.json
- [ ] `vite.config.ts` no longer imports or uses lovable-tagger
- [ ] index.html meta tags updated (no lovable.dev references)
- [ ] `npm install` or `bun install` run successfully
- [ ] `npm run dev` / `bun run dev` starts the app
- [ ] App loads at http://localhost:8080
- [ ] (Optional) README.md updated for local development

---

## Additional Notes

- **No backend**: The app appears to be frontend-only. Any API calls or data persistence may rely on mock data or external services.
- **Port**: The dev server is configured for port 8080.
- **Package manager**: Both `package-lock.json` and `bun.lockb` exist; use the one that matches your workflow.
- **shadcn/ui**: `components.json` configures shadcn; add new components with `npx shadcn@latest add <component>`.
