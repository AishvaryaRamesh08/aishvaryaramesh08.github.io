/**
 * `certMeaning` (Req 18.1, 18.2): exactly three certifications, each with a non-empty
 * "what this means for my work" statement of at most 120 characters.
 */
import { CONTENT_FILES, charLength, hasText, validationError, type Content, type ValidationError } from "./types";

export const CERTIFICATIONS = { count: 3, maxMeaningChars: 120 } as const;

const file = CONTENT_FILES.certifications;

export function certMeaning(content: Pick<Content, "certifications">): ValidationError[] {
  const certs = content.certifications;
  const errors: ValidationError[] = [];
  if (certs.length !== CERTIFICATIONS.count) {
    errors.push(validationError(file, "", `${certs.length} certifications (expected exactly ${CERTIFICATIONS.count})`));
  }
  certs.forEach((cert, i) => {
    const path = `[${i}].meaning`;
    if (!hasText(cert.meaning)) {
      errors.push(validationError(file, path, `"${cert.name}": meaning is empty`));
      return;
    }
    const len = charLength(cert.meaning);
    if (len > CERTIFICATIONS.maxMeaningChars) {
      errors.push(
        validationError(file, path, `"${cert.name}": meaning is ${len} characters (max ${CERTIFICATIONS.maxMeaningChars})`),
      );
    }
  });
  return errors;
}
