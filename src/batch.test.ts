import { describe, expect, it } from "vitest";
import { batchConfigFor, mergeListParts } from "./batch";

describe("batchConfigFor", () => {
  it("returns a rule for list kinds and null for non-list kinds", () => {
    expect(batchConfigFor("people")?.listKey).toBe("people");
    expect(batchConfigFor("subjects")?.listKey).toBe("subjects");
    expect(batchConfigFor("rooms")?.listKey).toBe("rooms");
    expect(batchConfigFor("routine")?.listKey).toBe("rows");
    expect(batchConfigFor("notice")).toBeNull();
    expect(batchConfigFor("all_sections")).toBeNull();
  });
  it("dedups people by id, falling back to name", () => {
    const { keyOf } = batchConfigFor("people")!;
    expect(keyOf({ id: "251001", name: "রহিম" })).toBe("251001");
    expect(keyOf({ id: null, name: "করিম" })).toBe("করিম");
  });
});

describe("mergeListParts", () => {
  const cfg = batchConfigFor("people")!;

  it("concatenates pages in order and drops later duplicates (first wins)", () => {
    const parts = [
      { confidence: 0.9, people: [{ id: "1", name: "A" }, { id: "2", name: "B" }] },
      { confidence: 0.7, people: [{ id: "2", name: "B-dup" }, { id: "3", name: "C" }] },
    ];
    const merged = mergeListParts(parts, cfg.listKey, cfg.keyOf);
    expect(merged.people.map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(merged.people[1].name).toBe("B"); // first page's copy kept
    expect(merged.confidence).toBeCloseTo(0.8); // average
  });

  it("keeps items with an empty dedup key (never silently dropped)", () => {
    const parts = [
      { confidence: 1, people: [{ id: null, name: "" }, { id: null, name: "" }] },
    ];
    const merged = mergeListParts(parts, cfg.listKey, cfg.keyOf);
    expect(merged.people).toHaveLength(2);
  });

  it("throws when there are no parts", () => {
    expect(() => mergeListParts([], "people", () => "")).toThrow(/no parts/);
  });
});
