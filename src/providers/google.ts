/**
 * Google (Gemini) vision provider.
 *
 * Uses Gemini's JSON mode (`responseMimeType: "application/json"`) so the model
 * returns a JSON object; we then validate it against the Zod schema, which is
 * the real guarantee (JSON mode fixes the format, the schema fixes the shape).
 * Gemini reads images AND PDFs inline. The SDK is loaded lazily so
 * `@google/generative-ai` stays an OPTIONAL peer dependency.
 *
 * Env: `GOOGLE_GENAI_API_KEY` (or `GEMINI_API_KEY`). Default model:
 * `gemini-1.5-pro` (override via `model` — any vision-capable Gemini works).
 */
import type { GoogleGenerativeAI as GoogleGenAIType } from "@google/generative-ai";
import type { ProviderOptions, VisionProvider, VisionRequest, VisionResult } from "./types";

const DEFAULT_MODEL = "gemini-1.5-pro";

type GoogleClient = InstanceType<typeof GoogleGenAIType>;

export function createGoogleProvider(opts: ProviderOptions = {}): VisionProvider {
  let client: GoogleClient | undefined = opts.client as GoogleClient | undefined;

  async function getClient(): Promise<GoogleClient> {
    if (client) return client;
    const apiKey = opts.apiKey ?? process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("lipi: GOOGLE_GENAI_API_KEY is not set");
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    client = new GoogleGenerativeAI(apiKey);
    return client;
  }

  return {
    name: "google",
    defaultModel: opts.model ?? DEFAULT_MODEL,
    async extract<T>(req: VisionRequest<T>): Promise<VisionResult<T>> {
      const sdk = await getClient();
      const model = sdk.getGenerativeModel({
        model: req.model ?? opts.model ?? DEFAULT_MODEL,
        systemInstruction: req.system,
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: req.maxTokens ?? 8000,
        },
      });

      const parts = [
        { text: req.instruction },
        ...req.sources.map((s) => ({ inlineData: { mimeType: s.mime, data: s.data } })),
      ];

      const result = await model.generateContent(parts);
      const text = result.response.text();
      if (!text) return { data: undefined, refused: true };

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
