// Bad Content_Config fixture for build/contentValidation.test.ts: type-correct, but it references
// a missing hook image (Req 4.6), adds an edge to an undefined job (Req 13.2) and blanks a
// Journey_Stage field (Req 19.10). The build must fail and name each file and field.
import type { Content } from "../../src/lib/validators/types.ts";
import { content as valid } from "../content.ts";

export const UNKNOWN_JOB = "rpt_unknown";
export const MISSING_IMAGE = "hook/missing-after.webp";

export const content: Content = {
  ...valid,
  hookImages: {
    ...valid.hookImages,
    hookAfter: { ...valid.hookImages.hookAfter, image: { src: MISSING_IMAGE } },
  },
  dependencyDemo: {
    ...valid.dependencyDemo,
    edges: [...valid.dependencyDemo.edges, { from: valid.dependencyDemo.jobs[0].id, to: UNKNOWN_JOB }],
  },
  journey: [{ label: "Start", approxYear: "2019", detail: "   " }],
};
