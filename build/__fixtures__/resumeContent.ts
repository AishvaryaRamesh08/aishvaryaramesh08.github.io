// Valid Content_Config fixture with the resume PDF supplied, for build/contentValidation.test.ts.
import type { Content } from "../../src/lib/validators/types.ts";
import { content as valid } from "../content.ts";

export const RESUME_PDF = "resume/cv.pdf";

export const content: Content = {
  ...valid,
  contact: { ...valid.contact, links: { ...valid.contact.links, resumePdf: RESUME_PDF } },
};
