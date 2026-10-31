/**
 * The Journey_Stage array is non-empty and all required fields contain usable text.
 */
import { CONTENT_FILES, hasText, validationError, type Content, type ValidationError } from "./types";
import type { JourneyStage } from "../../data/types";

export const JOURNEY_FIELDS = ["label", "organization", "role", "years"] as const satisfies readonly (keyof JourneyStage)[];

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
    if (stage.detail.length < 2 || stage.detail.length > 4) {
      errors.push(validationError(file, `[${i}].detail`, `Journey_Stage ${i}: detail must contain 2 to 4 lines`));
    }
    stage.detail.forEach((line, detailIndex) => {
      if (!hasText(line)) {
        errors.push(validationError(file, `[${i}].detail[${detailIndex}]`, `Journey_Stage ${i}: detail line is empty`));
      }
    });
  });
  return errors;
}

export function journey(content: Pick<Content, "journey">): ValidationError[] {
  return checkJourney(content.journey);
}
