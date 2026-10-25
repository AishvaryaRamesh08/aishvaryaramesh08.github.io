/**
 * `vizBullets` (Req 14.9, 14.16): each Viz_Stage has 2–3 "What I changed" bullets of at most 120
 * characters and at least one callout, and stages are numbered 1..n in order. `checkVizBullets` is
 * the bullet rule on its own (Property 29). Every error names the offending stage.
 */
import { CONTENT_FILES, charLength, validationError, type Content, type ValidationError } from "./types";
import type { VizStage } from "../../data/types";

export const VIZ_BULLETS = { min: 2, max: 3, maxChars: 120 } as const;

const file = CONTENT_FILES.viz;

type StageLike = Pick<VizStage, "number" | "name" | "changes">;

/** `stage 3 "Dash"` */
export const stageLabel = (stage: Pick<VizStage, "number" | "name">): string => `stage ${stage.number} "${stage.name}"`;

/** Bullet count within 2–3 and every bullet ≤ 120 characters. */
export function checkVizBullets(stages: readonly StageLike[]): ValidationError[] {
  const errors: ValidationError[] = [];
  stages.forEach((stage, i) => {
    const label = stageLabel(stage);
    const n = stage.changes.length;
    if (n < VIZ_BULLETS.min || n > VIZ_BULLETS.max) {
      errors.push(
        validationError(file, `stages[${i}].changes`, `${label}: ${n} bullets (allowed ${VIZ_BULLETS.min}–${VIZ_BULLETS.max})`),
      );
    }
    stage.changes.forEach((bullet, j) => {
      const len = charLength(bullet);
      if (len > VIZ_BULLETS.maxChars) {
        errors.push(
          validationError(
            file,
            `stages[${i}].changes[${j}]`,
            `${label}: bullet ${j + 1} is ${len} characters (max ${VIZ_BULLETS.maxChars})`,
          ),
        );
      }
    });
  });
  return errors;
}

/** At least one callout per stage and numbering 1..n in Content_Config order. */
export function checkVizStageShape(stages: readonly Pick<VizStage, "number" | "name" | "callouts">[]): ValidationError[] {
  const errors: ValidationError[] = [];
  stages.forEach((stage, i) => {
    const label = stageLabel(stage);
    if (stage.callouts.length === 0) {
      errors.push(validationError(file, `stages[${i}].callouts`, `${label}: needs at least 1 callout`));
    }
    if (stage.number !== i + 1) {
      errors.push(validationError(file, `stages[${i}].number`, `${label}: expected stage number ${i + 1}`));
    }
  });
  return errors;
}

export function vizBullets(content: Pick<Content, "viz">): ValidationError[] {
  const { stages } = content.viz;
  return [...checkVizBullets(stages), ...checkVizStageShape(stages)];
}
