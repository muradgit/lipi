/**
 * OpenAI (GPT) vision provider.
 *
 * Uses JSON-schema structured outputs built directly from the Zod schema
 * (`z.toJSONSchema`) rather than the `openai/helpers/zod` helper — the helper is
 * pinned to an older Zod major, and building the schema ourselves keeps Lipi on
 * one Zod version and free of that coupling. The model returns JSON, which we
 * then validate against the Zod schema (the real guarantee). Images are sent as
 * base64 data URLs. The SDK is loaded lazily so `openai` stays an OPTIONAL peer
 * dependency.
 *
 * Env: `OPENAI_API_KEY` (and optional `OPENAI_MODEL`). Default model: `gpt-4o`
 * (any vision + structured-output capable model works — override via `model`).
 *
 * Note: OpenAI reads raster images inline. PDFs must be rasterized to images
 * first (or sent via the Files API), so route PDFs through a provider with
 * native PDF vision (Anthropic / Google) or pre-convert them.
 */
import type OpenAIType from "openai";
import { z } from "zod";
import type { ProviderOptions, VisionProvider, VisionRequest, VisionResult } from "./types";

const DEFAULT_MODEL = "gpt-4o";

type OpenAIClient = InstanceType<typeof OpenAIType>;

export function createOpenAIProvider(opts: ProviderOptions = {}): VisionProvider {
  let client: OpenAIClient | undefined = opts.client as OpenAIClient | undefined;

  async function getClient(): Promise<OpenAIClient> {
    if (client) return client;
    const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("lipi: OPENAI_API_KEY is not set");
    const { default: OpenAI } = await import("openai");
    client = new OpenAI({ apiKey });
    return client;
  }

  return {
    name: "openai",
    defaultModel: opts.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    async extract<T>(req: VisionRequest<T>): Promise<VisionResult<T>> {
      const sdk = await getClient();
      const jsonSchema = z.toJSONSchema(req.schema as z.ZodType) as Record<string, unknown>;

      const userContent = [
        { type: "text", text: req.instruction },
        ...req.sources.map((s) => ({
          type: "image_url" as const,
          image_url: { url: `data:${s.mime};base64,${s.data}` },
        })),
      ];

      const completion = await sdk.chat.completions.create({
        model: req.model ?? opts.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
        max_tokens: req.maxTokens ?? 8000,
        messages: [
          { role: "system", content: req.system },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { role: "user", content: userContent as any },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "extraction", schema: jsonSchema, strict: false },
        },
      });

      const message = completion.choices[0]?.message;
      const text = message?.content;
      if (!message || message.refusal || !text) {
        return { data: undefined, refused: true };
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { data: undefined, refused: true };
      }
      return { data: req.schema.parse(json), refused: false };
    },
  };
}
