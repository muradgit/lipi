/**
 * Handwriting hardening (Phase 7). The vision LLM is already the strongest
 * handwriting reader available, so this module MAXIMIZES it rather than building
 * a separate model:
 *
 *   1. a handwriting-tuned prompt suffix (added to the per-kind instruction),
 *   2. a RAISED review-confidence threshold so uncertain handwritten cells always
 *      land in human review (the safety valve — never blind-trust handwriting),
 *   3. a pure multi-crop TILE plan for dense handwritten tables: split the page
 *      into overlapping tiles so each is read at higher effective resolution,
 *      then reconcile the per-tile results with the existing batch merge.
 *
 * Everything here is pure + unit-testable. Executing the tile plan (actually
 * cropping pixels) needs a server-side rasterizer (e.g. sharp); the geometry is
 * provided + tested so that step is a thin wiring change when the lib is added.
 */

/** Uncertain handwriting must reach a human — a stricter bar than typed text (0.85). */
export const HANDWRITING_REVIEW_THRESHOLD = 0.92;

/** Extra instruction appended when the caller marks the document as handwriting. */
export function handwritingPromptSuffix(): string {
  return [
    "This document is HANDWRITTEN. Read each stroke carefully.",
    "Bengali handwriting varies a lot: watch conjuncts (যুক্তবর্ণ), matras, and look-alike digits (১/৭, ২/৩, ০/৬).",
    "Do NOT guess an uncertain character — lower that item's confidence so a human reviews it.",
    "If a whole cell is illegible, return null rather than a plausible-looking invention.",
  ].join(" ");
}

export interface TileRect {
  /** 0-based tile position. */
  row: number;
  col: number;
  /** Pixel bounds (integers), clamped to the image. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TilePlanOptions {
  rows: number;
  cols: number;
  /** Fraction (0..0.5) of each tile that overlaps its neighbours, so a row/word
   *  split across a tile boundary still appears whole in one tile. Default 0.1. */
  overlap?: number;
}

/**
 * Split a `width`×`height` image into `rows`×`cols` overlapping tiles. Overlap is
 * applied outward from each base cell and clamped to the image edges, so tiles
 * cover the whole page and every boundary row appears intact in some tile. The
 * per-tile extractions are then merged (batch de-dup) back into one result.
 */
export function tilePlan(width: number, height: number, opts: TilePlanOptions): TileRect[] {
  const rows = Math.max(1, Math.floor(opts.rows));
  const cols = Math.max(1, Math.floor(opts.cols));
  const overlap = Math.min(0.5, Math.max(0, opts.overlap ?? 0.1));
  const cellW = width / cols;
  const cellH = height / rows;
  const padX = cellW * overlap;
  const padY = cellH * overlap;

  const tiles: TileRect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.max(0, Math.floor(c * cellW - padX));
      const y0 = Math.max(0, Math.floor(r * cellH - padY));
      const x1 = Math.min(width, Math.ceil((c + 1) * cellW + padX));
      const y1 = Math.min(height, Math.ceil((r + 1) * cellH + padY));
      tiles.push({ row: r, col: c, x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    }
  }
  return tiles;
}
