/**
 * Batch merge for multi-file / multi-page extractions (Phase 5). When one job is
 * a stack of pages (e.g. a 7-page scanned student list), each page is extracted
 * on its own — so progress can stream and one bad page can't fail the rest — and
 * the per-page results are merged into one. Pure + unit-testable (no SDK/key).
 *
 * Only LIST kinds batch-merge (their extraction has one array field). notice /
 * all_sections don't merge naturally, so those fall back to a single call.
 */
import type { DocKind } from "./types";

export interface BatchConfig {
  /** The array property to concatenate across parts. */
  listKey: string;
  /** De-dup key for one list item ("" = can't dedup, always kept). */
  keyOf: (item: unknown) => string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** The batch merge rule for a kind, or null when the kind isn't list-batchable. */
export function batchConfigFor(kind: DocKind): BatchConfig | null {
  switch (kind) {
    case "people":
      return {
        listKey: "people",
        keyOf: (i) => {
          const p = i as Record<string, unknown>;
          return (str(p.id) || str(p.name)).toLowerCase();
        },
      };
    case "subjects":
      return {
        listKey: "subjects",
        keyOf: (i) => {
          const s = i as Record<string, unknown>;
          return `${str(s.group)}||${str(s.code)}`.toLowerCase();
        },
      };
    case "rooms":
      return {
        listKey: "rooms",
        keyOf: (i) => str((i as Record<string, unknown>).name).toLowerCase(),
      };
    case "routine":
      return {
        listKey: "rows",
        keyOf: (i) => str((i as Record<string, unknown>).date),
      };
    default:
      return null;
  }
}

/**
 * Merge per-page extraction parts into one: concatenate the list in page order,
 * drop later duplicates (first page wins, so earlier pages take precedence), and
 * average the top-level confidence. Items with an empty dedup key are always kept
 * (we can't tell them apart, so we never silently drop them).
 */
export function mergeListParts<T extends { confidence: number }>(
  parts: T[],
  listKey: string,
  keyOf: (item: unknown) => string,
): T {
  if (parts.length === 0) throw new Error("lipi: no parts to merge");

  const merged: unknown[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const list = (part as Record<string, unknown>)[listKey];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const key = keyOf(item);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      merged.push(item);
    }
  }

  const confidence = parts.reduce((sum, p) => sum + p.confidence, 0) / parts.length;
  return { ...(parts[0] as object), [listKey]: merged, confidence } as T;
}
