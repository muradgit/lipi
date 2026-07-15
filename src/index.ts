/**
 * Lipi public entry point. `extract()` routes a document to an engine tier,
 * runs it against the selected vision provider (Anthropic / OpenAI / Google /
 * custom), and returns a validated, confidence-annotated result. Call it from
 * server code — the provider layer holds the API key. Callers depend only on
 * this signature + `./types`.
 *
 * The vision-LLM tier handles images + PDF. Other tiers (structured, text)
 * throw a clear "not exposed yet" so callers fail loudly rather than silently.
 */
import { detectEngine, isEngineReady } from "./route";
import { runVisionExtraction, type VisionExtractionOptions } from "./llm";
import { summarizeConfidence } from "./confidence";
import { batchConfigFor, mergeListParts } from "./batch";
import { HANDWRITING_REVIEW_THRESHOLD } from "./handwriting";
import {
  isSelfHostedConfigured,
  runSelfHostedOcr,
  shouldFallback,
  DEFAULT_SELFHOSTED_MIN_CONFIDENCE,
} from "./engines/self-hosted";
import type {
  DocaiOptions,
  DocaiProgress,
  DocaiResult,
  DocaiSource,
  DocaiVocabulary,
  DocKind,
} from "./types";

export type {
  DocaiResult,
  DocaiSource,
  DocaiVocabulary,
  DocKind,
  DocaiOptions,
  DocaiProgress,
} from "./types";

const DEFAULT_REVIEW_THRESHOLD = 0.85;

/** The review threshold to apply: explicit override, else stricter for handwriting. */
function reviewThresholdFor(opts: DocaiOptions): number {
  return opts.reviewThreshold ?? (opts.handwriting ? HANDWRITING_REVIEW_THRESHOLD : DEFAULT_REVIEW_THRESHOLD);
}

/** Pick just the fields the vision tier needs (provider selection + handwriting). */
function visionOptsOf(opts: DocaiOptions): VisionExtractionOptions {
  return {
    handwriting: opts.handwriting,
    provider: opts.provider,
    providerName: opts.providerName,
    apiKey: opts.apiKey,
    model: opts.model,
  };
}

export async function extract<T>(
  kind: DocKind,
  sources: DocaiSource[],
  vocab: DocaiVocabulary,
  opts: DocaiOptions = {},
): Promise<DocaiResult<T>> {
  if (sources.length === 0) throw new Error("lipi: no sources provided");

  const primaryMime = sources[0].mime ?? "";
  const engine = detectEngine(primaryMime);
  if (!isEngineReady(engine)) {
    throw new Error(`lipi: engine "${engine}" is not implemented yet (mime "${primaryMime}")`);
  }
  if (engine !== "vision-llm") {
    // structured/text tiers are wired per phase; Phase 1 exposes vision only.
    throw new Error(`lipi: engine "${engine}" not yet exposed through extract() (Phase 1)`);
  }

  const { data, refused } = await runVisionExtraction<T>(kind, sources, vocab, visionOptsOf(opts));
  if (refused) throw new Error("lipi: the model declined to extract this document");

  const threshold = reviewThresholdFor(opts);
  const { confidence, fields } = summarizeConfidence(data, threshold);

  return {
    data,
    confidence,
    fields,
    engine,
    pages: sources.length, // Phase 1 approximation (1 per source); refined at billing (Phase 3).
  };
}

/**
 * Batch/streaming variant (Phase 5). For a list kind with >1 source, each source
 * is extracted on its own — reporting progress and surviving a single bad page —
 * then the per-page results are merged (page-order de-dup). For a single source
 * or a non-list kind, it delegates to `extract()` (one call). Progress is
 * reported via `opts.onProgress` as { page, total, stage }.
 */
export async function extractBatch<T>(
  kind: DocKind,
  sources: DocaiSource[],
  vocab: DocaiVocabulary,
  opts: DocaiOptions = {},
): Promise<DocaiResult<T>> {
  if (sources.length === 0) throw new Error("lipi: no sources provided");
  const cfg = batchConfigFor(kind);
  const total = sources.length;
  const progress: DocaiProgress | undefined = opts.onProgress;

  // Single source, or a kind that doesn't list-merge → one call.
  if (total === 1 || !cfg) {
    progress?.({ page: 1, total, stage: "extracting" });
    const res = await extract<T>(kind, sources, vocab, opts);
    progress?.({ page: total, total, stage: "done" });
    return res;
  }

  const primaryMime = sources[0].mime ?? "";
  const engine = detectEngine(primaryMime);
  if (!isEngineReady(engine) || engine !== "vision-llm") {
    throw new Error(`lipi: batch needs the vision tier (got "${engine}")`);
  }

  const parts: Array<T & { confidence: number }> = [];
  for (let i = 0; i < total; i++) {
    progress?.({ page: i + 1, total, stage: "extracting" });
    const { data, refused } = await runVisionExtraction<T & { confidence: number }>(
      kind,
      [sources[i]],
      vocab,
      visionOptsOf(opts),
    );
    if (refused) throw new Error(`lipi: the model declined page ${i + 1} of ${total}`);
    parts.push(data);
  }

  progress?.({ page: total, total, stage: "merging" });
  const merged = mergeListParts(parts, cfg.listKey, cfg.keyOf) as T;

  const threshold = reviewThresholdFor(opts);
  const { confidence, fields } = summarizeConfidence(merged, threshold);
  progress?.({ page: total, total, stage: "done" });

  return { data: merged, confidence, fields, engine, pages: total };
}

/**
 * Cost/offline tier with fallback (Phase 8). When a self-hosted Bengali OCR
 * endpoint is configured (`DOCAI_OCR_URL`), try it first — it's cheaper — but
 * FALL BACK to the Claude vision tier (`extract`) whenever the local model's
 * confidence is below threshold or the endpoint errors, so accuracy never
 * regresses. With no endpoint configured this is exactly `extract()`.
 */
export async function extractWithFallback<T>(
  kind: DocKind,
  sources: DocaiSource[],
  vocab: DocaiVocabulary,
  opts: DocaiOptions = {},
): Promise<DocaiResult<T>> {
  if (isSelfHostedConfigured()) {
    try {
      const { data, confidence } = await runSelfHostedOcr<T>(kind, sources);
      const minConfidence = opts.selfHostedMinConfidence ?? DEFAULT_SELFHOSTED_MIN_CONFIDENCE;
      if (!shouldFallback(confidence, minConfidence)) {
        const { fields } = summarizeConfidence(data, reviewThresholdFor(opts));
        return { data, confidence, fields, engine: "self-hosted-ocr", pages: sources.length };
      }
      // low confidence → fall through to the Claude vision tier
    } catch {
      // endpoint unavailable/invalid → fall through to the Claude vision tier
    }
  }
  return extract<T>(kind, sources, vocab, opts);
}

// Re-export the per-kind Zod schemas + inferred types for consumers.
export * from "./schemas";

// Re-export the provider surface so consumers can pick a model company,
// pass a custom provider, or build one against the `VisionProvider` interface.
export {
  resolveProvider,
  createAnthropicProvider,
  createOpenAIProvider,
  createGoogleProvider,
} from "./providers";
export type {
  VisionProvider,
  VisionRequest,
  VisionResult,
  VisionSource,
  ProviderOptions,
  ProviderName,
  ResolveProviderOptions,
} from "./providers";
