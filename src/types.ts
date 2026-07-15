/**
 * `docai` — a product-agnostic Bengali document-intelligence engine.
 *
 * It turns a document (photo / scanned PDF / Office file) into schema-valid,
 * field-mapped JSON, understanding Bengali terms and mapping them to a caller-
 * supplied controlled vocabulary. Deliberately knows NOTHING about MasterNIT:
 * the caller passes a `DocaiVocabulary` and consumes a `DocaiResult`, so the
 * same engine can serve other educational-institution systems (owner goal
 * 2026-07-03). Everything MasterNIT-specific lives in thin adapters outside this
 * module.
 *
 * This file is pure types only (no `server-only`, no SDK) so it can be imported
 * from both server and client code and unit-tested freely.
 */

import type { VisionProvider } from "./providers/types";

/** The kinds of institutional document the engine knows how to extract. */
export type DocKind = "routine" | "people" | "rooms" | "notice" | "subjects" | "all_sections";

/**
 * Caller-supplied grounding. Passed verbatim into the model prompt so the model
 * maps what it reads to CANONICAL values (a code, a designation) rather than raw
 * text. Every field is optional — omit what a given document doesn't need.
 */
export interface DocaiVocabulary {
  /** Known subjects with canonical code + both language names, for code mapping. */
  subjects?: { code: string; bn: string; en: string }[];
  /** Allowed staff/teacher designations. */
  designations?: string[];
  /** Allowed group names for the class (e.g. বিজ্ঞান / মানবিক). */
  groups?: string[];
}

/** One source document. Exactly one of `bytes` (with `mime`) or `driveFileId`. */
export interface DocaiSource {
  bytes?: Uint8Array;
  /** IANA mime type of `bytes` (e.g. "image/jpeg", "application/pdf"). */
  mime?: string;
  /** Google Drive file id, resolved server-side by the Google connector (Phase 6). */
  driveFileId?: string;
}

/** Which engine tier produced a result — useful for billing and debugging. */
export type DocaiEngine =
  | "vision-llm"
  | "text-llm"
  | "structured"
  | "handwriting"
  | "self-hosted-ocr"
  | "tesseract-fallback";

/** A single low-confidence field the review UI should highlight. */
export interface DocaiFieldConfidence {
  /** Dot/bracket path into `data`, e.g. "rows[2].startTime". */
  path: string;
  confidence: number;
}

export interface DocaiResult<T> {
  /** Zod-validated, schema-shaped extraction. */
  data: T;
  /** Overall confidence 0..1. */
  confidence: number;
  /** Per-field confidences below the review threshold. */
  fields: DocaiFieldConfidence[];
  /** Which engine tier ran. */
  engine: DocaiEngine;
  /** Page count actually processed — the billing unit. */
  pages: number;
}

/** Progress callback for long / multi-page extractions (Phase 5 streaming). */
export type DocaiProgress = (p: { page: number; total: number; stage: string }) => void;

export interface DocaiOptions {
  onProgress?: DocaiProgress;
  /** Rows/fields below this confidence are surfaced for human review. Default 0.85. */
  reviewThreshold?: number;
  /** Mark the document as handwritten: handwriting-tuned prompt + a stricter
   *  review threshold (0.92) so uncertain cells always reach human review. */
  handwriting?: boolean;
  /** Self-hosted OCR tier (Phase 8): below this confidence, fall back to Claude. */
  selfHostedMinConfidence?: number;

  // --- Vision provider selection (see `./providers`) ---
  /** A ready-made provider instance — full custom control, wins over everything. */
  provider?: VisionProvider;
  /** Built-in provider name: "anthropic" | "openai" | "google". Else `LIPI_VISION_PROVIDER`, else "anthropic". */
  providerName?: string;
  /** API key for the selected provider; else its conventional env var. */
  apiKey?: string;
  /** Model id override for the selected provider; else the provider default. */
  model?: string;
}
