/**
 * Basic Lipi Usage Examples
 *
 * Run with: npx ts-node examples/basic-usage.ts
 * (or compile to JS and run with Node)
 */

import fs from "fs";
import { extract, extractBatch, extractWithFallback } from "lipi-ai";
import type { DocaiVocabulary } from "lipi-ai";

// Set your API key:
// export ANTHROPIC_API_KEY=sk-ant-...
// or use OPENAI_API_KEY, GOOGLE_GENAI_API_KEY

// ============================================================================
// Example 1: Extract from a single image
// ============================================================================

async function example1_singleImage() {
  console.log("=== Example 1: Single Image Extraction ===\n");

  // Read image from disk
  const imagePath = "./sample-images/student-list.jpg";
  if (!fs.existsSync(imagePath)) {
    console.log(`Sample image not found at ${imagePath}`);
    console.log("To test, provide your own image file.\n");
    return;
  }

  const bytes = fs.readFileSync(imagePath);

  // Define vocabulary (maps raw text to canonical values)
  const vocab: DocaiVocabulary = {
    subjects: [
      { code: "MTH1", bn: "গণিত ১ম পত্র", en: "Math 1st" },
      { code: "ENG1", bn: "ইংরেজি ১ম পত্র", en: "English 1st" },
      { code: "PHY1", bn: "পদার্থবিজ্ঞান ১ম পত্র", en: "Physics 1st" },
    ],
    designations: [
      "প্রধান শিক্ষক",
      "সহকারী শিক্ষক",
      "বিষয় শিক্ষক",
      "প্রশাসক",
    ],
    groups: ["বিজ্ঞান", "মানবিক", "ব্যবসায়"],
  };

  // Extract
  const result = await extract(
    "people", // Document kind
    [{ bytes, mime: "image/jpeg" }], // Sources
    vocab, // Vocabulary
    {
      providerName: "anthropic", // Which provider to use
      reviewThreshold: 0.85, // Flag fields below this confidence for review
    }
  );

  // Use the result
  console.log("✓ Extraction successful!");
  console.log(`Overall confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Engine used: ${result.engine}`);
  console.log(`Pages processed: ${result.pages}\n`);

  // Extracted data (schema-validated)
  console.log("Extracted Data:");
  console.log(JSON.stringify(result.data, null, 2));

  // Fields that need human review
  if (result.fields.length > 0) {
    console.log("\n⚠️  Fields needing review (confidence < 0.85):");
    for (const field of result.fields) {
      console.log(`  - ${field.path}: ${(field.confidence * 100).toFixed(1)}%`);
    }
  } else {
    console.log("\n✓ All fields pass review threshold");
  }
}

// ============================================================================
// Example 2: Batch processing with progress
// ============================================================================

async function example2_batchProcessing() {
  console.log("\n=== Example 2: Batch Processing ===\n");

  // For demo, we'll create fake pages
  // In reality, read actual image files:
  // const pages = fs.readdirSync("./documents").map(f => ({
  //   bytes: fs.readFileSync(`./documents/${f}`),
  //   mime: "image/jpeg"
  // }));

  console.log("Batch processing with progress tracking:");
  console.log(
    "(This example shows how progress callbacks work)\n"
  );

  // Define vocabulary
  const vocab: DocaiVocabulary = {
    subjects: [
      { code: "MTH1", bn: "গণিত ১ম পত্র", en: "Math 1st" },
      { code: "ENG1", bn: "ইংরেজি ১ম পত্র", en: "English 1st" },
    ],
  };

  // To use in practice:
  // const result = await extractBatch("subjects", pages, vocab, {
  //   onProgress: (progress) => {
  //     console.log(`[${progress.stage}] Page ${progress.page}/${progress.total}`);
  //   }
  // });

  console.log("Progress callback would output:");
  console.log("  [extracting] Page 1/10");
  console.log("  [extracting] Page 2/10");
  console.log("  [extracting] Page 3/10");
  console.log("  [merging] Page 3/10");
  console.log("  [done] Page 3/10\n");
}

// ============================================================================
// Example 3: Custom AI provider
// ============================================================================

async function example3_customProvider() {
  console.log("\n=== Example 3: Custom AI Provider ===\n");

  const vocab: DocaiVocabulary = {
    designations: ["প্রধান শিক্ষক", "সহকারী শিক্ষক"],
  };

  // Import types
  const { VisionProvider, VisionRequest, VisionResult } = await import(
    "lipi-ai"
  );

  // Example: Custom provider for your own model company
  const customProvider = {
    name: "my-model-company",
    defaultModel: "my-model-v1",
    async extract(req) {
      // Call YOUR API, not Claude/GPT/Gemini
      const response = await fetch("https://my-api.example.com/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: req.system,
          instruction: req.instruction,
          images: req.sources,
          model: req.model || this.defaultModel,
        }),
      });

      if (!response.ok) {
        return { data: undefined, refused: true };
      }

      const json = await response.json();
      try {
        // Validate against Lipi's schema
        return { data: req.schema.parse(json), refused: false };
      } catch {
        return { data: undefined, refused: true };
      }
    },
  };

  console.log("Custom provider structure:");
  console.log(JSON.stringify(customProvider, null, 2));
  console.log(
    '\nUse it: await extract("people", sources, vocab, { provider: customProvider });'
  );
}

// ============================================================================
// Example 4: Provider selection options
// ============================================================================

async function example4_providerSelection() {
  console.log("\n=== Example 4: Provider Selection ===\n");

  const vocab: DocaiVocabulary = {
    subjects: [{ code: "PHY1", bn: "পদার্থবিজ্ঞান ১ম পত্র", en: "Physics 1st" }],
  };

  // You can select providers three ways:

  // Option 1: Default (Anthropic)
  console.log('1. Default: extract("routine", sources, vocab)');
  console.log("   → Uses Anthropic Claude (best Bengali)\n");

  // Option 2: By name
  console.log('2. By name: extract("routine", sources, vocab, {');
  console.log('     providerName: "openai"');
  console.log('   });');
  console.log("   → Uses OpenAI GPT-4o\n");

  // Option 3: Environment variable
  console.log("3. Global: Set LIPI_VISION_PROVIDER=google");
  console.log("   export LIPI_VISION_PROVIDER=google");
  console.log("   → All calls use Google Gemini\n");

  // Option 4: Custom
  console.log(
    '4. Custom: extract("routine", sources, vocab, { provider: myProvider });'
  );
  console.log("   → Uses your custom provider\n");
}

// ============================================================================
// Example 5: Confidence & Review Thresholds
// ============================================================================

async function example5_confidenceThresholds() {
  console.log("\n=== Example 5: Confidence & Review Thresholds ===\n");

  const vocab: DocaiVocabulary = {};

  console.log("Default threshold (0.85):");
  console.log(
    '  Fields with confidence < 0.85 are flagged in result.fields'
  );
  console.log(
    '  await extract("people", sources, vocab) // threshold = 0.85\n'
  );

  console.log("Strict threshold (0.95):");
  console.log("  Only very confident fields pass");
  console.log(
    '  await extract("people", sources, vocab, { reviewThreshold: 0.95 })\n'
  );

  console.log("Loose threshold (0.5):");
  console.log("  Accept uncertain fields");
  console.log(
    '  await extract("people", sources, vocab, { reviewThreshold: 0.5 })\n'
  );

  console.log("Handwriting mode:");
  console.log("  Automatically uses stricter threshold (0.92)");
  console.log(
    '  await extract("people", sources, vocab, { handwriting: true })\n'
  );
}

// ============================================================================
// Example 6: Document kinds
// ============================================================================

function example6_documentKinds() {
  console.log("\n=== Example 6: Document Kinds (DocKind) ===\n");

  const kinds = [
    {
      kind: "routine",
      description: "Academic routines/timetables",
      example: "Class schedule, exam routine",
    },
    {
      kind: "people",
      description: "Staff/student lists",
      example: "Teacher list with roles, student roster",
    },
    {
      kind: "subjects",
      description: "Subject registrations",
      example: "Subject allocation, course list",
    },
    {
      kind: "rooms",
      description: "Classroom/venue information",
      example: "Room allocation, venue list",
    },
    {
      kind: "notice",
      description: "Announcements/notices",
      example: "Holiday notice, exam notice",
    },
    {
      kind: "all_sections",
      description: "Comprehensive data",
      example: "Full institutional data in one document",
    },
  ];

  for (const k of kinds) {
    console.log(`"${k.kind}"`);
    console.log(`  Description: ${k.description}`);
    console.log(`  Example: ${k.example}\n`);
  }

  console.log("Add custom kinds in src/schemas.ts, src/prompt.ts, src/types.ts");
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║         Lipi - Bengali Document Intelligence Engine      ║");
  console.log("║                    Usage Examples                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  try {
    // Run examples
    await example1_singleImage();
    await example2_batchProcessing();
    await example3_customProvider();
    await example4_providerSelection();
    await example5_confidenceThresholds();
    example6_documentKinds();

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║                  Ready to get started?                   ║");
    console.log("║  Read docs/USAGE.md for complete API documentation      ║");
    console.log("║  Read docs/PROVIDERS.md to configure your provider      ║");
    console.log("║  Read FAQ.md for common questions                       ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
