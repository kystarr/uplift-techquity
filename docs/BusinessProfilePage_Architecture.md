# Business Profile Page — Architecture

## Data flow

1. **Route**: User hits `/business/:id`. `BusinessProfilePage` reads `id` via `useParams()`.
2. **Hook**: `useBusinessProfile(id)` runs on mount and when `id` changes. It:
   - Sets `loading` true, clears previous error.
   - Fetches `GET /api/business/:id` (via `getApiUrl` in `lib/api.ts`).
   - On success: sets `business` with the response, clears error.
   - On failure: sets `error`, clears `business`.
   - Always sets `loading` false in `finally`.
3. **Page**:
   - If `loading`: render `BusinessProfileSkeleton` (same approximate layout as profile).
   - If `error` or no `business`: render `ErrorState` with optional retry calling `refetch()`.
   - Otherwise: render `BusinessProfileLayout` with `business` and optional `reviewsPreview` / `reviewCount`.

Data is single-direction: URL → hook → page → layout. No global state required for the public profile.

## Why hook abstraction was used

- **Separation of concerns**: The page component only decides what to render (skeleton, error, or layout). All fetch logic, loading/error state, and refetch live in `useBusinessProfile`. This makes the page easy to read and test.
- **Reusability**: The same hook can be used from a modal, a dashboard widget, or an SSR wrapper; the page stays a thin orchestrator.
- **Testability**: You can mock `useBusinessProfile` in page tests and test the hook in isolation with a mock fetch.
- **Future caching**: When you add TanStack Query (or similar), you can replace the internal state in `useBusinessProfile` with `useQuery` without changing the page or layout components.

## Rendering safety decisions

- **No layout shift**: While loading, we render `BusinessProfileSkeleton` instead of nothing or a spinner. The skeleton mirrors the profile structure (breadcrumb, header, gallery grid, description, contact/reviews area) so when real content replaces it, the page doesn’t jump.
- **Stable structure for error**: On error we render `ErrorState` (centered message + optional retry). We don’t flash the layout first; we go straight to skeleton → content or skeleton → error.
- **No content flash**: We don’t render `BusinessProfileLayout` until we have `business`. So we never show partial or empty profile data.
- **Refetch**: Retry is done via the same hook (`refetch`), so loading runs again and the user sees the skeleton (or a dedicated loading state on the error view, if we add it later) instead of stale content.

## Future improvements

- **Caching**: Use TanStack Query’s `useQuery` in `useBusinessProfile` with `staleTime` so repeated visits or back-navigation don’t refetch unnecessarily.
- **Pagination**: When reviews come from a separate endpoint, pass `reviewsPreview` and `reviewCount` from a second hook or from the same API response; layout stays unchanged.
- **Prefetch**: On search results, prefetch `/api/business/:id` when the user hovers a business card to make the profile open faster.
