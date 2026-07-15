import { describe, expect, it } from "vitest";
import { detectEngine, isEngineReady, isImageMime } from "./route";
import { instruction, systemPrompt } from "./prompt";
import {
  routineExtractionSchema,
  peopleExtractionSchema,
  schemaFor,
  isKindSupported,
} from "./schemas";
import { summarizeConfidence } from "./confidence";

describe("route.detectEngine", () => {
  it("routes images and PDF to the vision tier", () => {
    expect(detectEngine("image/jpeg")).toBe("vision-llm");
    expect(detectEngine("image/PNG")).toBe("vision-llm"); // case-insensitive
    expect(detectEngine("application/pdf")).toBe("vision-llm");
  });
  it("routes spreadsheets to the deterministic structured tier", () => {
    expect(detectEngine("text/csv")).toBe("structured");
    expect(
      detectEngine("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ).toBe("structured");
  });
  it("routes docx to the text tier", () => {
    expect(
      detectEngine("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe("text-llm");
  });
  it("defaults unknown types to vision", () => {
    expect(detectEngine("application/octet-stream")).toBe("vision-llm");
  });
  it("marks only vision + structured ready in Phase 1", () => {
    expect(isEngineReady("vision-llm")).toBe(true);
    expect(isEngineReady("structured")).toBe(true);
    expect(isEngineReady("text-llm")).toBe(false);
    expect(isEngineReady("self-hosted-ocr")).toBe(false);
  });
  it("isImageMime recognizes common image types", () => {
    expect(isImageMime("image/webp")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
  });
});

describe("prompt", () => {
  it("has a stable, non-empty system prompt", () => {
    expect(systemPrompt().length).toBeGreaterThan(50);
  });
  it("grounds the instruction with the subject vocabulary", () => {
    const text = instruction("routine", {
      subjects: [{ code: "101", bn: "বাংলা", en: "Bangla" }],
    });
    expect(text).toContain("101");
    expect(text).toContain("বাংলা");
    expect(text).toContain("YYYY-MM-DD"); // routine-specific guidance present
  });
  it("omits vocabulary blocks that weren't supplied", () => {
    const text = instruction("routine", {});
    expect(text).not.toContain("Allowed designations");
    expect(text).not.toContain("Known subjects");
  });
  it("appends the handwriting suffix only when the flag is set", () => {
    expect(instruction("routine", {}, { handwriting: true })).toMatch(/HANDWRITTEN/);
    expect(instruction("routine", {})).not.toMatch(/HANDWRITTEN/);
  });
  it("grounds the people instruction with groups and designations", () => {
    const students = instruction("people", { groups: ["বিজ্ঞান", "মানবিক"] });
    expect(students).toContain("বিজ্ঞান");
    expect(students).toContain("role"); // people-specific guidance present
    const staff = instruction("people", { designations: ["সহকারী শিক্ষক (Assistant Teacher)"] });
    expect(staff).toContain("Allowed designations");
    expect(staff).toContain("সহকারী শিক্ষক");
  });
});

describe("schemas", () => {
  it("exposes every implemented schema and reports support", () => {
    for (const k of ["routine", "people", "subjects", "rooms", "notice", "all_sections"] as const) {
      expect(isKindSupported(k)).toBe(true);
    }
    expect(schemaFor("routine")).toBe(routineExtractionSchema);
    expect(schemaFor("people")).toBe(peopleExtractionSchema);
  });
  it("validates a well-formed people extraction", () => {
    const ok = peopleExtractionSchema.safeParse({
      role: "student",
      confidence: 0.94,
      people: [
        {
          id: "251001",
          name: "মোঃ রহিম উদ্দিন",
          nameEn: null,
          gender: "male",
          group: "বিজ্ঞান",
          designation: null,
          mobile: null,
          email: null,
          confidence: 0.97,
        },
      ],
    });
    expect(ok.success).toBe(true);
  });
  it("validates a well-formed routine extraction", () => {
    const ok = routineExtractionSchema.safeParse({
      confidence: 0.97,
      rows: [
        {
          date: "2026-06-25",
          subjects: [{ code: "101", nameRaw: "বাংলা" }],
          startTime: "09:30",
          endTime: "12:30",
          shift: null,
          confidence: 0.99,
        },
      ],
    });
    expect(ok.success).toBe(true);
  });
  it("rejects a malformed row", () => {
    const bad = routineExtractionSchema.safeParse({ confidence: 1, rows: [{ date: 5 }] });
    expect(bad.success).toBe(false);
  });
});

describe("summarizeConfidence", () => {
  it("uses the top-level confidence and flags below-threshold rows", () => {
    const { confidence, fields } = summarizeConfidence(
      {
        confidence: 0.9,
        rows: [
          { confidence: 0.99 },
          { confidence: 0.4 },
          { confidence: 0.7 },
        ],
      },
      0.85,
    );
    expect(confidence).toBe(0.9);
    expect(fields).toEqual([
      { path: "rows[1]", confidence: 0.4 },
      { path: "rows[2]", confidence: 0.7 },
    ]);
  });
  it("averages item confidences when no top-level score is present", () => {
    const { confidence, fields } = summarizeConfidence(
      { rows: [{ confidence: 1 }, { confidence: 0.5 }] },
      0.6,
    );
    expect(confidence).toBeCloseTo(0.75);
    expect(fields).toEqual([{ path: "rows[1]", confidence: 0.5 }]);
  });
  it("defaults to full confidence for shapes with no scores", () => {
    expect(summarizeConfidence({ title: "notice" }, 0.85)).toEqual({ confidence: 1, fields: [] });
  });
});
