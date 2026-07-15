# Changelog

All notable changes to Lipi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release
- Multi-provider support (Anthropic, OpenAI, Google)
- Batch processing with progress tracking
- Confidence scoring and human review workflow
- Handwriting mode with stricter thresholds
- Self-hosted OCR fallback support
- Google Drive integration
- OAuth helpers for third-party auth
- Comprehensive test suite (48 tests)
- Full TypeScript types and Zod schemas

### Fixed
- TypeScript compilation errors in providers/index.ts
- Missing node types in tsconfig.json
- Empty provider factory tests

### Security
- No secrets stored in repository
- Optional peer dependencies (SDKs not bundled)
- Lazy loading of SDK imports
- Secure API key handling via environment variables

## [0.1.0] - 2026-07-15

### Added
- Initial public release of Lipi
- Document extraction engine with vision LLM support
- Support for Anthropic, OpenAI, and Google providers
- Multiple document kinds: routine, people, subjects, rooms, notice, all_sections
- Confidence scoring per field
- Batch processing support
- Handwriting recognition mode
- Self-hosted OCR fallback
- Google Drive connector
- Comprehensive documentation
- Contributing guidelines
- Code of Conduct
- Security policy

---

## How to Release a New Version

1. Update version in `package.json`
2. Add changes to this CHANGELOG under `[Unreleased]` → new version section
3. Commit with message: "Release v0.x.0"
4. Create GitHub tag: `git tag v0.x.0 && git push origin v0.x.0`
5. CI will automatically publish to npm
6. Create a GitHub Release from the tag

## Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes to public API
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Deprecation Policy

When deprecating a feature:
1. Mark with `@deprecated` JSDoc comment
2. Update CHANGELOG with deprecation notice
3. Keep deprecated code for at least one major version
4. Remove in the next major version
