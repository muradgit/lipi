/**
 * Anthropic (Claude) vision provider.
 *
 * Uses `messages.parse` + `zodOutputFormat` so the model returns JSON that is
 * guaranteed to match the Zod schema; we re-validate defensively before trusting
 * it. The SDK is loaded lazily (dynamic import) so it stays an OPTIONAL peer
 * dependency — install `@anthropic-ai/sdk` only if you use this provider.
 *
 * Env: `ANTHROPIC_API_KEY`. Default model: `claude-opus-4-8`.
 */
import type AnthropicType from "@anthropic-ai/sdk";
import type { ProviderOptions, VisionProvider, VisionRequest, VisionResult } from "./types";

const DEFAULT_MODEL = "claude-opus-4-8";

type AnthropicClient = InstanceType<typeof AnthropicType>;

export function createAnthropicProvider(opts: ProviderOptions = {}): VisionProvider {
  let client: AnthropicClient | undefined = opts.client as AnthropicClient | undefined;

  async function getClient(): Promise<AnthropicClient> {
    if (client) return client;
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("lipi: ANTHROPIC_API_KEY is not set");
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey });
    return client;
  }

  return {
    name: "anthropic",
    defaultModel: opts.model ?? DEFAULT_MODEL,
    async extract<T>(req: VisionRequest<T>): Promise<VisionResult<T>> {
      const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
      const sdk = await getClient();

      const content = [
        ...req.sources.map((s) =>
          s.isImage
            ? { type: "image", source: { type: "base64", media_type: s.mime, data: s.data } }
            : {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: s.data },
              },
        ),
        { type: "text", text: req.instruction },
      ];

      const response = await (sdk.messages as unknown as {
        parse: (body: unknown) => Promise<{ parsed_output: unknown; stop_reason?: string }>;
      }).parse({
        model: req.model ?? opts.model ?? DEFAULT_MODEL,
        max_tokens: req.maxTokens ?? 8000,
        thinking: { type: "disabled" },
        system: req.system,
        messages: [{ role: "user", content }],
        output_config: { format: zodOutputFormat(req.schema) },
      });

      if (response.stop_reason === "refusal" || response.parsed_output == null) {
        return { data: undefined, refused: true };
      }
      return { data: req.schema.parse(response.parsed_output), refused: false };
    },
  };
}
