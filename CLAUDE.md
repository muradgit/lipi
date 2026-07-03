# CLAUDE.md — Lipi

Orientation for an AI coding assistant (or any new contributor) dropped into this repo.
Read this first; it tells you what Lipi is, the rules that must hold, and how to make a
change safely.

## What Lipi is

Lipi is a **product-agnostic, Bengali-first document-intelligence engine**. Given a document
(photo / scanned PDF / Office file) and a caller-supplied vocabulary, it returns
**schema-valid, field-mapped JSON** using a vision LLM. It is designed to be reused across
many systems — so it must never depend on any specific application.

The public surface is tiny: `extract()`, `extractBatch()`, `extractWithFallback()`, the Zod
schemas, and the provider interface. Everything else is an implementation detail.

## Non-negotiable rules

1. **No application imports.** Code under `src/` must not import from any host app. The
   reuse boundary is the whole point. Caller-specific logic lives in the *caller*, as thin
   adapters that consume `DocaiResult`.
2. **Provider-agnostic.** The engine never calls a vision SDK directly. It builds a neutral
   `VisionRequest` and hands it to a `VisionProvider` (`src/providers/`). Adding a model
   company = adding one file that implements `VisionProvider`. Do not scatter SDK calls
   elsewhere.
3. **Schema-valid or nothing.** Every `DocKind` has a Zod schema in `schemas.ts`. Providers
   return data that is validated against it before it reaches the caller. Never return
   loosely-typed model output.
4. **Confidence-gated, never blind-trust.** Schemas carry per-item confidence; fields below
   the review threshold are surfaced in `result.fields` for human review. Keep this valve.
5. **Keep the pure/impure split.** Pure modules (`types`, `schemas`, `prompt`, `route`,
   `confidence`, `batch`, `handwriting`) have no network and no secrets, so they are unit-
   tested without any API key. Only the provider implementations touch the network.
6. **English everywhere in the code** — identifiers, comments, docs, commit messages. (Lipi
   *reads* Bengali; it is *written* in English.)
7. **No secrets in the repo.** Keys come from env vars at runtime only.

## Module map

| File | Role | Pure? |
|---|---|---|
| `src/types.ts` | `DocKind`, `DocaiVocabulary`, `DocaiSource`, `DocaiResult`, options | ✅ |
| `src/schemas.ts` | Zod target schema per kind + `schemaFor()` registry | ✅ |
| `src/prompt.ts` | system + per-kind instruction + vocabulary grounding | ✅ |
| `src/route.ts` | mime → engine tier | ✅ |
| `src/confidence.ts` | scores → overall + below-threshold field list | ✅ |
| `src/batch.ts` | page-order de-dup + merge for multi-page batches | ✅ |
| `src/handwriting.ts` | handwriting prompt suffix + tile geometry | ✅ |
| `src/llm.ts` | builds the neutral request, delegates to the provider | ✅ logic |
| `src/providers/*` | `VisionProvider` interface + Anthropic / OpenAI / Google + registry | network |
| `src/engines/self-hosted.ts` | client + fallback gate for a self-hosted OCR endpoint | network |
| `src/connectors/*` | Google Drive fetch/export + OAuth helpers | network |
| `src/index.ts` | `extract` / `extractBatch` / `extractWithFallback` — public entry | — |

## How to make common changes

- **Add a document kind:** add a Zod schema in `schemas.ts` + register it; add a per-kind
  instruction in `prompt.ts`; add it to the `DocKind` union in `types.ts`. Add a test.
- **Add an AI provider:** create `src/providers/<name>.ts` exporting
  `create<Name>Provider(opts): VisionProvider`; wire it into `resolveProvider` in
  `src/providers/index.ts`; document it in `docs/PROVIDERS.md`. Add a factory test.
- **Change prompting:** edit `prompt.ts` only. Providers must stay prompt-agnostic.

## Workflow for every change

1. Make the change following the rules above.
2. **Gate before committing:** `npm run typecheck && npm test && npm run build` — all green.
3. Add/adjust tests for the behavior you touched (pure modules are easy to test; providers
   are tested via an injected/fake provider, not the network).
4. Commit with a clear English message; open a PR; keep CI green.
5. Update the relevant doc in the same PR when behavior, schema, or the provider set changes.

## Good to know

- Zod is v4. The OpenAI provider builds its JSON schema via `z.toJSONSchema` rather than the
  `openai/helpers/zod` helper (which is pinned to an older Zod major) — keep it that way.
- Provider SDKs are **optional peer dependencies**, loaded with dynamic `import()`. A user
  installs only the one they use. Don't turn them into hard dependencies.
- `.npmrc` sets `legacy-peer-deps=true` so the optional peers can coexist during dev/CI.
