/**
 * Build-time content validators (design: Build-time validators). Each is a pure
 * `(content, fsFacts) => ValidationError[]`; `runValidators` runs them all in a fixed order so the
 * content-validation plugin (task 4.9) can report every error at once.
 */
import { assetsExist, assetsUnique, intrinsicSize } from "./assets";
import { backgroundConfig } from "./backgroundConfig";
import { certMeaning } from "./certMeaning";
import { dependencyEdges } from "./dependencyEdges";
import { hookAspect } from "./hookAspect";
import { journey } from "./journey";
import { seoCopy } from "./seoCopy";
import { pipelineTopics, reflectionTopics } from "./topics";
import type { Content, FsFacts, ValidationError, Validator } from "./types";
import { vizBullets } from "./vizBullets";

export * from "./types";
export * from "./assets";
export * from "./backgroundConfig";
export * from "./certMeaning";
export * from "./dependencyEdges";
export * from "./hookAspect";
export * from "./journey";
export * from "./seoCopy";
export * from "./topics";
export * from "./vizBullets";

/** Every content validator by name, in reporting order. */
export const validators = {
  assetsExist,
  assetsUnique,
  intrinsicSize,
  hookAspect,
  dependencyEdges,
  vizBullets,
  journey,
  pipelineTopics,
  certMeaning,
  seoCopy,
  backgroundConfig,
  reflectionTopics,
} as const satisfies Record<string, Validator>;

export type ValidatorName = keyof typeof validators;

/** Runs every validator and concatenates their errors; an empty array means the content is valid. */
export function runValidators(content: Content, fs: FsFacts): ValidationError[] {
  return Object.values(validators).flatMap((validate: Validator) => validate(content, fs));
}
