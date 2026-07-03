# Contributing to Lipi

Thanks for helping make Lipi better. This guide covers setup, the coding rules, and how to
land a change.

## Getting started

```bash
git clone https://github.com/muradgit/lipi.git
cd lipi
npm install
npm run typecheck && npm test && npm run build   # everything should be green
```

No API key is needed to build or test — the network layer is behind a provider interface,
and the test suite runs against pure logic and an injected fake provider.

## Ground rules (please read)

These are the same rules an AI assistant follows here (see `CLAUDE.md`). They keep Lipi
reusable and safe:

1. **No application imports.** `src/` must not import from any host application. Lipi is a
   library; keep it standalone.
2. **Go through the seams.**
   - New **document kind** → a Zod schema in `schemas.ts` + an instruction in `prompt.ts` +
     the `DocKind` union in `types.ts`.
   - New **AI provider** → one file in `src/providers/` implementing `VisionProvider`, wired
     into `resolveProvider`. No SDK calls anywhere else.
3. **Everything the caller sees is Zod-validated.** Don't return unvalidated model output.
4. **Keep the confidence/review valve.** Low-confidence fields must remain surfaced.
5. **English** for code, comments, and docs.
6. **No secrets** in the repo, ever.

## Code style

- TypeScript **strict**; no `any` unless truly unavoidable (and then localized + commented).
- Prefer small, pure functions; keep network/secret code in the provider/connector files.
- Match the surrounding style — naming, comment density, file headers.
- Zod is **v4**. Don't reintroduce the `openai/helpers/zod` helper (older Zod major); build
  JSON schema via `z.toJSONSchema`.
- Provider SDKs stay **optional peer dependencies** loaded via dynamic `import()`.

## Tests

- Add or update tests for any behavior you change. Pure modules test directly; providers are
  tested through an **injected/fake provider** (see `src/providers/providers.test.ts`), never
  a live network call.
- Run `npm run typecheck && npm test && npm run build` before pushing. CI runs the same.

## Commits & pull requests

- Clear, imperative English commit messages ("Add Gemini provider", not "added stuff").
- One logical change per PR. Update the relevant doc in the **same** PR when you change
  behavior, a schema, or the provider set.
- PR checklist:
  - [ ] `typecheck`, `test`, `build` all green
  - [ ] tests cover the change
  - [ ] docs updated if behavior/schema/providers changed
  - [ ] no application imports, no secrets, English only

## License of contributions

Lipi is MIT-licensed. By contributing, you agree your contributions are licensed under the
MIT License.
