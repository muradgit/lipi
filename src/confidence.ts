/**
 * Pure helper that turns an extraction's per-item confidence scores into an
 * overall score + a list of below-threshold items for the review UI to flag.
 * Generic over any shape: it scans top-level array properties whose items carry
 * a numeric `confidence`, and reads a top-level `confidence` if present.
 */
import type { DocaiFieldConfidence } from "./types";

export function summarizeConfidence(
  data: unknown,
  threshold: number,
): { confidence: number; fields: DocaiFieldConfidence[] } {
  const fields: DocaiFieldConfidence[] = [];
  const itemScores: number[] = [];

  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      value.forEach((item, i) => {
        if (item && typeof item === "object" && typeof (item as { confidence?: unknown }).confidence === "number") {
          const c = (item as { confidence: number }).confidence;
          itemScores.push(c);
          if (c < threshold) fields.push({ path: `${key}[${i}]`, confidence: c });
        }
      });
    }
  }

  const topLevel =
    data && typeof data === "object" && typeof (data as { confidence?: unknown }).confidence === "number"
      ? (data as { confidence: number }).confidence
      : null;

  const confidence =
    topLevel ?? (itemScores.length ? itemScores.reduce((a, b) => a + b, 0) / itemScores.length : 1);

  return { confidence, fields };
}
