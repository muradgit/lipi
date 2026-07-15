# Frequently Asked Questions (FAQ)

## Installation & Setup

### Q: Which provider should I use?
**A:** 
- **Anthropic Claude** (default): Best Bengali support, understands context well
- **OpenAI GPT-4o**: Fast, reliable, good for mixed Bengali/English
- **Google Gemini**: Good for PDFs, best cost-to-performance ratio

Try Anthropic first; benchmark if performance/cost matters.

### Q: Do I need to install all SDKs?
**A:** No! Only install the ONE you use:
```bash
# Pick exactly one:
npm install @anthropic-ai/sdk              # Anthropic
npm install openai                          # OpenAI
npm install @google/generative-ai           # Google
```

They're optional peer dependencies, so Lipi doesn't force bloat.

### Q: Where do I set my API key?
**A:** Use environment variables (never commit keys):
```bash
# .env (add to .gitignore!)
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
# or
GOOGLE_GENAI_API_KEY=...
```

Load with `dotenv` or your environment manager, then use Lipi.

### Q: Can I use Lipi in the browser?
**A:** No. Lipi is server-side only because:
- API keys can't be exposed to browsers
- Provider SDKs are server-only
- Batch processing needs server resources

Build a backend service; call from your frontend via API.

---

## Usage & API

### Q: How do I use Lipi?
**A:** Three functions:
```typescript
// Single document
const result = await extract("people", [doc], vocab, options);

// Multiple documents (batch)
const result = await extractBatch("people", [doc1, doc2, ...], vocab, options);

// Try cheap OCR first, fall back to AI if needed
const result = await extractWithFallback("people", docs, vocab, options);
```

See [docs/USAGE.md](docs/USAGE.md) for complete examples.

### Q: What document kinds are supported?
**A:** Six kinds (extensible):
- `routine` - academic timetables/schedules
- `people` - staff/student lists
- `subjects` - subject registrations
- `rooms` - classroom/venue info
- `notice` - announcements
- `all_sections` - comprehensive data

Add your own by:
1. Creating a Zod schema in `schemas.ts`
2. Adding an instruction in `prompt.ts`
3. Adding it to the `DocKind` union in `types.ts`

### Q: What image formats are supported?
**A:** 
- **Images**: JPEG, PNG, WebP, GIF
- **PDFs**: Supported (Anthropic & Google; OpenAI needs image conversion)
- **Office files**: Not directly; export to PDF first

### Q: What's `reviewThreshold`?
**A:** Fields below this confidence are flagged for human review (default 0.85):
```typescript
// Default
const result = await extract(...);           // reviewThreshold = 0.85
// Stricter review
await extract(..., { reviewThreshold: 0.95 }); // Only confident fields pass
// Looser review
await extract(..., { reviewThreshold: 0.5 });  // Only very uncertain fields flagged
```

Handwriting mode uses 0.92 automatically.

### Q: What's `vocabulary`?
**A:** Maps raw text to canonical values:
```typescript
const vocab = {
  subjects: [
    { code: "PHY1", bn: "পদার্থবিজ্ঞান ১ম পত্র", en: "Physics 1st" }
  ],
  designations: ["প্রধান শিক্ষক", "সহকারী শিক্ষক"],
  groups: ["বিজ্ঞান", "মানবিক"]
};
```

The model reads "বিজ্ঞান গ্রুপ" and maps it to `"বিজ্ঞান"` (canonical). Without vocabulary, the model returns raw extracted text.

---

## Performance & Costs

### Q: Why is extraction slow?
**A:** 
- First call loads the provider SDK (~2-3 seconds)
- Each API call takes 2-5 seconds depending on provider
- Batch processing has per-page overhead
- Large PDFs take longer

**Solutions:**
- Reuse the provider instance across calls (Lipi does this automatically)
- Use `extractBatch()` for multi-page docs (more efficient)
- Optimize document quality (clear, well-lit photos)

### Q: How much does extraction cost?
**A:** Depends on your provider:
- **Anthropic**: ~$0.05 per document (vision models)
- **OpenAI**: ~$0.02-0.05 per document
- **Google**: ~$0.001-0.005 per document (cheapest)

**Cost optimization:**
- Use `extractWithFallback()` with self-hosted OCR first
- Batch similar documents to amortize overhead
- Choose the cheapest provider that meets quality needs

### Q: What's self-hosted OCR mode?
**A:** 
1. Try a cheap local OCR model (e.g., PaddleOCR)
2. If confidence < threshold, fall back to Claude
3. Saves cost while keeping accuracy high
```typescript
// With self-hosted OCR configured via DOCAI_OCR_URL
const result = await extractWithFallback("routine", docs, vocab, {
  selfHostedMinConfidence: 0.8  // Fall back if local confidence < 0.8
});
```

---

## Troubleshooting

### Q: I'm getting "API key is not set" error
**A:** 
```
Error: lipi: ANTHROPIC_API_KEY is not set
```

**Fix:**
```bash
# Set the key
export ANTHROPIC_API_KEY=sk-ant-...
# Verify it's set
echo $ANTHROPIC_API_KEY
# Or use a .env file
# .env
ANTHROPIC_API_KEY=sk-ant-...
# Load it (use dotenv package or your framework's env loader)
```

### Q: Extraction fails with "model declined to extract"
**A:** The model refused the request. Causes:
- Document is too blurry/unclear
- Document contains harmful content (rare)
- Provider's safety filter triggered

**Fix:**
- Use higher quality images
- Check for policy violations
- Switch provider if issues persist

### Q: Bengali text is being misread
**A:** 
- **Model limitation**: Some models handle Bengali less well
- **Image quality**: Ensure clear text, good lighting
- **Fonts**: Some Bengali fonts render poorly in photos

**Solutions:**
- Use Anthropic Claude (best Bengali)
- Improve image quality (better camera, better lighting)
- Try Google Gemini as backup
- Provide vocabulary grounding for common words

### Q: TypeScript errors about missing types
**A:** 
```
error TS2307: Cannot find module '@anthropic-ai/sdk'
```

**Fix:** Install `@types/node` and the provider SDK:
```bash
npm install --save-dev @types/node
npm install @anthropic-ai/sdk
npm run typecheck
```

### Q: Batch extraction failed on one page, how do I retry?
**A:** 
- `extractBatch()` survives individual page failures
- Failed pages are skipped, successful ones are merged
- Manually retry failed pages with `extract()`

```typescript
try {
  const result = await extractBatch("people", pages, vocab);
  // Some pages may have failed, but others succeeded
  console.log(result.data);
} catch (e) {
  // Total failure — try individual pages
  for (const page of pages) {
    try {
      const result = await extract("people", [page], vocab);
      console.log(result.data);
    } catch (e) {
      console.error("Failed:", e);
    }
  }
}
```

### Q: How do I increase extraction confidence?
**A:**
- **Improve image quality**: Better camera, good lighting, straight angle
- **Provide vocabulary**: Canonical values guide the model
- **Use clearer handwriting mode**: If applicable
- **Try a better provider**: Anthropic > OpenAI > Google generally

### Q: Can I customize the prompt?
**A:** Not directly (prevents misuse), but you can:
- Implement a custom `VisionProvider` with your prompt
- Use vocabulary grounding to guide extraction
- Pre-process documents (OCR + custom parsing)

---

## Advanced

### Q: How do I add a custom provider?
**A:** Implement `VisionProvider` interface:

```typescript
import type { VisionProvider, VisionRequest, VisionResult } from "lipi-ai";

const myProvider: VisionProvider = {
  name: "my-model",
  defaultModel: "my-v1",
  async extract<T>(req: VisionRequest<T>): Promise<VisionResult<T>> {
    // Call your API
    const json = await myApi.call(req);
    return { data: req.schema.parse(json), refused: false };
  }
};

const result = await extract("people", sources, vocab, { provider: myProvider });
```

See [docs/PROVIDERS.md](docs/PROVIDERS.md#adding-a-provider) for full guide.

### Q: How do I contribute?
**A:** 
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Fork & clone: `git clone https://github.com/YOUR_USERNAME/lipi.git`
3. Create branch: `git checkout -b feature/my-feature`
4. Code & test: `npm run typecheck && npm test && npm run build`
5. Push & open PR

We welcome:
- Bug fixes
- New providers
- New document kinds
- Documentation improvements
- Example code

### Q: Is there a roadmap?
**A:** See GitHub Issues for planned features. Current focus:
- More document kinds
- Better Bengali handwriting support
- Additional providers
- Integration examples
- Performance benchmarks

---

## Still Have Questions?

- **GitHub Issues**: Report bugs or request features
- **Discussions**: Ask questions, share ideas
- **Email**: muradkhan31@gmail.com for security issues
- **CONTRIBUTING.md**: Learn how to contribute
- **CLAUDE.md**: For AI assistant developers

We're here to help! 🪶
