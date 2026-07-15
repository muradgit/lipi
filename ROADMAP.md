# Lipi Roadmap

This document outlines the planned features and improvements for Lipi.

## Current Version (0.1.0)

✅ Core document extraction engine  
✅ Multi-provider support (Anthropic, OpenAI, Google)  
✅ Batch processing with progress tracking  
✅ Confidence scoring and human review workflow  
✅ Handwriting mode  
✅ Self-hosted OCR fallback  
✅ Google Drive integration  
✅ Comprehensive test coverage  
✅ TypeScript support  
✅ Zod schema validation  

## Phase 1: Foundation (Current)
**Focus**: Establish robust core with community engagement

- [x] Public launch on GitHub
- [x] Community templates (issue/PR templates)
- [x] Code of Conduct
- [x] Security policy
- [x] Comprehensive documentation
- [ ] npm package publication
- [ ] CI/CD badges on README
- [ ] GitHub Discussions setup

**Estimated**: 1-2 weeks

## Phase 2: Provider Expansion (Q3 2026)
**Focus**: Support more AI providers

### Planned Providers
- [ ] AWS Textract (native document API)
- [ ] Azure Document Intelligence
- [ ] GCP DocumentAI
- [ ] Replicate (inference platform)
- [ ] Together.ai (open source models)
- [ ] Hugging Face (inference API)

### Internal
- [ ] Provider benchmarking suite
- [ ] Cost calculator
- [ ] Performance metrics dashboard
- [ ] Provider comparison guide

**Why**: Different providers have different strengths:
- AWS/GCP/Azure: Enterprise features, compliance
- Replicate/HF: Custom open models, cost-effective
- Together.ai: Privacy-focused on-premise

## Phase 3: Document Kind Expansion (Q3-Q4 2026)
**Focus**: Support more institutional documents

### New Document Kinds
- [ ] `invoice` - Invoice/receipt extraction
- [ ] `identity` - ID cards, passports
- [ ] `contract` - Legal document analysis
- [ ] `form` - Government/application forms
- [ ] `certificate` - Certificate/degree extraction
- [ ] `report` - Institutional reports

### Internal
- [ ] Document kind registry system (easier to extend)
- [ ] Per-kind prompt library
- [ ] Validation rules engine

**Why**: Institutional documents vary widely; support common ones.

## Phase 4: Advanced Features (Q4 2026)
**Focus**: Production-grade capabilities

### Extraction Features
- [ ] Multi-language support (English, Hindi, Urdu, etc.)
- [ ] Table extraction and structure
- [ ] Image/signature extraction
- [ ] Relationship extraction (who is whose manager, etc.)
- [ ] Anomaly detection (unusual values)
- [ ] Versioning/change tracking

### Performance
- [ ] Concurrent request batching
- [ ] Response caching (optional, with cache control)
- [ ] Streaming results for large batches
- [ ] Request deduplication
- [ ] Rate limiting helpers

### Debugging
- [ ] Request/response logging
- [ ] Prompt inspection
- [ ] Confidence heatmaps
- [ ] Schema validation reports
- [ ] Provider timing breakdowns

## Phase 5: Integrations (2027)
**Focus**: Make Lipi easy to integrate

### Framework Integrations
- [ ] Next.js example
- [ ] Express.js example
- [ ] Fastify example
- [ ] tRPC integration
- [ ] GraphQL example

### Database Support
- [ ] Prisma integration
- [ ] Supabase integration
- [ ] Postgres integration example
- [ ] MongoDB integration example

### UI Components
- [ ] React document uploader
- [ ] Review UI component
- [ ] Confidence visualization
- [ ] Batch progress indicator

## Phase 6: Data Management (2027)
**Focus**: Enterprise features

### Storage & Organization
- [ ] Document versioning
- [ ] Extraction history
- [ ] Audit logs
- [ ] Data cleanup policies
- [ ] GDPR compliance helpers

### Advanced
- [ ] Feedback loop for model improvement
- [ ] Custom model fine-tuning guides
- [ ] Webhooks for completion
- [ ] Scheduled extraction jobs

## Phase 7: Analytics & Monitoring (2027)
**Focus**: Production observability

### Metrics
- [ ] Cost tracking per document kind
- [ ] Confidence distribution analytics
- [ ] Provider performance comparison
- [ ] Extraction success rates
- [ ] Human review rates

### Dashboards
- [ ] Usage analytics
- [ ] Cost breakdown
- [ ] Performance trends
- [ ] Quality metrics

## Phase 8: Self-Hosted & Privacy (2027)
**Focus**: On-premise and privacy options

### Local Deployment
- [ ] Docker image with self-hosted models
- [ ] Kubernetes deployment guide
- [ ] GPU optimization
- [ ] Air-gapped deployment guide

### Privacy
- [ ] Document encryption at rest
- [ ] End-to-end encryption option
- [ ] Privacy policy helpers
- [ ] Data residency support

---

## Community Priorities

We're open to community-driven priorities! Please:

1. **Vote on issues** — React with 👍 on GitHub issues for features you want
2. **Open discussions** — Use GitHub Discussions to propose ideas
3. **Contribute** — Open PRs for new features/providers
4. **Provide feedback** — Comment on existing feature requests

## How to Contribute

Want to work on a roadmap item?

1. **Pick an item** from this roadmap
2. **Open an issue** to discuss implementation
3. **Fork & branch** — Create a feature branch
4. **Code & test** — Follow [CONTRIBUTING.md](CONTRIBUTING.md)
5. **Open PR** — Link to the roadmap item
6. **Get reviewed** — We'll provide feedback
7. **Celebrate** — Your contribution ships! 🎉

## Maintenance Commitments

We commit to:

- ✅ Monthly releases (at minimum)
- ✅ Security updates within 48 hours
- ✅ Responding to issues within 7 days
- ✅ Maintaining TypeScript strict mode
- ✅ 100% test coverage of core logic
- ✅ Backwards compatibility (within semver)

## Support This Project

Lipi is open source and free. If you find it valuable:

- ⭐ Star on GitHub
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Contribute code
- 📢 Share with others

Join the community and help shape the future of document intelligence! 🪶
