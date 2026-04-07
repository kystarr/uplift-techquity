# Remediation Plan: Modular Auth Service (Supabase/Firebase)

**Objective:** Refactor simulated authentication into a modular, production-ready auth service to address technical debt.

**Current State:** `Auth.tsx` uses `setTimeout` to simulate auth; no real backend, no session management, no protected routes.

---

## 1. Technology Choice: Supabase vs Firebase

| Factor | Supabase | Firebase Auth |
|--------|----------|---------------|
| **Auth model** | JWT + RLS, PostgreSQL-backed | Proprietary, Firestore-optional |
| **BaaS** | Auth + DB + Storage + Realtime | Auth + Firestore + Storage |
| **Self-hosting** | Yes (open source) | No |
| **Row-level security** | Built-in with Postgres | Requires Firestore rules |
| **Magic links / OAuth** | Yes | Yes |
| **Cost** | Generous free tier | Generous free tier |
| **Fit for Uplift** | Strong if you add business DB later | Strong if you stay serverless |

**Recommendation:** **Supabase** — better fit for a business discovery app that will need user profiles, favorites, and messages backed by a relational store. Firebase is preferable if you want minimal backend and only auth + Firestore.

---

## 2. Target Architecture

```
src/
├── services/
│   └── auth/
│       ├── index.ts              # Public API
│       ├── authClient.ts         # Supabase/Firebase client init
│       ├── authService.ts        # Sign in, sign up, sign out, session
│       ├── authTypes.ts          # User, Session, AuthError types
│       └── authConfig.ts         # Env-based config
├── contexts/
│   └── AuthContext.tsx           # React context + provider
├── hooks/
│   ├── useAuth.ts                # Consume AuthContext
│   └── useRequireAuth.ts         # Redirect to /auth if unauthenticated
├── components/
│   └── ProtectedRoute.tsx        # Route guard component
└── pages/
    └── Auth.tsx                  # UI only, delegates to authService
```

**Principles:**
- **Single responsibility:** Auth logic lives in `services/auth/`; UI in `pages/` and `components/`.
- **Dependency injection:** `authClient` is initialized once; `authService` uses it. Easy to mock for tests.
- **Explicit API:** `authService.signIn()`, `authService.signUp()`, etc. No auth logic in UI components.
- **Environment config:** All URLs and keys from `import.meta.env.VITE_*`.

---

## 3. Implementation Phases

### Phase 1: Project Setup (Est. 0.5 day)

| Step | Action |
|------|--------|
| 1.1 | Create Supabase (or Firebase) project at [supabase.com](https://supabase.com) |
| 1.2 | Enable Email/Password auth in dashboard |
| 1.3 | Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| 1.4 | Add `.env.local` to `.gitignore` (confirm already ignored) |
| 1.5 | Install dependency: `npm install @supabase/supabase-js` (or `firebase` for Firebase) |
| 1.6 | Add `src/vite-env.d.ts` declaration for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |

**Deliverable:** Environment configured; client SDK installed; no runtime changes yet.

---

### Phase 2: Auth Service Layer (Est. 1 day)

| Step | Action |
|------|--------|
| 2.1 | Create `src/services/auth/authConfig.ts` — read `import.meta.env`, validate presence of keys |
| 2.2 | Create `src/services/auth/authClient.ts` — initialize Supabase client, export singleton |
| 2.3 | Create `src/services/auth/authTypes.ts` — `User`, `Session`, `AuthError` (or map from SDK types) |
| 2.4 | Create `src/services/auth/authService.ts` with: |
| | `signIn(email, password): Promise<{ user, session }>` |
| | `signUp(email, password, metadata?: { full_name })` |
| | `signOut(): Promise<void>` |
| | `getSession(): Promise<Session | null>` |
| | `onAuthStateChange(callback): () => void` (unsubscribe) |
| 2.5 | Create `src/services/auth/index.ts` — re-export only public API |
| 2.6 | Add unit tests (Vitest) for `authService` with mocked client |

**Deliverable:** Modular auth service with no UI; can be tested in isolation.

---

### Phase 3: Auth Context & Provider (Est. 0.5 day)

| Step | Action |
|------|--------|
| 3.1 | Create `src/contexts/AuthContext.tsx`: |
| | `AuthProvider` — wraps app, subscribes to `onAuthStateChange`, holds `{ user, session, isLoading }` |
| | Expose via `React.createContext` |
| 3.2 | Create `src/hooks/useAuth.ts` — `useContext(AuthContext)` with null check |
| 3.3 | Wrap `App.tsx` with `AuthProvider` (inside `QueryClientProvider`, outside `BrowserRouter`) |
| 3.4 | Ensure `AuthProvider` handles initial session fetch and loading state |

**Deliverable:** App-wide auth state; any component can call `useAuth()`.

---

### Phase 4: Refactor Auth Page (Est. 1 day)

| Step | Action |
|------|--------|
| 4.1 | Wire forms with React Hook Form + Zod (already in deps): |
| | Sign in: `{ email, password }` with zod schema |
| | Sign up: `{ full_name, email, password }` with min length, email validation |
| 4.2 | Replace `handleSubmit` with calls to `authService.signIn` / `authService.signUp` |
| 4.3 | Handle errors: map Supabase/Firebase errors to user-friendly messages (e.g., "Invalid login") |
| 4.4 | On success: `toast()` + `navigate("/")` or `navigate(from)` if redirect state exists |
| 4.5 | Persist tab state: use `Tabs` `value` + `onValueChange` so Sign In vs Sign Up is preserved on error |
| 4.6 | Add "Forgot password?" link wired to `authService.resetPassword(email)` (optional) |

**Deliverable:** Auth page fully functional with real auth; forms validated; errors surfaced.

---

### Phase 5: Protected Routes & Navigation (Est. 0.5 day)

| Step | Action |
|------|--------|
| 5.1 | Create `src/components/ProtectedRoute.tsx`: |
| | Accept `children` and optional `fallback` |
| | If `!user` and `!isLoading`, redirect to `/auth` with `state: { from: location }` |
| | If loading, render `fallback` (spinner/skeleton) |
| | Otherwise render `children` |
| 5.2 | Create `src/hooks/useRequireAuth.ts` — same logic as hook for pages that need it |
| 5.3 | Wrap protected routes in `App.tsx`: |
| | `/favorites` → `<ProtectedRoute><Favorites /></ProtectedRoute>` |
| | `/messages` → `<ProtectedRoute><MessagesInbox /></ProtectedRoute>` |
| | `/messages/:businessId` → `<ProtectedRoute><Messages /></ProtectedRoute>` |
| 5.4 | Update `Navigation.tsx`: |
| | If `user` → show avatar + dropdown (Profile, Sign Out) instead of "Sign In" |
| | If `!user` → show "Sign In" button |
| 5.5 | Update `Auth.tsx`: if already signed in, redirect to `/` or `from` |

**Deliverable:** Favorites and Messages require auth; Navigation reflects session.

---

### Phase 6: Security Hardening (Est. 0.5 day)

| Step | Action |
|------|--------|
| 6.1 | **Token storage:** Supabase uses `localStorage` by default. For production, consider Supabase's PKCE flow or custom backend that sets `httpOnly` cookies. Document as future improvement. |
| 6.2 | **Password requirements:** Enforce in Zod (e.g., min 8 chars, 1 number). Align with Supabase/Firebase password policy. |
| 6.3 | **Email confirmation:** Enable in Supabase dashboard; show "Check your email" after signup if required. |
| 6.4 | **Redirect URL allowlist:** Configure in Supabase Auth settings for production domain(s). |
| 6.5 | **Error sanitization:** Never expose raw error messages (e.g., "Email not found"); use generic "Invalid email or password" for sign-in. |

**Deliverable:** Security checklist completed; known limitations documented.

---

### Phase 7: Integration with Favorites & Messages (Est. 1 day)

| Step | Action |
|------|--------|
| 7.1 | **Favorites:** Replace "Sign in to save" with: if `user`, show empty state or fetch favorites from Supabase/Firebase; if `!user`, show CTA to sign in (handled by ProtectedRoute). |
| 7.2 | **Messages:** When backend exists, pass `user.id` or session token to API. No changes needed in UI structure yet. |
| 7.3 | **BusinessCard favorite button:** Wire to `authService` or a `useFavorites` hook that uses Supabase. Defer to later phase if no favorites API yet. |

**Deliverable:** Favorites and Messages aware of auth; ready for future backend integration.

---

## 4. File-by-File Checklist

| File | Action |
|------|--------|
| `src/services/auth/authConfig.ts` | **Create** — env config |
| `src/services/auth/authClient.ts` | **Create** — Supabase/Firebase init |
| `src/services/auth/authTypes.ts` | **Create** — types |
| `src/services/auth/authService.ts` | **Create** — sign in/up/out, session, listener |
| `src/services/auth/index.ts` | **Create** — public exports |
| `src/contexts/AuthContext.tsx` | **Create** — provider + context |
| `src/hooks/useAuth.ts` | **Create** — consume context |
| `src/hooks/useRequireAuth.ts` | **Create** — redirect if unauthenticated |
| `src/components/ProtectedRoute.tsx` | **Create** — route guard |
| `src/pages/Auth.tsx` | **Refactor** — remove setTimeout, add RHF + Zod, call authService |
| `src/components/Navigation.tsx` | **Refactor** — conditional Sign In vs user menu |
| `src/App.tsx` | **Refactor** — add AuthProvider, wrap protected routes |
| `src/vite-env.d.ts` | **Update** — add env var types |
| `.env.local` | **Create** (local only) — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `package.json` | **Update** — add `@supabase/supabase-js` |

---

## 5. Zod Schemas (Reference)

```ts
// auth/schemas.ts
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
```

---

## 6. AuthService Interface (Reference)

```ts
// authService.ts — public interface
export interface AuthService {
  signIn(email: string, password: string): Promise<{ user: User; session: Session }>;
  signUp(email: string, password: string, metadata?: { full_name?: string }): Promise<{ user: User }>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  onAuthStateChange(callback: (event: string, session: Session | null) => void): () => void;
}
```

---

## 7. Migration & Rollback

| Scenario | Action |
|----------|--------|
| **Incremental rollout** | Keep `Auth.tsx` working; add auth service in parallel. Feature-flag real auth until tested. |
| **Rollback** | Remove `AuthProvider`; revert `Auth.tsx` to simulate with `setTimeout`; remove `ProtectedRoute` wrappers. Service layer can remain for future use. |
| **Env missing** | `authConfig` should throw on init if keys absent; app fails fast in dev. |

---

## 8. Testing Strategy

| Test type | Scope |
|-----------|-------|
| **Unit** | `authService` methods with mocked Supabase client |
| **Integration** | Auth flow: sign up → sign in → sign out, with test Supabase project |
| **Component** | `Auth` page with mocked `useAuth` |
| **E2E** | Playwright: full sign-in, navigate to Favorites, verify redirect when signed out |

---

## 9. Effort Estimate

| Phase | Estimate |
|-------|----------|
| Phase 1: Setup | 0.5 day |
| Phase 2: Auth service | 1 day |
| Phase 3: Context & provider | 0.5 day |
| Phase 4: Auth page refactor | 1 day |
| Phase 5: Protected routes & nav | 0.5 day |
| Phase 6: Security hardening | 0.5 day |
| Phase 7: Favorites/Messages integration | 1 day |
| **Total** | **~5 days** |

---

## 10. Success Criteria

- [ ] Sign in and sign up work against Supabase/Firebase
- [ ] Session persists across page refreshes
- [ ] Favorites and Messages require authentication
- [ ] Navigation shows Sign In vs user menu based on session
- [ ] Auth logic is isolated in `services/auth/`; no auth calls in UI components
- [ ] Form validation via Zod; errors shown to user
- [ ] No credentials or tokens logged or exposed in client code
