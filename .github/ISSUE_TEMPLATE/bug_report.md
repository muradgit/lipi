---
name: Bug Report
about: Report a bug in Lipi
title: '[BUG] '
labels: bug
assignees: ''
---

## Describe the Bug
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Setup (environment, document type, etc.)
2. Call to Lipi (which function, which parameters)
3. What you observed

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Code Snippet
```typescript
// Minimal code to reproduce the issue
import { extract } from "lipi-ai";

const result = await extract(
  "people",
  [{ bytes, mime: "image/jpeg" }],
  vocab,
  { providerName: "anthropic" }
);
```

## Environment
- **OS**: (Windows / macOS / Linux)
- **Node.js version**: (e.g., 20.0.0)
- **Lipi version**: (e.g., 0.1.0)
- **Provider**: (Anthropic / OpenAI / Google / Custom)
- **Document type**: (routine / people / subjects / rooms / notice / all_sections)

## Document Details
- **Format**: (JPEG / PDF / PNG)
- **Language**: (Bengali / English / Mixed)
- **Handwritten**: (Yes / No)
- **Can you share a sample?** (Yes / No — use a sanitized/anonymized version if possible)

## Additional Context
Any other context about the problem? Check logs? Error messages?

## Error Output
```
Paste any error messages or stack traces here
```
