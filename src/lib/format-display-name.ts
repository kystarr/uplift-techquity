/**
 * Avatar / fallback initials: first + last word when possible ("Hannah Gollner" → "HG"),
 * otherwise the first letter of the only word ("Madonna" → "M").
 */
export function initialsFromDisplayName(fullName: string | undefined | null): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.slice(0, 1).toUpperCase();
  }
  const first = parts[0].slice(0, 1);
  const last = parts[parts.length - 1].slice(0, 1);
  return `${first}${last}`.toUpperCase();
}

/**
 * Same public label as reviews: "Hannah Gollner" → "Hannah G."
 * @see ReviewForm — keep in sync for messaging and reviews.
 */
export function formatDisplayNameForReviews(fullName: string | undefined): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : "";
  return `${first}${lastInitial}`.trim();
}
