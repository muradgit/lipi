# Usage guide

A practical walkthrough for developers integrating Lipi.

## Install & configure

```bash
npm install lipi-ai
npm install @anthropic-ai/sdk          # or `openai`, or `@google/generative-ai`
```

```bash
# server env
ANTHROPIC_API_KEY=sk-ant-...           # key for your chosen provider
# LIPI_VISION_PROVIDER=anthropic       # anthropic (default) | openai | google
```

Call Lipi from **server** code only (an API route, a serverless function, a worker) — the
provider layer holds your key.

## The core call

```ts
import { extract } from "lipi-ai";
import type { DocaiResult } from "lipi-ai";

const result: DocaiResult<unknown> = await extract(
  kind,        // "routine" | "people" | "subjects" | "rooms" | "notice" | "all_sections"
  sources,     // DocaiSource[]  — { bytes: Uint8Array, mime: string }  (or { driveFileId })
  vocab,       // DocaiVocabulary — your controlled vocabulary (grounding)
  opts,        // optional
);
```

Returns:

```ts
{
  data,        // Zod-validated, schema-shaped extraction
  confidence,  // 0..1 overall
  fields,      // [{ path, confidence }] below the review threshold
  engine,      // which tier ran
  pages,       // pages processed (a natural billing unit)
}
```

## Grounding: the vocabulary

The vocabulary is passed verbatim into the prompt so the model maps what it reads to your
**canonical** values instead of raw text:

```ts
const vocab = {
  subjects: [{ code: "PHY1", bn: "পদার্থবিজ্ঞান ১ম পত্র", en: "Physics 1st Paper" }],
  designations: ["সহকারী শিক্ষক (Assistant Teacher)", "প্রধান শিক্ষক (Head Teacher)"],
  groups: ["বিজ্ঞান", "মানবিক", "ব্যবসায় শিক্ষা"],
};
```

Every field is optional — supply what the document needs. Better grounding = better mapping.

## Document kinds & schemas

Each `DocKind` has a Zod schema (exported from the package root). Inspect or reuse them:

```ts
import { schemaFor, routineExtractionSchema } from "lipi-ai";
const schema = schemaFor("routine");
```

- `routine` — exam/date rows with subjects, times, shift.
- `people` (+ `role` grounding) — students / teachers / staff; names (bn/en), gender, group,
  designation, contacts.
- `subjects` — subject catalog rows.
- `rooms` — rooms with capacity/columns.
- `notice` — `{ title, body, date, signatory }`.
- `all_sections` — an all-in-one document → institution + class + subjects + rooms + people.

## Choosing a provider per call

```ts
await extract("people", sources, vocab, { providerName: "google" });     // by name
await extract("people", sources, vocab, { provider: myProvider });       // custom instance
await extract("people", sources, vocab, { model: "claude-3-5-sonnet" }); // model override
```

See [PROVIDERS.md](PROVIDERS.md).

## Batch + live progress

```ts
import { extractBatch } from "lipi-ai";

const result = await extractBatch("people", pages /* DocaiSource[] */, vocab, {
  onProgress: ({ page, total, stage }) => console.log(`${stage} ${page}/${total}`),
});
```

Each page is read independently (a bad page won't fail the batch) and merged with page-order
de-dup. Non-list kinds fall back to a single call.

## Handwriting mode

```ts
await extract("people", sources, vocab, { handwriting: true });
```

Adds a handwriting-tuned prompt and raises the review threshold to `0.92`, so uncertain cells
always land in `result.fields` for a human.

## Self-hosted / offline fallback

```ts
import { extractWithFallback } from "lipi-ai";
// set DOCAI_OCR_URL (+ optional DOCAI_OCR_TOKEN) to your OCR endpoint
const result = await extractWithFallback("routine", sources, vocab);
```

Tries the cheaper self-hosted model first; falls back to the vision provider on low confidence
or error. With no endpoint configured this is exactly `extract()`.

## Google Drive input

```ts
// resolve a Drive file id to bytes elsewhere, then pass it as a source:
await extract("all_sections", [{ driveFileId }], vocab);
```

Google-native Docs/Sheets/Slides are exported to PDF automatically. OAuth token storage is the
host app's responsibility (see `src/connectors/`).

## Handling the result

```ts
if (result.fields.length) {
  // route these paths to a human review UI before trusting them
}
// otherwise persist result.data via your own adapter
```

## Errors

- Missing key → a clear `lipi: <PROVIDER>_API_KEY is not set` error.
- Model refusal → `extract()` throws `lipi: the model declined to extract this document`.
- Unreadable source → `lipi: vision tier needs source bytes + mime`.

Wrap calls in try/catch and surface a friendly message to your users.

## Minimal API route (Next.js example)

```ts
// app/api/extract/route.ts  (server)
import { extract } from "lipi-ai";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await extract("routine", [{ bytes, mime: file.type }], vocab);
  return Response.json(result);
}
```
