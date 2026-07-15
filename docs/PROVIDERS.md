# Providers — use any vision AI

Lipi is model-agnostic. The engine builds a neutral request and hands it to a
**`VisionProvider`**; each provider maps that onto its own SDK's structured-output API and
returns schema-valid data. Swap model companies without touching engine code.

## The interface

```ts
interface VisionProvider {
  readonly name: string;
  readonly defaultModel: string;
  extract<T>(req: VisionRequest<T>): Promise<VisionResult<T>>;
}

interface VisionRequest<T> {
  system: string;               // system role text
  instruction: string;          // task + schema guidance + vocabulary grounding
  sources: VisionSource[];      // { data: base64, mime, isImage }[]
  schema: z.ZodType<T>;         // the response MUST satisfy this
  model?: string;
  maxTokens?: number;
}

interface VisionResult<T> {
  data: T | undefined;          // schema-valid, or undefined on refusal
  refused: boolean;
}
```

## Built-in providers

| Name | SDK (optional peer dep) | Env key | Default model | Images | PDF |
|---|---|---|---|---|---|
| `anthropic` (default) | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` | `claude-opus-4-8` | ✅ | ✅ native |
| `openai` | `openai` | `OPENAI_API_KEY` (`OPENAI_MODEL`) | `gpt-4o` | ✅ | ⚠️ rasterize first |
| `google` | `@google/generative-ai` | `GOOGLE_GENAI_API_KEY` / `GEMINI_API_KEY` | `gemini-1.5-pro` | ✅ | ✅ native |

Install only the SDK you use. Model ids are overridable per call (`{ model }`) or per
provider instance; the defaults are safe, widely-available vision + structured-output models
— bump them to whatever your account has access to.

> **PDF note:** Anthropic and Gemini read PDFs inline. OpenAI reads raster images, so send
> PDFs to it as page images (rasterize first) or route PDFs to Anthropic/Gemini.

## Selecting a provider

Three ways, highest priority first:

```ts
// 1) A ready-made instance (full control — wins over everything)
import { createOpenAIProvider, extract } from "lipi-ai";
await extract("routine", sources, vocab, { provider: createOpenAIProvider({ apiKey }) });

// 2) By name, per call
await extract("routine", sources, vocab, { providerName: "google", model: "gemini-1.5-pro" });

// 3) Globally, via env
//    LIPI_VISION_PROVIDER=openai      (default: anthropic)
await extract("routine", sources, vocab);
```

Name aliases: `anthropic|claude`, `openai|gpt`, `google|gemini`.

## Write a provider for any other AI company

Implement `VisionProvider` and pass it as `provider` — no engine changes:

```ts
import type { VisionProvider, VisionRequest, VisionResult } from "lipi-ai";

export function createMyProvider(opts: { apiKey?: string } = {}): VisionProvider {
  return {
    name: "my-model",
    defaultModel: "my-vision-1",
    async extract<T>(req: VisionRequest<T>): Promise<VisionResult<T>> {
      // 1. Turn req.schema into whatever your API wants (e.g. z.toJSONSchema(req.schema)).
      // 2. Send req.system + req.instruction + req.sources (base64 images/PDF) to your API,
      //    asking for JSON that matches the schema.
      // 3. Parse the response, then VALIDATE it: req.schema.parse(json).
      // 4. Return { data, refused: false }, or { data: undefined, refused: true }.
      const json = await callYourApi(/* … */);
      return { data: req.schema.parse(json), refused: false };
    },
  };
}
```

To make it selectable by name too, add a case to `resolveProvider` in
`src/providers/index.ts` and document it here.

## Note on Zod

Lipi is on **Zod v4**. Providers that need a JSON schema build it with `z.toJSONSchema(...)`
(see `src/providers/openai.ts`). Avoid helpers pinned to older Zod majors, so the whole
package stays on one Zod version.
