---
name: New Provider Request
about: Request support for a new vision AI provider
title: '[PROVIDER] '
labels: provider
assignees: ''
---

## Which Provider Would You Like?
(e.g., Replicate, HuggingFace, AWS Textract, etc.)

## Provider Details
- **Name**: 
- **Website/Docs**: 
- **API Type**: (REST / SDK)
- **Supports structured output**: (Yes / No)
- **Good for Bengali**: (Yes / No / Unknown)
- **Pricing**: (Free tier? Cost per call?)

## Why This Provider?
What makes this provider valuable? What's the use case?

## Current Workaround
How are you currently handling this?

## References
- Link to provider docs
- Link to any open issues in their repo
- Examples of similar implementations

---

**Note:** Contributing a new provider is straightforward!
See [CONTRIBUTING.md](../../CONTRIBUTING.md#ground-rules) for the requirements:
1. Create `src/providers/<name>.ts` implementing `VisionProvider`
2. Wire it into `resolveProvider()`
3. Add tests in `src/providers/providers.test.ts`
4. Update `docs/PROVIDERS.md` with setup instructions

We welcome pull requests for new providers!
