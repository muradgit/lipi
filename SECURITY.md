# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in Lipi, please **do not** open a public GitHub issue. Instead, please email the maintainers directly at muradkhan31@gmail.com with:

1. **Description**: What the vulnerability is
2. **Affected Versions**: Which versions of Lipi are vulnerable
3. **Steps to Reproduce**: How to trigger the vulnerability (if possible)
4. **Potential Impact**: What damage could be done
5. **Suggested Fix**: (Optional) Your proposed solution

Please include "[SECURITY]" in the email subject line.

We will:
- Acknowledge your report within 48 hours
- Investigate and assess the severity
- Develop and test a fix
- Release a patch version as soon as possible
- Credit you in the release notes (if desired)

## Security Best Practices for Users

### API Keys
- **Never commit API keys** to your repository
- Use environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.)
- Use `.env` files (add `.env` to `.gitignore`)
- Rotate keys regularly

### Document Handling
- Sanitize sensitive information from documents before processing
- Be mindful of PII (personally identifiable information) in extracted data
- Use review thresholds to catch ambiguous extractions
- Implement human review for sensitive documents

### Provider Selection
- Use HTTPS connections only (default for all SDKs)
- Keep SDK versions up to date
- Monitor provider security advisories

### Self-Hosted Mode
- If using `DOCAI_OCR_URL`, ensure the endpoint uses HTTPS
- Authenticate requests if your OCR endpoint is exposed
- Keep self-hosted models updated

## Known Limitations

1. **Model Hallucination**: Vision LLMs can hallucinate data. Always use:
   - Confidence thresholds (`reviewThreshold`)
   - Human review for critical data
   - Vocabulary grounding for canonical values

2. **Bengali Text Accuracy**: While Lipi excels at Bengali, accuracy depends on:
   - Document quality (clear text, good lighting for photos)
   - Provider model capabilities
   - Vocabulary match (uncommon words may be missed)

3. **PDF Processing**: 
   - OpenAI GPT-4o works with images only (not native PDFs)
   - Use Anthropic Claude or Google Gemini for direct PDF support

## Security Releases

Critical security patches will be:
- Released as patch versions (e.g., 0.1.1)
- Announced in GitHub Releases
- Included in the CHANGELOG

## Compliance

Lipi is MIT-licensed open-source software with no warranties. For production use:
- Review the security implications
- Implement appropriate access controls
- Monitor for security updates
- Keep dependencies updated regularly

## Dependencies

Lipi minimizes dependencies:
- **zod** (^4.4.3): Validation library, maintained
- **Provider SDKs**: Optional peer dependencies, maintained by their respective companies

We regularly update dependencies and will address any known vulnerabilities promptly.
