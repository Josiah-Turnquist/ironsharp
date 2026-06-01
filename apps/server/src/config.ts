/**
 * Origins that Better Auth and CORS should trust. These are the mobile app's
 * URL schemes — static constants, not secrets and not deployment-specific — so
 * they live in code rather than environment variables. The optional
 * TRUSTED_ORIGINS env var can append extras (e.g. a web client) without a code
 * change, but nothing needs to be set for the app to work.
 */
const DEFAULT_TRUSTED_ORIGINS = [
  "ironsharp://", // production app scheme (see app.json "scheme")
  "exp://", // Expo Go during development
  "http://localhost:8081", // Expo web / Metro
];

export function getTrustedOrigins(): string[] {
  const extra = (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_TRUSTED_ORIGINS, ...extra])];
}
