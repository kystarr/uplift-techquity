# Edit Business Profile — UX and Validation

## Validation strategy

- **Required fields**: Name, email, and phone are required. The Save button is disabled until these are non-empty and pass format checks. Required fields show an asterisk (*) next to the label; errors show below the field in red.
- **Email**: Must be a valid email format (regex/type="email" plus a simple pattern). Invalid email sets `errors.email` and keeps Save disabled.
- **Website**: Optional. If provided, must be a valid URL (http/https). Invalid URL sets `errors.website` and keeps Save disabled.
- **Description**: Optional; if present, max 500 characters to match backend/API constraints.
- **Tags / Categories**: Optional; stored as arrays. Input is comma-separated; we trim and split. No per-item format validation beyond trimming.

Validation runs:
1. **On change (inline)**: After the user edits a field, we re-run validation for that field (or the whole form) and update `errors` so invalid state is visible immediately.
2. **Before submit**: On Save click, we run full validation once more. If invalid, we do not call the API and optionally focus the first invalid field.
3. **Save button**: Disabled when `saveDisabled` is true (derived from validation in the form hook/component). This prevents invalid submission and makes it clear that the user must fix errors first.

## Error state structure

- **EditBusinessProfileErrors**: One optional string per field (`name`, `description`, `email`, `phone`, `website`, `tags`, `categories`). The layout only displays the message; it does not decide what the message says. The form (or validation layer) sets messages like "Business name is required" or "Please enter a valid email."
- **Inline placement**: Error text is rendered directly under the input via `FormField`, with `role="alert"` and `aria-describedby` linking the input to the error so screen readers announce it.
- **Label + error**: When there is an error, the label can be styled in destructive color so the user sees which section has the problem; the main feedback is still the message below the field.

## How confusion is minimized

- **Display vs edit mode**: The layout has two distinct modes. In display mode the user sees read-only values and a single "Edit" button. In edit mode they see the form and "Save changes" / "Cancel." There is no mixed state (e.g. some fields editable and some not), which reduces cognitive load.
- **Disabled Save**: Save is disabled when the form is invalid. Users are not able to submit and then see a generic error; they must fix the indicated fields first. Required and format errors are shown inline so they know what to correct.
- **Cancel**: Cancel returns to display mode and discards unsaved changes. No confirmation is required by default; we can add a "You have unsaved changes" dialog later if needed.
- **Saving state**: While the request is in flight, the Save button shows "Saving…" and is disabled (along with Cancel and inputs in some implementations), so the user cannot double-submit or think the app is unresponsive.
- **Reusable FormField**: Every editable field uses the same pattern (label, required indicator, input, error, hint). This keeps the UI predictable and makes it easy to add new fields with the same behavior.

## Component blueprint (F9.1.3)

- **EditBusinessProfileLayout**: Orchestrates display vs edit mode; receives `values`, `errors`, `onChange`, `onSave`, `onCancel`, `onEdit`, `saving`, `saveDisabled`. Does not hold form state.
- **FormField**: Wraps a single control with label, required asterisk, error message, and optional hint. Used for every editable field in edit mode.
- **Form component (F9.1.4)**: Holds local form state, runs validation, calls PUT, and passes all props into `EditBusinessProfileLayout` in edit mode.
