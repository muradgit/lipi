/**
 * Google OAuth 2.0 helpers for the Drive connector (Phase 6). Pure URL/body
 * builders + token exchange/refresh over `fetch` (injectable for tests). Reads
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from the server env only inside the
 * exchange/refresh calls (never hardcoded, never sent to the client); when
 * they're absent the connector routes return a Bengali "not configured" message
 * (like the ANTHROPIC_API_KEY path) rather than crashing. This is the pure/
 * testable tier; the server-only integration (admin client, token store) lives
 * in `drive.ts`.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Read-only Drive access — enough to list + export the user's own files. */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Build the Google consent URL. `offline` + `consent` so we get a refresh token. */
export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const u = new URL(AUTH_ENDPOINT);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", params.scope ?? DRIVE_SCOPE);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", params.state);
  return u.toString();
}

export interface GoogleTokens {
  accessToken: string;
  /** Null when Google didn't return a new one (reuse the previous refresh token). */
  refreshToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  scope: string;
}

/** Pure: turn a token endpoint JSON response into our token shape. */
export function parseTokenResponse(
  json: Record<string, unknown>,
  now = Date.now(),
  prevRefresh: string | null = null,
): GoogleTokens {
  const expiresIn = Number(json.expires_in ?? 3600);
  const refresh = json.refresh_token ? String(json.refresh_token) : prevRefresh;
  return {
    accessToken: String(json.access_token ?? ""),
    refreshToken: refresh,
    expiresAt: now + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    scope: String(json.scope ?? ""),
  };
}

/** True when the access token is expired (or within `skewMs` of expiry). */
export function isExpired(tokens: Pick<GoogleTokens, "expiresAt">, skewMs = 60_000, now = Date.now()): boolean {
  return now >= tokens.expiresAt - skewMs;
}

function form(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

async function postToken(body: string, fetchImpl: typeof fetch): Promise<GoogleTokens> {
  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`google/oauth: token request failed (${res.status})`);
  return parseTokenResponse((await res.json()) as Record<string, unknown>);
}

/** Exchange an authorization code for tokens. */
export async function exchangeAuthCode(params: {
  code: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<GoogleTokens> {
  return postToken(
    form({
      code: params.code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
    params.fetchImpl ?? fetch,
  );
}

/** Refresh an access token; the response usually omits refresh_token, so keep the old one. */
export async function refreshAccessToken(params: {
  refreshToken: string;
  fetchImpl?: typeof fetch;
}): Promise<GoogleTokens> {
  const tokens = await postToken(
    form({
      refresh_token: params.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
    params.fetchImpl ?? fetch,
  );
  return { ...tokens, refreshToken: tokens.refreshToken ?? params.refreshToken };
}
