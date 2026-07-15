import { describe, expect, it, vi } from "vitest";
import { buildAuthUrl, parseTokenResponse, isExpired, refreshAccessToken, DRIVE_SCOPE } from "./oauth";

describe("buildAuthUrl", () => {
  it("requests offline access + consent with the Drive scope and state", () => {
    const url = new URL(
      buildAuthUrl({ clientId: "cid", redirectUri: "https://x/cb", state: "st" }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x/cb");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toBe(DRIVE_SCOPE);
    expect(url.searchParams.get("state")).toBe("st");
  });
});

describe("parseTokenResponse", () => {
  it("computes expiry from expires_in and keeps a prior refresh token", () => {
    const t = parseTokenResponse({ access_token: "a", expires_in: 3600, scope: "s" }, 1_000, "old-refresh");
    expect(t.accessToken).toBe("a");
    expect(t.refreshToken).toBe("old-refresh"); // response omitted refresh_token
    expect(t.expiresAt).toBe(1_000 + 3600_000);
  });
  it("prefers a freshly returned refresh token", () => {
    const t = parseTokenResponse({ access_token: "a", refresh_token: "new" }, 0, "old");
    expect(t.refreshToken).toBe("new");
  });
});

describe("isExpired", () => {
  it("treats a token within the skew window as expired", () => {
    expect(isExpired({ expiresAt: 100_000 }, 60_000, 50_000)).toBe(true); // 50k >= 100k-60k
    expect(isExpired({ expiresAt: 100_000 }, 60_000, 30_000)).toBe(false);
  });
});

describe("refreshAccessToken", () => {
  it("posts the refresh grant and retains the refresh token if absent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "fresh", expires_in: 3600 }),
    });
    const t = await refreshAccessToken({ refreshToken: "R", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(t.accessToken).toBe("fresh");
    expect(t.refreshToken).toBe("R");
    const body = String((fetchImpl.mock.calls[0][1] as RequestInit).body);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=R");
  });
});
