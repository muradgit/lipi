/**
 * Self-hosted Bengali OCR tier (Phase 8, R&D). The long-term cost/offline track:
 * a fine-tuned open Bengali OCR/vision model, self-hosted, used as a CHEAPER tier
 * for the common high-volume document shapes — with the Claude vision tier kept
 * as the accuracy ceiling. The router tries the self-hosted model first (when an
 * endpoint is configured) and FALLS BACK to Claude whenever the local model's
 * confidence is low or the endpoint is unavailable, so accuracy never regresses.
 *
 * This module is the client + the pure fallback decision — both unit-testable
 * with an injected `fetch`. Training the model itself (labeled corpus collected
 * with user consent, training, hosting) is an ongoing ML track outside this repo;
 * the endpoint contract below is what a hosted model must satisfy to plug in.
 *
 * Endpoint contract — POST `${DOCAI_OCR_URL}/extract`
 *   body: { kind, sources: [{ mime, dataBase64 }] }
 *   200 : { data: <schema-shaped JSON for `kind`>, confidence: number }
 */
import { schemaFor } from "../schemas";
import type { DocKind, DocaiSource } from "../types";

/** Below this confidence, fall back to the Claude vision tier. */
export const DEFAULT_SELFHOSTED_MIN_CONFIDENCE = 0.7;

/** True when a self-hosted OCR endpoint is configured. */
export function isSelfHostedConfigured(): boolean {
  return Boolean(process.env.DOCAI_OCR_URL);
}

/** Pure: should we discard the self-hosted result and use Claude instead? */
export function shouldFallback(confidence: number, threshold = DEFAULT_SELFHOSTED_MIN_CONFIDENCE): boolean {
  return !(Number.isFinite(confidence) && confidence >= threshold);
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export interface SelfHostedResult<T> {
  data: T;
  confidence: number;
}

/** Call the self-hosted OCR endpoint and validate its output against the schema. */
export async function runSelfHostedOcr<T>(
  kind: DocKind,
  sources: DocaiSource[],
  opts: { url?: string; token?: string; fetchImpl?: typeof fetch } = {},
): Promise<SelfHostedResult<T>> {
  const url = opts.url ?? process.env.DOCAI_OCR_URL;
  if (!url) throw new Error("docai/self-hosted: DOCAI_OCR_URL is not set");
  const doFetch = opts.fetchImpl ?? fetch;
  const token = opts.token ?? process.env.DOCAI_OCR_TOKEN;

  const res = await doFetch(`${url.replace(/\/$/, "")}/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      kind,
      sources: sources.map((s) => ({
        mime: s.mime ?? "application/octet-stream",
        dataBase64: s.bytes ? toBase64(s.bytes) : "",
      })),
    }),
  });
  if (!res.ok) throw new Error(`docai/self-hosted: request failed (${res.status})`);

  const json = (await res.json()) as { data?: unknown; confidence?: unknown };
  const data = schemaFor(kind).parse(json.data) as T; // re-validate before trusting
  const confidence = Number(json.confidence ?? 0);
  return { data, confidence };
}
