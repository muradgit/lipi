/**
 * Provider abstraction — the seam that makes Lipi model-agnostic.
 *
 * The engine never talks to a specific AI SDK directly. It builds a neutral
 * `VisionRequest` (system prompt + instruction + base64 sources + a Zod schema)
 * and hands it to whichever `VisionProvider` is selected (Anthropic, OpenAI,
 * Google, or one you write). Each provider maps that request onto its own SDK's
 * structured-output API and returns schema-valid data. Add a new AI company by
 * writing one file that implements this interface — nothing else changes.
 *
 * Pure types only, so it is safe to import anywhere.
 */
import type { z } from "zod";

/** One document source, already decoded to base64 with its mime type. */
export interface VisionSource {
  /** Base64-encoded bytes. */
  data: string;
  /** IANA mime type (e.g. "image/jpeg", "application/pdf"). */
  mime: string;
  /** True for raster images; false for PDFs/documents. */
  isImage: boolean;
}

/** A provider-neutral extraction request. */
export interface VisionRequest<T> {
  /** System role text. */
  system: string;
  /** The task instruction (schema guidance + vocabulary grounding). */
  instruction: string;
  /** One or more sources to read in this single call. */
  sources: VisionSource[];
  /** The Zod schema the response MUST satisfy. */
  schema: z.ZodType<T>;
  /** Model id override; falls back to the provider default. */
  model?: string;
  /** Output token budget. */
  maxTokens?: number;
}

export interface VisionResult<T> {
  /** Schema-valid data, or `undefined` when the model refused. */
  data: T | undefined;
  /** True when the model declined to answer (safety refusal / empty). */
  refused: boolean;
}

/** A pluggable vision backend. Implement this to support a new AI company. */
export interface VisionProvider {
  /** Stable identifier, e.g. "anthropic" | "openai" | "google". */
  readonly name: string;
  /** Model id used when a request doesn't specify one. */
  readonly defaultModel: string;
  /** Run one schema-constrained extraction over the given sources. */
  extract<T>(req: VisionRequest<T>): Promise<VisionResult<T>>;
}

/** Options shared by the built-in providers. */
export interface ProviderOptions {
  /** API key; falls back to the provider's conventional env var. */
  apiKey?: string;
  /** Default model id for this provider instance. */
  model?: string;
  /** Inject a pre-built SDK client (used by tests / custom configs). */
  client?: unknown;
}
