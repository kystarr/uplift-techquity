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
