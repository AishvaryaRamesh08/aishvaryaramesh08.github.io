/**
 * `journey` (Req 19.10): the Journey_Stage array is non-empty and every `label`, `approxYear` and
 * `detail` contains a non-whitespace character. Each error identifies the empty array, or the
 * offending index and field.
 */
import { CONTENT_FILES, hasText, validationError, type Content, type ValidationError } from "./types";
import type { JourneyStage } from "../../data/types";

export const JOURNEY_FIELDS = ["label", "approxYear", "detail"] as const satisfies readonly (keyof JourneyStage)[];

const file = CONTENT_FILES.journey;

export function checkJourney(stages: readonly JourneyStage[]): ValidationError[] {
  if (stages.length === 0) {
    return [validationError(file, "", "the Journey_Stage array is empty; add at least one entry")];
  }
  const errors: ValidationError[] = [];
  stages.forEach((stage, i) => {
    for (const field of JOURNEY_FIELDS) {
      if (!hasText(stage[field])) {
        errors.push(validationError(file, `[${i}].${field}`, `Journey_Stage ${i}: ${field} is empty`));
      }
    }
  });
  return errors;
}

export function journey(content: Pick<Content, "journey">): ValidationError[] {
  return checkJourney(content.journey);
}
