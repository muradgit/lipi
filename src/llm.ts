/**
 * Vision tier — the only part of Lipi that talks to a model.
 *
 * It is provider-agnostic: it builds the neutral prompt + schema request and
 * hands it to whichever `VisionProvider` is resolved (Anthropic / OpenAI /
 * Google / a custom one). The provider does the network call and returns
 * schema-valid data; we surface refusals to the caller. Selection is by
 * `provider` / `providerName` option or the `LIPI_VISION_PROVIDER` env var
 * (see `./providers`). No API key is needed to unit-test the surrounding pure
 * logic, since a provider can be injected.
 */
import type { z } from "zod";
import { instruction, systemPrompt } from "./prompt";
import { schemaFor } from "./schemas";
import { isImageMime } from "./route";
import { resolveProvider } from "./providers";
import type { ResolveProviderOptions, VisionSource } from "./providers";
import type { DocaiSource, DocaiVocabulary, DocKind } from "./types";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/** Decode one source into the provider-neutral base64 shape. */
function toVisionSource(src: DocaiSource): VisionSource {
  if (!src.bytes || !src.mime) {
    throw new Error("lipi: vision tier needs source bytes + mime");
  }
  return { data: toBase64(src.bytes), mime: src.mime, isImage: isImageMime(src.mime) };
}

/** Options for a vision run: provider selection plus handwriting mode. */
export interface VisionExtractionOptions extends ResolveProviderOptions {
  handwriting?: boolean;
}

/**
 * Run a schema-constrained extraction over one or more sources (multiple =
 * batch). Returns the validated data plus whether the model refused.
 */
export async function runVisionExtraction<T>(
  kind: DocKind,
  sources: DocaiSource[],
  vocab: DocaiVocabulary,
  opts: VisionExtractionOptions = {},
): Promise<{ data: T; refused: boolean }> {
  const provider = resolveProvider(opts);
  const schema = schemaFor(kind) as z.ZodType<T>;

  const { data, refused } = await provider.extract<T>({
    system: systemPrompt(),
    instruction: instruction(kind, vocab, { handwriting: opts.handwriting }),
    sources: sources.map(toVisionSource),
    schema,
    maxTokens: 8000,
    model: opts.model,
  });

  if (refused || data === undefined) {
    return { data: undefined as unknown as T, refused: true };
  }
  return { data, refused: false };
}
