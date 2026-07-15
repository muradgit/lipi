/**
 * Format router — picks an engine tier from a document's mime type. Pure and
 * testable. New tiers (handwriting, self-hosted OCR) register here in later
 * phases; Phase 1 covers the vision-LLM, text-LLM, and deterministic-structured
 * tiers, with Tesseract as the free fallback the caller can request explicitly.
 */
import type { DocaiEngine } from "./types";

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const SPREADSHEET_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
];
const DOC_MIMES = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]; // .docx
const PDF_MIME = "application/pdf";

export function isImageMime(mime: string): boolean {
  return IMAGE_MIMES.includes(mime.toLowerCase());
}

/**
 * Choose the engine for a mime type.
 *  - images + PDF  → vision-llm (Claude reads scanned pages natively and accurately)
 *  - .docx         → text-llm (extract text first, then structure it)
 *  - .xlsx/.xls/csv→ structured (deterministic, free — no LLM needed)
 * Unknown types fall back to the vision tier, which is the most tolerant.
 */
export function detectEngine(mime: string): DocaiEngine {
  const m = mime.toLowerCase();
  if (isImageMime(m) || m === PDF_MIME) return "vision-llm";
  if (DOC_MIMES.includes(m)) return "text-llm";
  if (SPREADSHEET_MIMES.includes(m)) return "structured";
  return "vision-llm";
}

/** Whether the Phase-1 engine can process this mime without extra dependencies. */
export function isEngineReady(engine: DocaiEngine): boolean {
  // text-llm needs mammoth (docx) and self-hosted-ocr needs the hosted model —
  // both land in later phases; Phase 1 ships vision-llm + structured.
  return engine === "vision-llm" || engine === "structured";
}
