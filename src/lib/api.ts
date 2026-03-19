/**
 * Central API base URL. Use import.meta.env.VITE_API_URL in production if needed.
 * Relative path works when the app is served from the same origin as the API.
 */
const getBaseUrl = () => import.meta.env?.VITE_API_URL ?? "";

export function getApiUrl(path: string): string {
  const base = getBaseUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
