import { describe, expect, it, vi } from "vitest";
import { shouldFallback, runSelfHostedOcr, DEFAULT_SELFHOSTED_MIN_CONFIDENCE } from "./self-hosted";

describe("shouldFallback", () => {
  it("falls back below the threshold and trusts at/above it", () => {
    expect(shouldFallback(0.5, 0.7)).toBe(true);
    expect(shouldFallback(0.7, 0.7)).toBe(false);
    expect(shouldFallback(0.9, 0.7)).toBe(false);
  });
  it("falls back on a non-finite confidence", () => {
    expect(shouldFallback(NaN)).toBe(true);
    expect(shouldFallback(undefined as unknown as number)).toBe(true);
  });
  it("defaults the threshold to the documented constant", () => {
    expect(shouldFallback(DEFAULT_SELFHOSTED_MIN_CONFIDENCE - 0.01)).toBe(true);
    expect(shouldFallback(DEFAULT_SELFHOSTED_MIN_CONFIDENCE)).toBe(false);
  });
});

describe("runSelfHostedOcr", () => {
  const routine = {
    confidence: 0.95,
    rows: [
      {
        date: "2026-06-25",
        subjects: [{ code: "101", nameRaw: "বাংলা" }],
        startTime: "09:30",
        endTime: "12:30",
        shift: null,
        confidence: 0.99,
      },
    ],
  };

  it("posts the sources and validates the response against the schema", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: routine, confidence: 0.95 }),
    });
    const out = await runSelfHostedOcr("routine", [{ bytes: new Uint8Array([1, 2]), mime: "image/jpeg" }], {
      url: "https://ocr.example.com/",
      token: "T",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.confidence).toBe(0.95);
    expect(out.data).toEqual(routine);
    // trailing slash trimmed, /extract appended, bearer forwarded
    expect(fetchImpl.mock.calls[0][0]).toBe("https://ocr.example.com/extract");
    expect((fetchImpl.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer T" });
  });

  it("throws on a bad response so the caller can fall back", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(
      runSelfHostedOcr("routine", [{ bytes: new Uint8Array([1]), mime: "image/jpeg" }], {
        url: "https://ocr.example.com",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/request failed \(502\)/);
  });
});
