// @vitest-environment node
// Content integrity (task 4.10): the real Content_Config passes every build-time validator against
// facts read from the real file system (src/assets/ and public/). Self-contained: it collects its
// own FsFacts rather than using the content-validation plugin. Pure content checks live in
// src/data/content.test.ts.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { imageSize } from "image-size";
import { describe, expect, it } from "vitest";
import { analysis } from "../src/data/analysis";
import { background } from "../src/data/background";
import { builtWithAi } from "../src/data/builtWithAi";
import { certifications } from "../src/data/certifications";
import { contact } from "../src/data/contact";
import { dependencyDemo } from "../src/data/dependencyDemo";
import { hook, hookImages } from "../src/data/hook";
import { intro } from "../src/data/intro";
import { journey } from "../src/data/journey";
import { liveDemo } from "../src/data/liveDemo";
import { pipeline } from "../src/data/pipeline";
import { projects } from "../src/data/projects";
import { site } from "../src/data/site";
import { skills } from "../src/data/skills";
import { story } from "../src/data/story";
import { terminal } from "../src/data/terminal";
import { viz } from "../src/data/viz";
import { formatValidationError, runValidators, type Content, type FileFacts, type FsFacts } from "../src/lib/validators";

const content: Content = {
  site,
  hook,
  hookImages,
  intro,
  story,
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

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

/** Existence, byte size and (for images) intrinsic size of every file under `dir`, keyed by POSIX path. */
function collectFacts(dir: string): Map<string, FileFacts> {
  const facts = new Map<string, FileFacts>();
  for (const file of listFiles(dir)) {
    const fact: FileFacts = { bytes: statSync(file).size };
    try {
      const { width, height } = imageSize(readFileSync(file));
      Object.assign(fact, { width, height });
    } catch {
      // Not an image (or unreadable header): existence and size only.
    }
    facts.set(relative(dir, file).split(sep).join("/"), fact);
  }
  return facts;
}

const fsFacts: FsFacts = {
  assets: collectFacts(resolve("src/assets")),
  publicFiles: collectFacts(resolve("public")),
};

describe("Content_Config integrity against the file system", () => {
  // public/og-image.png is added as a labelled placeholder in task 24.1. Until then the only
  // allowed error is that missing file; once it exists, the config must pass with no errors.
  const ogPending = !fsFacts.publicFiles.has(site.ogImage.src);

  it("passes every build-time validator", () => {
    const errors = runValidators(content, fsFacts).map(formatValidationError);
    const expected = ogPending ? [`site.ts › ogImage.src: file "public/${site.ogImage.src}" not found`] : [];
    expect(errors).toEqual(expected);
  });
});
