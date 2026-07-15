/**
 * Google Drive connector (Phase 6) — resolve a Drive file id into raw bytes the
 * engine can read, so a user can pick a Google Doc / Sheet / uploaded file from
 * their Drive instead of exporting + re-uploading it by hand.
 *
 * Product-agnostic: it imports NOTHING from MasterNIT and takes an OAuth access
 * token from the caller. It talks to the Drive REST API with plain `fetch` (no
 * heavyweight SDK), and `fetch` is injectable so the logic is unit-testable
 * without network or credentials.
 *
 * Google-native docs (Docs/Slides/Sheets) have no downloadable bytes — they must
 * be EXPORTED. We export them to PDF so the existing vision tier reads them; a
 * regular uploaded file (already a PDF/image/xlsx) is downloaded as-is.
 */
import type { DocaiSource } from "../types";

export const GOOGLE_DOC = "application/vnd.google-apps.document";
export const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
export const GOOGLE_SLIDES = "application/vnd.google-apps.presentation";

export interface DriveFetchPlan {
  /** True → use the Drive export endpoint (Google-native doc); false → alt=media download. */
  export: boolean;
  /** The mimeType to request from the export endpoint (only when `export`). */
  exportMime: string;
  /** The mime the resolved bytes will actually be. */
  resultMime: string;
}

/** Pure: decide how to fetch a Drive file's bytes from its Drive mimeType. */
export function driveFetchPlan(mimeType: string): DriveFetchPlan {
  if (mimeType === GOOGLE_DOC || mimeType === GOOGLE_SLIDES || mimeType === GOOGLE_SHEET) {
    // Export Google-native docs to PDF → the vision tier reads them directly.
    return { export: true, exportMime: "application/pdf", resultMime: "application/pdf" };
  }
  return { export: false, exportMime: "", resultMime: mimeType };
}

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";

/** Pure: the URL to fetch a file's bytes given its id + plan. */
export function driveContentUrl(fileId: string, plan: DriveFetchPlan): string {
  return plan.export
    ? `${DRIVE_FILES}/${fileId}/export?mimeType=${encodeURIComponent(plan.exportMime)}`
    : `${DRIVE_FILES}/${fileId}?alt=media`;
}

/** Resolve a Drive file id to a `DocaiSource` (bytes + mime) using an access token. */
export async function resolveDriveSource(params: {
  fileId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<DocaiSource> {
  const doFetch = params.fetchImpl ?? fetch;
  const headers = { Authorization: `Bearer ${params.accessToken}` };

  const metaRes = await doFetch(`${DRIVE_FILES}/${params.fileId}?fields=mimeType,name`, { headers });
  if (!metaRes.ok) {
    throw new Error(`docai/google: metadata fetch failed (${metaRes.status})`);
  }
  const meta = (await metaRes.json()) as { mimeType: string; name?: string };
  const plan = driveFetchPlan(meta.mimeType);

  const contentRes = await doFetch(driveContentUrl(params.fileId, plan), { headers });
  if (!contentRes.ok) {
    throw new Error(`docai/google: content fetch failed (${contentRes.status})`);
  }
  const bytes = new Uint8Array(await contentRes.arrayBuffer());
  return { bytes, mime: plan.resultMime, driveFileId: params.fileId };
}
