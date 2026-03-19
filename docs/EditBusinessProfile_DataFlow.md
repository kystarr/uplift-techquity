# Edit Business Profile — Data Flow and Tradeoffs

## Validation architecture

- **Single source of truth**: `lib/validations/business.ts` exports `validateBusinessForm(values)` and `isBusinessFormValid(errors)`. All rules (required name/email/phone, email format, optional URL format, description max length) live there. No duplicate logic in the hook or form.
- **When validation runs**:
  1. **On demand**: The hook’s `save()` calls `validate()` at the start; if invalid, it sets errors and returns without calling the API.
  2. **For Save button state**: `saveDisabled` is derived as `!isBusinessFormValid(validateBusinessForm(values))`, so the button is disabled whenever the current values would fail validation.
  3. **Inline feedback**: When the user changes a field, the hook clears that field’s error (`setField` deletes the key from `errors`). Full validation runs again on the next `save()` or when deriving `saveDisabled`. We could add per-field validation on blur later without changing this structure.
- **No external validation library**: Requirements asked for inline validation without external libraries. We use plain functions and regex for email/URL; the same approach scales to more rules (e.g. Zod) later by replacing the implementation inside `validateBusinessForm`.

## State management strategy

- **Form state in the hook**: `useEditBusinessProfile` holds `values`, `errors`, `saving`, `saveError`. The page/form component is stateless for the edit flow; it only passes `businessId`, `business`, and callbacks.
- **Controlled inputs**: The layout receives `values` and `onChange(field, value)`. Every change goes through `setField`, which updates `values` and clears that field’s error. The layout never holds local state for the form.
- **Display vs edit mode**: Mode lives in the parent (e.g. `BusinessProfilePage` or a dashboard). The parent passes `mode` and `onModeChange` into `EditBusinessProfileForm`. After a successful save, the hook calls `onSuccess(updated)` and the form calls `onModeChange("display")`, so the UI switches back to read-only without the parent managing form data.
- **Sync when business changes**: When `initialBusiness?.id` changes (e.g. user navigates to another business), the hook runs an effect that resets `values` from `initialBusiness` and clears errors/saveError. So we don’t show stale data from the previous business.

## Tradeoffs made

- **Optimistic UI**: We do not update the UI before the server responds; we call `onSuccess(updated)` with the API response. So “optimistic” here means the parent can replace its cached business with `updated` and the hook replaces its internal `values` with the server state. A more aggressive approach would update the parent’s cache and form values before the request completes and roll back on error; we deferred that to keep the first version simple.
- **Tags/categories input**: We use a single comma-separated text field instead of a tag input component. This keeps the implementation small and avoids new dependencies; we can swap in a proper tag input later and keep the same `values.tags` / `values.categories` shape.
- **No debounce on validation**: We re-run validation for `saveDisabled` on every render (via `validateBusinessForm(values)`). For a small form this is cheap; if we add expensive or async validation later, we can memoize or debounce.
- **Reset on cancel**: Cancel calls `reset()`, which reinitializes from `initialBusiness`. If the user had edited and then navigated away (e.g. to another tab) and `initialBusiness` was refetched, we don’t currently re-sync until `initialBusiness?.id` changes. So cancel restores the last loaded business state, which is the intended behavior.
