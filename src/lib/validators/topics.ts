/**
 * Topic-coverage validators: `pipelineTopics` (Req 11.4) and `reflectionTopics` (Req 20.5).
 * Each topic is a case-insensitive keyword set; a topic is covered when any text matches any of
 * its patterns. Placeholder texts cover nothing.
 */
import { isPlaceholder } from "../../data/types";
import { CONTENT_FILES, validationError, type Content, type ValidationError } from "./types";

export interface Topic {
  name: string;
  patterns: readonly RegExp[];
}

/** Req 11.4: each of the six topics is named in at least one stage explanation. */
export const PIPELINE_TOPICS: readonly Topic[] = [
  { name: "deduplication", patterns: [/\bde-?duplicat/i, /\bdedup/i] },
  { name: "PII handling", patterns: [/\bPII\b/i, /personally identifiable/i] },
  { name: "incremental refresh", patterns: [/\bincremental (refresh|load)/i] },
  { name: "validation", patterns: [/\bvalidat(ion|e|es|ed|ing)\b/i] },
  { name: "referential integrity", patterns: [/\breferential integrity\b/i] },
  { name: "governance", patterns: [/\bgovernance\b/i] },
];

/** Req 20.5: the reflection names each topic at least once across both parts. */
export const REFLECTION_TOPICS: readonly Topic[] = [
  { name: "debugging", patterns: [/\bdebug/i] },
  { name: "accessibility checks", patterns: [/\baccessibility\b/i, /\ba11y\b/i] },
  { name: "performance tuning", patterns: [/\bperformance\b/i] },
  {
    name: "keeping design consistent",
    patterns: [/\bdesign\b[^.]*\bconsisten(t|cy)\b/i, /\bconsisten(t|cy)\b[^.]*\bdesign\b/i],
  },
];

/** Topics that no text matches, in declaration order. */
export function missingTopics(texts: readonly string[], topics: readonly Topic[]): Topic[] {
  return topics.filter((topic) => !texts.some((text) => topic.patterns.some((p) => p.test(text))));
}

export function pipelineTopics(content: Pick<Content, "pipeline">): ValidationError[] {
  const texts = content.pipeline.stages.flatMap((s) => (isPlaceholder(s.explanation) ? [] : [s.explanation]));
  return missingTopics(texts, PIPELINE_TOPICS).map((t) =>
    validationError(CONTENT_FILES.pipeline, "", `no stage mentions "${t.name}"`),
  );
}

export function reflectionTopics(content: Pick<Content, "builtWithAi">): ValidationError[] {
  const { didWell, steppedIn } = content.builtWithAi.reflection;
  return missingTopics([...didWell, ...steppedIn], REFLECTION_TOPICS).map((t) =>
    validationError(CONTENT_FILES.builtWithAi, "reflection", `no entry mentions "${t.name}"`),
  );
}
