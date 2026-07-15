import { describe, expect, it } from "vitest";
import { tilePlan, handwritingPromptSuffix, HANDWRITING_REVIEW_THRESHOLD } from "./handwriting";

describe("handwriting constants + prompt", () => {
  it("uses a stricter review threshold than typed text (0.85)", () => {
    expect(HANDWRITING_REVIEW_THRESHOLD).toBeGreaterThan(0.85);
  });
  it("prompt suffix tells the model not to guess and to lower confidence", () => {
    const s = handwritingPromptSuffix();
    expect(s).toMatch(/HANDWRITTEN/);
    expect(s.toLowerCase()).toContain("confidence");
    expect(s.toLowerCase()).toContain("null");
  });
});

describe("tilePlan", () => {
  it("covers the whole image with rows×cols tiles", () => {
    const tiles = tilePlan(1000, 800, { rows: 2, cols: 2, overlap: 0 });
    expect(tiles).toHaveLength(4);
    // no overlap → exact quarters
    expect(tiles[0]).toEqual({ row: 0, col: 0, x: 0, y: 0, width: 500, height: 400 });
    expect(tiles[3]).toEqual({ row: 1, col: 1, x: 500, y: 400, width: 500, height: 400 });
  });

  it("expands tiles by the overlap fraction but clamps to the image edges", () => {
    const [tl] = tilePlan(1000, 800, { rows: 2, cols: 2, overlap: 0.1 });
    // top-left tile can't go past 0,0 but extends past its base cell on the inner edges
    expect(tl.x).toBe(0);
    expect(tl.y).toBe(0);
    expect(tl.width).toBeGreaterThan(500); // 500 base + inner overlap
    expect(tl.height).toBeGreaterThan(400);
  });

  it("clamps a bad grid to at least 1×1 and overlap to [0,0.5]", () => {
    const tiles = tilePlan(600, 600, { rows: 0, cols: 0, overlap: 5 });
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toMatchObject({ x: 0, y: 0, width: 600, height: 600 });
  });
});
