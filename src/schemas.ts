/**
 * Target extraction schemas per document kind — pure Zod, no SDK import, so
 * they're testable and safe to import anywhere. `llm.ts` wraps the chosen schema
 * with the Anthropic SDK's `zodOutputFormat` to constrain the model's output;
 * the same schema re-validates the response before the caller ever sees it.
 *
 * Phase 1 ships `routine`; Phase 2 adds `people`. Other DocKinds land in later
 * phases and register here the same way.
 */
import { z } from "zod";
import type { DocKind } from "./types";

/** One subject cell in a routine row: the canonical code (if matched) + what was read. */
export const routineSubjectSchema = z.object({
  /** Canonical subject code from the caller's vocabulary, or null when unmatched. */
  code: z.string().nullable(),
  /** The subject text exactly as read from the document (for human review). */
  nameRaw: z.string(),
});

/** One exam day in a routine. Times are 24-hour "HH:MM" or null when absent/illegible. */
export const routineRowSchema = z.object({
  /** Exam date in ISO "YYYY-MM-DD". */
  date: z.string(),
  subjects: z.array(routineSubjectSchema),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  /** Shift/session label if the routine has one (e.g. "সকাল"), else null. */
  shift: z.string().nullable(),
  /** Model's confidence for this row, 0..1. */
  confidence: z.number(),
});

export const routineExtractionSchema = z.object({
  rows: z.array(routineRowSchema),
  /** Overall confidence for the whole extraction, 0..1. */
  confidence: z.number(),
});

export type RoutineExtraction = z.infer<typeof routineExtractionSchema>;

/**
 * One person read from a list (students / teachers / staff). A single shape
 * covers all three roles — the caller's adapter keeps only the fields that role
 * needs. Unread/absent fields are null, never guessed.
 */
export const personSchema = z.object({
  /** Roll number (student) or staff/employee id, exactly as written, else null. */
  id: z.string().nullable(),
  /** Full name in Bengali, exactly as written. */
  name: z.string(),
  /** English/romanized name if the document also shows one, else null. */
  nameEn: z.string().nullable(),
  /** Gender if determinable from the document, else null. */
  gender: z.enum(["male", "female"]).nullable(),
  /** Student group, mapped to a known group name from the vocabulary, else null. */
  group: z.string().nullable(),
  /** Teacher/staff designation, mapped to a known designation, else null. */
  designation: z.string().nullable(),
  /** Mobile number if present, else null. */
  mobile: z.string().nullable(),
  /** Email if present, else null. */
  email: z.string().nullable(),
  /** Model's confidence for this person, 0..1. */
  confidence: z.number(),
});

export const peopleExtractionSchema = z.object({
  /** Which kind of people this document lists, if determinable, else null. */
  role: z.enum(["student", "teacher", "staff"]).nullable(),
  people: z.array(personSchema),
  /** Overall confidence for the whole extraction, 0..1. */
  confidence: z.number(),
});

export type PeopleExtraction = z.infer<typeof peopleExtractionSchema>;

/** One subject row. Marks are null when the document doesn't show them. */
export const subjectRowSchema = z.object({
  /** Group this subject belongs to, mapped to a known group name, else null. */
  group: z.string().nullable(),
  /** Subject name in Bengali, exactly as written. */
  name: z.string(),
  /** Subject code, or empty string if absent. */
  code: z.string(),
  /** Paper for multi-paper subjects. */
  paper: z.enum(["na", "first", "second"]).nullable(),
  /** Creative/written (রচনামূলক) full marks, else null. */
  cqMax: z.number().nullable(),
  /** MCQ (নৈর্ব্যক্তিক) full marks, else null. */
  mcqMax: z.number().nullable(),
  /** Practical (ব্যবহারিক) full marks, else null. */
  pracMax: z.number().nullable(),
  confidence: z.number(),
});

export const subjectsExtractionSchema = z.object({
  subjects: z.array(subjectRowSchema),
  confidence: z.number(),
});
export type SubjectsExtraction = z.infer<typeof subjectsExtractionSchema>;

/** One exam room/hall. `columns` (named seat blocks) when shown, else use capacity. */
export const roomRowSchema = z.object({
  name: z.string(),
  location: z.string().nullable(),
  /** Total seat capacity if given as a single number, else null. */
  capacity: z.number().nullable(),
  /** Named seat columns/blocks with their seat counts, else null. */
  columns: z.array(z.object({ name: z.string(), seats: z.number() })).nullable(),
  confidence: z.number(),
});

export const roomsExtractionSchema = z.object({
  rooms: z.array(roomRowSchema),
  confidence: z.number(),
});
export type RoomsExtraction = z.infer<typeof roomsExtractionSchema>;

export const noticeExtractionSchema = z.object({
  /** Notice heading/subject. */
  title: z.string(),
  /** Full notice body text, preserving Bengali exactly. */
  body: z.string(),
  /** Notice date in ISO "YYYY-MM-DD", else null. */
  date: z.string().nullable(),
  /** Signatory name/designation at the foot of the notice, else null. */
  signatory: z.string().nullable(),
  confidence: z.number(),
});
export type NoticeExtraction = z.infer<typeof noticeExtractionSchema>;

/** Institution header fields (matches the setup/institution form). */
export const institutionRowSchema = z.object({
  name: z.string(),
  eiin: z.string().nullable(),
  boardCode: z.string().nullable(),
  address: z.string().nullable(),
  mobile: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
});

/** Class header + its groups (matches the setup/class form). */
export const classRowSchema = z.object({
  name: z.string(),
  session: z.string().nullable(),
  groups: z.array(z.object({ name: z.string(), nameEn: z.string().nullable() })),
});

/**
 * The all-in-one importer: one document that may contain several setup sections.
 * Each section is optional (null / empty) — the model fills only what the
 * document actually contains. People are split by role so the adapter maps each
 * to its own review shape.
 */
export const allSectionsExtractionSchema = z.object({
  institution: institutionRowSchema.nullable(),
  klass: classRowSchema.nullable(),
  subjects: z.array(subjectRowSchema),
  rooms: z.array(roomRowSchema),
  students: z.array(personSchema),
  teachers: z.array(personSchema),
  staff: z.array(personSchema),
  confidence: z.number(),
});
export type AllSectionsExtraction = z.infer<typeof allSectionsExtractionSchema>;

/** Registry of implemented schemas. Unimplemented kinds are absent (added per phase). */
const SCHEMAS: Partial<Record<DocKind, z.ZodType>> = {
  routine: routineExtractionSchema,
  people: peopleExtractionSchema,
  subjects: subjectsExtractionSchema,
  rooms: roomsExtractionSchema,
  notice: noticeExtractionSchema,
  all_sections: allSectionsExtractionSchema,
};

/** The Zod schema for a document kind, or throws if that kind isn't implemented yet. */
export function schemaFor(kind: DocKind): z.ZodType {
  const s = SCHEMAS[kind];
  if (!s) throw new Error(`lipi: no extraction schema for kind "${kind}" yet`);
  return s;
}

export function isKindSupported(kind: DocKind): boolean {
  return kind in SCHEMAS;
}
