// The whole Content_Config as one `Content` value: one key per exported constant in
// /src/data/*.ts (see CONTENT_FILES). The content-validation plugin loads this module through
// Vite's module runner at build time, so content edits never become Vite config dependencies.
import { analysis } from "../src/data/analysis.ts";
import { background } from "../src/data/background.ts";
import { builtWithAi } from "../src/data/builtWithAi.ts";
import { certifications } from "../src/data/certifications.ts";
import { contact } from "../src/data/contact.ts";
import { dependencyDemo } from "../src/data/dependencyDemo.ts";
import { hook, hookImages } from "../src/data/hook.ts";
import { intro } from "../src/data/intro.ts";
import { journey } from "../src/data/journey.ts";
import { liveDemo } from "../src/data/liveDemo.ts";
import { pipeline } from "../src/data/pipeline.ts";
import { projects } from "../src/data/projects.ts";
import { site } from "../src/data/site.ts";
import { skills } from "../src/data/skills.ts";
import { terminal } from "../src/data/terminal.ts";
import { viz } from "../src/data/viz.ts";
import type { Content } from "../src/lib/validators/types.ts";

export const content: Content = {
  site,
  hook,
  hookImages,
  intro,
  pipeline,
  projects,
  dependencyDemo,
  viz,
  liveDemo,
  analysis,
  skills,
  certifications,
  journey,
  builtWithAi,
  contact,
  terminal,
  background,
};
