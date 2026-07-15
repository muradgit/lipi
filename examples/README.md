# Lipi Examples

This directory contains practical examples of using Lipi in different scenarios.

## Quick Start

### Example 1: Basic Usage (`basic-usage.ts`)

Comprehensive examples covering:
- Single image extraction
- Batch processing with progress
- Custom AI providers
- Provider selection
- Confidence thresholds
- Document kinds

```bash
npx ts-node examples/basic-usage.ts
```

## Example Scenarios

### Extracting Staff List from Photo

```typescript
import { extract } from "lipi-ai";
import fs from "fs";

const staffListPhoto = fs.readFileSync("staff.jpg");

const result = await extract(
  "people",
  [{ bytes: staffListPhoto, mime: "image/jpeg" }],
  {
    designations: [
      "প্রধান শিক্ষক",
      "সহকারী শিক্ষক",
      "বিষয় শিক্ষক"
    ]
  }
);

console.log(result.data); // Structured staff list
```

### Processing Exam Routine (Multi-page)

```typescript
import { extractBatch } from "lipi-ai";
import fs from "fs";

// Read multiple pages of exam routine
const pages = fs.readdirSync("./exam-pages").map(f => ({
  bytes: fs.readFileSync(`./exam-pages/${f}`),
  mime: "image/jpeg"
}));

const result = await extractBatch(
  "routine",
  pages,
  { subjects: [...] },
  {
    onProgress: (p) => {
      console.log(`Processing page ${p.page}/${p.total}...`);
    }
  }
);

console.log(result.data); // Merged routine data
```

### Cost-Optimized Extraction with Fallback

```typescript
import { extractWithFallback } from "lipi-ai";

// Try cheap local OCR first, fall back to Claude if needed
const result = await extractWithFallback(
  "notice",
  [noticeImage],
  {},
  {
    selfHostedMinConfidence: 0.8 // Fall back if local confidence < 80%
  }
);

if (result.engine === "self-hosted-ocr") {
  console.log("✓ Used cheap local OCR");
} else {
  console.log("Used Claude (local OCR confidence was low)");
}
```

### Custom Provider Integration

```typescript
import { extract } from "lipi-ai";
import type { VisionProvider } from "lipi-ai";

// Implement your own provider for any AI company
const myProvider: VisionProvider = {
  name: "my-ai",
  defaultModel: "my-model-v1",
  async extract(req) {
    const response = await fetch("https://my-api.com/extract", {
      method: "POST",
      body: JSON.stringify({
        system: req.system,
        instruction: req.instruction,
        images: req.sources
      })
    });

    const json = await response.json();
    return {
      data: req.schema.parse(json),
      refused: false
    };
  }
};

const result = await extract("people", sources, vocab, { provider: myProvider });
```

### Working with Handwritten Documents

```typescript
import { extract } from "lipi-ai";

// Handwriting mode: special prompt + stricter confidence threshold
const result = await extract(
  "notice",
  [{ bytes: handwrittenNotice, mime: "image/jpeg" }],
  {},
  {
    handwriting: true, // Enables handwriting mode
    reviewThreshold: 0.92 // Stricter threshold (auto-set for handwriting)
  }
);

// Lower confidence = more fields need human review
console.log("Fields needing review:", result.fields);
```

## Running the Examples

### Prerequisites

```bash
# Install Lipi and a provider
npm install lipi-ai @anthropic-ai/sdk

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...
```

### Run with ts-node (TypeScript)

```bash
npx ts-node examples/basic-usage.ts
```

### Run with Node (JavaScript)

```bash
# Compile TypeScript first
npm run build

# Or manually
npx tsc examples/basic-usage.ts --esm --module esnext --target es2022

# Then run
node examples/basic-usage.js
```

## Tips

1. **Start with basic usage**: Begin with `basic-usage.ts` to understand the API
2. **Use provider benchmarks**: Compare speed/cost/accuracy for your use case
3. **Vocabulary matters**: Better grounding → better extraction accuracy
4. **Image quality**: High-quality photos/scans → higher confidence scores
5. **Review thresholds**: Tune for your use case (strict for critical data, loose for exploratory)

## Document Samples

To run examples with real documents, add image files to the appropriate directories:

```
examples/
├── documents/
│   ├── staff-list.jpg
│   ├── exam-routine.pdf
│   └── notice.jpg
└── basic-usage.ts
```

## Next Steps

- Read [docs/USAGE.md](../docs/USAGE.md) for complete API documentation
- Read [docs/PROVIDERS.md](../docs/PROVIDERS.md) to configure providers
- Check [FAQ.md](../FAQ.md) for troubleshooting
- Open an issue if you need help!

## Contributing

Have a useful example? Submit a PR! We love seeing how Lipi is used in the wild.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
