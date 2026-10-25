/**
 * `seoCopy` (Req 29.1): the page title is 1–60 characters and contains the Owner's name; the meta
 * description is 50–160 characters. Lengths count code points.
 */
import { CONTENT_FILES, charLength, hasText, validationError, type Content, type ValidationError } from "./types";

export const SEO_LIMITS = {
  title: { min: 1, max: 60 },
  description: { min: 50, max: 160 },
} as const;

const file = CONTENT_FILES.site;

export function seoCopy(content: Pick<Content, "site">): ValidationError[] {
  const { pageTitle, metaDescription, ownerName } = content.site;
  const errors: ValidationError[] = [];

  const titleLen = charLength(pageTitle);
  const { title, description } = SEO_LIMITS;
  if (!hasText(pageTitle) || titleLen < title.min || titleLen > title.max) {
    errors.push(validationError(file, "pageTitle", `${titleLen} characters (allowed ${title.min}–${title.max})`));
  }
  if (!hasText(ownerName)) {
    errors.push(validationError(file, "ownerName", "is empty"));
  } else if (!pageTitle.includes(ownerName)) {
    errors.push(validationError(file, "pageTitle", `does not contain the owner name "${ownerName}"`));
  }

  const descLen = charLength(metaDescription);
  if (descLen < description.min || descLen > description.max) {
    errors.push(
      validationError(file, "metaDescription", `${descLen} characters (allowed ${description.min}–${description.max})`),
    );
  }
  return errors;
}
