<div align="center">

# 🪶 Lipi

**Turn any document into structured data — Bengali-first, AI-powered.**

Feed Lipi a phone photo, a scanned PDF, or an Office file and get back
**schema-valid, field-mapped JSON**. It understands Bengali (and English) terms and
maps them to a controlled vocabulary you supply — one call does OCR **and** semantic
understanding **and** field-mapping. Works with **any vision AI** (Anthropic, OpenAI,
Google, or your own).

[![npm version](https://img.shields.io/npm/v/lipi-ai.svg)](https://www.npmjs.com/package/lipi-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)](.github/workflows/ci.yml)
[![Code of Conduct](https://img.shields.io/badge/Contributor%20Covenant-v2.1-ff69b4.svg)](CODE_OF_CONDUCT.md)

[📖 Full Docs](#docs) · [💬 Discussions](https://github.com/muradgit/lipi/discussions) · [🐛 Issues](https://github.com/muradgit/lipi/issues) · [🚀 Roadmap](ROADMAP.md) · [❓ FAQ](FAQ.md)

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

### Getting Started
- **[Quick Start Guide](docs/USAGE.md)** — Installation, setup, first extraction
- **[Examples](examples/)** — Working code samples for different scenarios
- **[FAQ](FAQ.md)** — Common questions, troubleshooting, performance tips

### For Developers
- **[Architecture Guide](docs/ARCHITECTURE.md)** — How Lipi works, module structure, design principles
- **[Provider Guide](docs/PROVIDERS.md)** — Configure Anthropic/OpenAI/Google, or add your own provider
- **[Contributing Guide](CONTRIBUTING.md)** — How to contribute, coding rules, PR checklist
- **[Roadmap](ROADMAP.md)** — Planned features and how to help prioritize

### For Community
- **[Code of Conduct](CODE_OF_CONDUCT.md)** — Community standards and expectations
- **[Security Policy](SECURITY.md)** — Reporting vulnerabilities, best practices
- **[Changelog](CHANGELOG.md)** — What's new in each release
- **[GitHub Discussions](https://github.com/muradgit/lipi/discussions)** — Ask questions, share ideas

### For AI Assistants
- **[CLAUDE.md](CLAUDE.md)** — Orientation for Claude and other AI developers

## Develop

```bash
npm install
npm run typecheck && npm test && npm run build
```

### Local Development

```bash
# Watch mode for development
npm run test:watch

# Type check on save
npm run typecheck

# Build distribution files
npm run build
```

## Community

We ❤️ contributions! Here's how you can help:

- **⭐ Star** — Show your support with a star
- **🐛 Report Bugs** — [Open an issue](https://github.com/muradgit/lipi/issues)
- **💡 Suggest Features** — [Discussions](https://github.com/muradgit/lipi/discussions)
- **🔧 Contribute Code** — See [CONTRIBUTING.md](CONTRIBUTING.md)
- **📝 Improve Docs** — PRs welcome!
- **🧪 Add Examples** — Share your use cases
- **📢 Spread the Word** — Tell your friends!

## Roadmap & Priorities

What's coming next? Check our **[Roadmap](ROADMAP.md)**:

- Phase 1: Foundation & Community ✅
- Phase 2: Provider Expansion (AWS, Azure, GCP, etc.)
- Phase 3: Document Kind Expansion (invoices, contracts, forms)
- Phase 4: Advanced Features (multi-language, tables, relations)
- Phase 5+: Integrations, Analytics, Privacy

**Have a priority?** Vote on [GitHub issues](https://github.com/muradgit/lipi/issues) or open a [discussion](https://github.com/muradgit/lipi/discussions).

## Support

- 💬 **Questions?** [GitHub Discussions](https://github.com/muradgit/lipi/discussions)
- 🐛 **Bugs?** [GitHub Issues](https://github.com/muradgit/lipi/issues)
- 🔒 **Security?** Email muradkhan31@gmail.com with [SECURITY] in subject
- 📖 **Documentation?** See [docs/](docs/), [FAQ.md](FAQ.md), [examples/](examples/)

## License

MIT © [muradgit](https://github.com/muradgit)

See [LICENSE](LICENSE) for details.

---

**Made with 🪶 for the world's document intelligence needs**

Help us make Lipi better for everyone. [Join the community!](https://github.com/muradgit/lipi/discussions)
