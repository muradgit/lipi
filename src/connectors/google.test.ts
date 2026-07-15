import { describe, expect, it, vi } from "vitest";
import {
  driveFetchPlan,
  driveContentUrl,
  resolveDriveSource,
  GOOGLE_DOC,
  GOOGLE_SHEET,
} from "./google";

describe("driveFetchPlan", () => {
  it("exports Google-native docs to PDF", () => {
    expect(driveFetchPlan(GOOGLE_DOC)).toEqual({
      export: true,
      exportMime: "application/pdf",
      resultMime: "application/pdf",
    });
    expect(driveFetchPlan(GOOGLE_SHEET).export).toBe(true);
  });
  it("downloads a regular file as-is", () => {
    expect(driveFetchPlan("image/jpeg")).toEqual({
      export: false,
      exportMime: "",
      resultMime: "image/jpeg",
    });
  });
});

describe("driveContentUrl", () => {
  it("uses the export endpoint for native docs and alt=media otherwise", () => {
    expect(driveContentUrl("F1", driveFetchPlan(GOOGLE_DOC))).toBe(
      "https://www.googleapis.com/drive/v3/files/F1/export?mimeType=application%2Fpdf",
    );
    expect(driveContentUrl("F2", driveFetchPlan("application/pdf"))).toBe(
      "https://www.googleapis.com/drive/v3/files/F2?alt=media",
    );
  });
});

describe("resolveDriveSource", () => {
  it("fetches metadata then content and returns bytes + mime", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ mimeType: GOOGLE_DOC, name: "রুটিন" }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });

    const src = await resolveDriveSource({ fileId: "abc", accessToken: "tok", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(src.mime).toBe("application/pdf");
    expect(src.driveFileId).toBe("abc");
    expect(Array.from(src.bytes!)).toEqual([1, 2, 3]);
    // export endpoint used for a Google Doc
    expect((fetchImpl.mock.calls[1][0] as string)).toContain("/export?mimeType=application%2Fpdf");
    // bearer token forwarded
    expect((fetchImpl.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
  });

  it("throws a clear error when metadata fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(
      resolveDriveSource({ fileId: "x", accessToken: "t", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow(/metadata fetch failed \(404\)/);
  });
});
