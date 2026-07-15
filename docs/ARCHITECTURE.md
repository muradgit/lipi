# Architecture

Lipi turns a document into schema-valid, field-mapped JSON. This doc explains how it is put
together and why.

## Data flow

```
 file (image / scanned PDF / office / Drive id)
      │
      ▼
  detectEngine(mime)  ── route.ts ──► picks an ENGINE TIER
      │
      ▼
  extract(kind, sources, vocab, opts)
      │   builds a NEUTRAL request:
      │     system prompt (prompt.ts) + per-kind instruction + vocabulary grounding
      │     + base64 sources + the Zod schema (schemas.ts)
      ▼
  VisionProvider.extract(req)   ── providers/*  (anthropic | openai | google | custom)
      │   calls the model with structured outputs → JSON → schema.parse (validate)
      ▼
  DocaiResult { data, confidence, fields, engine, pages }   ── confidence.ts
      │   low-confidence fields flagged for human review
      ▼
  caller maps data → its own domain (thin adapters live OUTSIDE Lipi)
```

## The reuse boundary

Lipi imports **nothing** from any host application. A caller supplies a `DocaiVocabulary`
(its subjects, designations, group names, …) and consumes a `DocaiResult`. All
product-specific mapping lives in the caller as thin adapters. That boundary is what lets the
same engine serve many systems — keep it intact.

## Engine tiers (the router)

`route.ts` maps a mime type to a tier; every tier returns the same `DocaiResult`, so features
are additive:

- **vision-llm** — images + PDF → the selected vision provider. The accuracy ceiling.
- **handwriting** — a flag on the vision tier: tuned prompt + stricter review threshold +
  multi-crop tile geometry for dense handwritten tables.
- **self-hosted-ocr** — optional cheaper/offline tier (`engines/self-hosted.ts`,
  `DOCAI_OCR_URL`); `extractWithFallback()` tries it first and falls back to the vision tier
  on low confidence or error, so accuracy never regresses.
- **structured / text-llm** — deterministic (.xlsx/.csv) and text-extract (.docx) tiers,
  wired by the host as needed.

## The provider abstraction

The engine never talks to a vision SDK directly. `llm.ts` builds a `VisionRequest` and calls
whatever `VisionProvider` `resolveProvider()` returns. Providers are the *only* place the
network is touched from the core path. This is the seam that makes Lipi model-agnostic — see
[PROVIDERS.md](PROVIDERS.md).

Selection order: an explicit `provider` instance → `providerName` option →
`LIPI_VISION_PROVIDER` env → `anthropic`.

## Pure vs. impure

| Pure (no network, no secrets — unit-tested without a key) | Impure (network) |
|---|---|
| `types`, `schemas`, `prompt`, `route`, `confidence`, `batch`, `handwriting`, `llm` (logic) | `providers/*`, `engines/self-hosted`, `connectors/*` |

Providers are still testable without the network by injecting a fake `VisionProvider` (see
`providers/providers.test.ts`).

## Confidence model

Schemas carry per-item `confidence`. `confidence.ts` reduces these to an overall score and a
list of fields below the review threshold (default `0.85`; `0.92` in handwriting mode). The
caller routes those to human review — Lipi never asks you to blind-trust a page.

## Batch & merge

`extractBatch()` extracts each page on its own (so one bad page can't fail the rest) and
`batch.ts` merges the parts with page-order de-dup. List kinds
(`routine` / `people` / `subjects` / `rooms`) merge; others fall back to a single call.

## Module map

See the table in [`../CLAUDE.md`](../CLAUDE.md#module-map).

## Build & packaging

- TypeScript strict, ESM-first; `tsup` emits ESM + CJS + type declarations.
- Vision SDKs are **optional peer dependencies**, dynamically imported, so consumers install
  only what they use. `.npmrc` sets `legacy-peer-deps=true` so the optional peers coexist in
  dev/CI. Zod v4 is the single validation dependency.
