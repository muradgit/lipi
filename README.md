<div align="center">

# 🪶 Lipi

**Turn any document into structured data — Bengali-first, AI-powered.**

Feed Lipi a phone photo, a scanned PDF, or an Office file and get back
**schema-valid, field-mapped JSON**. It understands Bengali (and English) terms and
maps them to a controlled vocabulary you supply — one call does OCR **and** semantic
understanding **and** field-mapping. Works with **any vision AI** (Anthropic, OpenAI,
Google, or your own).

</div>

---

> **লিপি (Lipi)** means *script / the written word* in Bengali. Lipi reads the written
> word off a page and hands you clean data.

## Why Lipi

Traditional OCR (Tesseract and friends) reads *characters* but does not *understand*
which word belongs in which field, and struggles badly with Bengali on photos and scans.
Lipi uses a **vision-capable LLM** with structured outputs, so the model returns JSON that
already matches your schema — no brittle regex post-processing. Give it your vocabulary and
it maps `"পদার্থবিজ্ঞান ১ম পত্র"` → the right subject code, `"সহকারী শিক্ষক"` → the right designation.

It is **product-agnostic**: Lipi imports nothing from any application. You pass a
`DocaiVocabulary` and consume a `DocaiResult`, so the same engine serves any system that
reads institutional documents.

## Install

```bash
npm install lipi-ai
# plus the ONE vision SDK you want to use (they are optional peer deps):
npm install @anthropic-ai/sdk       # Anthropic Claude  (default)
# or  npm install openai                     # OpenAI GPT
# or  npm install @google/generative-ai      # Google Gemini
```

Set the key for your chosen provider on the **server** (never ship it to a browser):

```bash
ANTHROPIC_API_KEY=sk-ant-...        # default provider
# OPENAI_API_KEY=sk-...             # if using OpenAI
# GOOGLE_GENAI_API_KEY=...          # if using Gemini
# LIPI_VISION_PROVIDER=openai       # pick a provider globally (default: anthropic)
```

## Quick start

```ts
import { extract } from "lipi-ai";

const result = await extract(
  "routine",                                   // DocKind
  [{ bytes, mime: "image/jpeg" }],             // DocaiSource[]  (many = batch)
  { subjects: [{ code: "PHY1", bn: "পদার্থবিজ্ঞান ১ম পত্র", en: "Physics 1st" }] },
);

result.data;        // Zod-validated, schema-shaped extraction
result.confidence;  // 0..1 overall
result.fields;      // per-field confidences below the review threshold
result.engine;      // which engine tier ran
result.pages;       // pages processed (a natural billing unit)
```

Call it from server code — the provider layer holds the API key.

## Pick your AI provider

Lipi never talks to a specific SDK directly; it hands a neutral request to a
**`VisionProvider`**. Choose one three ways:

```ts
// 1) Globally, via env:  LIPI_VISION_PROVIDER=openai
// 2) Per call, by name:
await extract("people", sources, vocab, { providerName: "google", model: "gemini-1.5-pro" });
// 3) Bring your own — implement VisionProvider for ANY model company:
import type { VisionProvider } from "lipi-ai";
const myProvider: VisionProvider = {
  name: "my-model",
  defaultModel: "…",
  async extract(req) { /* call your API, return schema-valid data */ return { data, refused: false }; },
};
await extract("routine", sources, vocab, { provider: myProvider });
```

See **[docs/PROVIDERS.md](docs/PROVIDERS.md)** for each provider's env vars, models, and how
to add a new one.

## Document kinds

`DocKind` ∈ `routine` · `people` · `subjects` · `rooms` · `notice` · `all_sections`.
Each has a Zod target schema (see `schemas.ts`), so `result.data` is always validated and
shaped. `people` distinguishes `student` / `teacher` / `staff` via your grounding vocabulary.

## What else is in the box

- **Batch + progress** — `extractBatch()` reads a stack of pages, survives a bad page, and
  merges them; pass `onProgress` for a live bar.
- **Handwriting mode** — a `handwriting` flag: tuned prompt + a stricter review threshold so
  uncertain cells always reach a human.
- **Self-hosted fallback** — point `DOCAI_OCR_URL` at a cheaper/offline OCR model;
  `extractWithFallback()` tries it first and falls back to the vision provider on low
  confidence, so accuracy never regresses.
- **Google Drive connector** — resolve a Drive file id straight to bytes (Docs/Sheets/Slides
  auto-exported to PDF).
- **Confidence & human review** — never blind-trust: any field below the review threshold
  (default `0.85`, `0.92` for handwriting) is surfaced in `result.fields`.

## Docs

| Read | For |
|---|---|
| [docs/USAGE.md](docs/USAGE.md) | Full developer & integrator guide |
| [docs/PROVIDERS.md](docs/PROVIDERS.md) | Configure Anthropic / OpenAI / Google, or add a provider |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How Lipi is built, module map, the reuse boundary |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, coding rules, PR checklist |
| [CLAUDE.md](CLAUDE.md) | Orientation for AI coding assistants working in this repo |

## Develop

```bash
npm install
npm run typecheck && npm test && npm run build
```

## License

MIT © muradgit
