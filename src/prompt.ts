/**
 * Prompt assembly for the vision/text LLM — pure string building, no SDK, so it
 * is unit-testable. `llm.ts` combines the returned system + instruction text with
 * the document (image / PDF) content block and the schema-constrained output
 * format. Keeping the vocabulary grounding here (not in the model's head) is what
 * makes the mapping deterministic: the model returns codes we gave it, not codes
 * it guessed.
 */
import type { DocaiVocabulary, DocKind } from "./types";
import { handwritingPromptSuffix } from "./handwriting";

const SYSTEM = [
  "You extract structured data from Bangladeshi educational-institution documents.",
  "The documents are usually in Bengali (বাংলা) and may be phone photos, scans, or office files.",
  "Read carefully and faithfully. Preserve Bengali text exactly as written.",
  "When a controlled vocabulary is provided, map what you read to the CANONICAL value from that vocabulary (e.g. a subject code); never invent codes.",
  "If a value is illegible or absent, use null rather than guessing.",
  "Return per-item confidence scores (0..1) honestly — low scores flag items for human review.",
  "Respond ONLY with data matching the provided schema.",
].join(" ");

/** The system prompt (stable across calls, so it caches well). */
export function systemPrompt(): string {
  return SYSTEM;
}

function vocabularyBlock(vocab: DocaiVocabulary): string {
  const parts: string[] = [];
  if (vocab.subjects?.length) {
    const lines = vocab.subjects
      .map((s) => `  ${s.code} = ${s.bn}${s.en ? ` / ${s.en}` : ""}`)
      .join("\n");
    parts.push(
      `Known subjects (map each read subject to one of these codes; use null if none match):\n${lines}`,
    );
  }
  if (vocab.designations?.length) {
    parts.push(`Allowed designations: ${vocab.designations.join(", ")}`);
  }
  if (vocab.groups?.length) {
    parts.push(`Allowed group names: ${vocab.groups.join(", ")}`);
  }
  return parts.join("\n\n");
}

const KIND_INSTRUCTION: Record<DocKind, string> = {
  routine:
    "This is an exam routine (পরীক্ষার রুটিন). Extract one row per exam date: the date (as ISO YYYY-MM-DD), the subject(s) that day (map each to a known subject code, keep the raw Bengali name), and the start/end time in 24-hour HH:MM. Ignore headers, signatures, and disclaimer notes.",
  people:
    "This is a list of people — students, teachers, or staff. First decide which role the list is (set `role`). Extract one row per person: the roll number (students) or staff/employee id in `id`; the full Bengali name exactly as written in `name`; an English/romanized name in `nameEn` if the document shows one; gender if determinable. For students set `group` (map it to a known group name if a vocabulary is given). For teachers/staff set `designation` (map it to a known designation if a vocabulary is given). Include mobile/email only if present. Ignore serial-number columns and totals rows.",
  rooms:
    "This is a list of exam rooms/halls (কক্ষ). Extract one row per room: name/number, location if shown, and either a single total `capacity` (আসন সংখ্যা) or, when the room is split into named seat blocks/columns, a `columns` list of { name, seats }.",
  notice:
    "This is a notice (নোটিশ). Extract the title/subject, the full body text (preserve Bengali exactly), the notice date (as ISO YYYY-MM-DD), and any signatory name/designation at the foot.",
  subjects:
    "This is a subject list (বিষয় ও কোড). Extract one row per subject: the Bengali name, the subject code, the paper (na / first / second — first=১ম পত্র, second=২য় পত্র), and the component full marks when shown — cqMax (রচনামূলক/সৃজনশীল), mcqMax (নৈর্ব্যক্তিক/MCQ), pracMax (ব্যবহারিক). Map each subject to a known group name when a vocabulary is given. Use null for any mark not shown.",
  all_sections:
    "This document may contain several exam-setup sections. Extract every section it actually contains and leave the rest empty/null: `institution` (name, EIIN, board code, address, mobile, email, website); `klass` (class name, session, and its groups with Bengali + English names); `subjects` (as in the subject-list rules); `rooms` (as in the room-list rules); and people split into `students`, `teachers`, and `staff` (as in the people-list rules — roll/id, Bengali name, group/designation). Preserve Bengali exactly and map to known groups/designations/subject codes where a vocabulary is given.",
};

/** The per-document instruction, including the caller's vocabulary grounding. */
export function instruction(
  kind: DocKind,
  vocab: DocaiVocabulary,
  opts: { handwriting?: boolean } = {},
): string {
  const vb = vocabularyBlock(vocab);
  const hw = opts.handwriting ? handwritingPromptSuffix() : "";
  return [KIND_INSTRUCTION[kind], vb, hw].filter(Boolean).join("\n\n");
}
