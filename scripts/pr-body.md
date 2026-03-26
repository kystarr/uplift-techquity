## Summary

This branch implements three major user-facing feature areas on top of the existing business search and profile pages.

### Reviews
- **Amplify schema**: Added `Review` model (owner create/delete, authenticated + guest read) and `reviewCount` / `averageRating` recalculation on `Business`
- **`useReviews` hook**: Fetches all reviews for a business; on submit creates a `Review` record then recalculates `Business.averageRating` and `Business.reviewCount`
- **`ReviewForm` component**: Auth-gated — guests see a "Sign in to leave a review" prompt; authenticated users get a 1–5 interactive star selector, optional comment field, and a **"Include my name"** checkbox (checked by default). When checked, the display name is pulled from Cognito attributes and formatted as `First L.`; unchecked posts as `Anonymous Customer`
- Reviews appear live on the business profile page beneath the existing preview card

### Search Filters & Distance
- **`useUserLocation` hook**: Lazy geolocation — never auto-prompts; supports two input methods: browser GPS and zip code lookup via Nominatim (OpenStreetMap, no API key required)
- **`SearchFilters` sheet**: Slide-over panel wired to the existing Filters button with category multi-select, minimum star rating picker, and sort-by radio (Relevance / Rating high to low / Distance near to far). When Distance is selected, the user can tap "Use GPS" or switch to a zip code input
- **Haversine distance**: Calculated client-side from pre-stored `latitude`/`longitude` on each Business record; shown as `X.X mi` on every card when a location is set
- **Addresses seeded**: All 6 businesses now have real DC/VA/MD street addresses and coordinates in DynamoDB. Addresses also display on each business profile contact card

### Favorites
- **Amplify schema**: Added `Favorite` model (owner-only) storing a denormalized business snapshot including lat/lng so distance can be shown without extra API calls
- **`useFavorites` hook**: Loads the current user's favorites on mount; `toggleFavorite` adds or removes a record from DynamoDB. Unauthenticated users are not prompted
- **Heart button on `BusinessCard`**: Converted from local state to controlled props (`isFavorite`, `onToggleFavorite`). For unauthenticated users, clicking the heart redirects to `/auth`
- **Favorites page** (`/favorites`): Redirects guests to `/auth`; shows a grid of saved businesses with live distance labels; unfavoriting from this page removes the card immediately

### Bug fix
- Fixed an auth mode ordering bug where all data hooks tried `iam` first, which fails for signed-in users. The new priority is `userPool` then `iam` then `apiKey`, matching the Amplify authorization rules on each model

## Test plan
- [ ] Sign in and navigate to a business profile — verify review form appears, star selector works, name toggles correctly, and submitting a review updates the rating
- [ ] Sign out and verify the review form shows "Sign in to leave a review"
- [ ] On the Search page, open Filters and select Distance — verify GPS prompt and zip code input both work and cards show distance in miles
- [ ] Filter by category and minimum rating — verify results update correctly
- [ ] Click the heart on a business card while signed in — verify it fills red and appears on `/favorites`
- [ ] Click the heart again — verify it removes from favorites
- [ ] Navigate to `/favorites` while signed out — verify redirect to `/auth`
- [ ] Visit a business profile and verify the address appears in the Contact card
