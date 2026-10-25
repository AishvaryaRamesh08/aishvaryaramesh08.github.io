// @vitest-environment node
// Content-validation plugin (task 4.9): fs facts collection, and real `vite build` runs against
// fixture roots proving that bad content fails the build with file/field messages (Req 4.6, 13.2,
// 19.10) and that `__RESUME_AVAILABLE__` follows resume presence without failing the build (Req 9.10).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { build, type Rolldown } from "vite";
import { afterAll, describe, expect, it } from "vitest";
import { MISSING_IMAGE, UNKNOWN_JOB } from "./__fixtures__/invalidContent.ts";
import { RESUME_PDF } from "./__fixtures__/resumeContent.ts";
import { formatValidationError } from "../src/lib/validators/index.ts";
import { collectFsFacts, contentValidationPlugin, formatValidationReport } from "./contentValidation.ts";

const fixtures = resolve(import.meta.dirname, "__fixtures__");
const tempRoot = mkdtempSync(join(tmpdir(), "portfolio-content-validation-"));
const BUILD_TIMEOUT_MS = 60_000;

afterAll(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

/** A valid solid-color RGB PNG of the given size. */
function png(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const rows = Buffer.alloc((width * 3 + 1) * height); // filter byte 0 + black pixels
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

let rootCount = 0;
/** A temp project root with the given files, plus index.html → main.js reading __RESUME_AVAILABLE__. */
function fixtureRoot(files: Record<string, string | Buffer>): string {
  const root = join(tempRoot, `root-${rootCount++}`);
  const all: Record<string, string | Buffer> = {
    "index.html": '<!doctype html><html lang="en"><body><script type="module" src="/main.js"></script></body></html>',
    "main.js": 'console.log(__RESUME_AVAILABLE__ ? "resume-yes" : "resume-no");',
    ...files,
  };
  for (const [path, data] of Object.entries(all)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, data);
  }
  return root;
}

/** Runs a real client (or SSR) build of `root` with only the content-validation plugin; returns the JS. */
async function fixtureBuild(root: string, contentModule: string, ssr = false): Promise<string> {
  const output = (await build({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [contentValidationPlugin({ root, contentModule })],
    build: { write: false, ...(ssr ? { ssr: "main.js" } : {}) },
  })) as Rolldown.RolldownOutput;
  return output.output
    .filter((item): item is Rolldown.OutputChunk => item.type === "chunk")
    .map((chunk) => chunk.code)
    .join("\n");
}

const ogImage = { "public/og-image.png": png(1200, 630) };

describe("collectFsFacts", () => {
  it("lists files under src/assets and public with sizes, skipping dotfiles", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"></svg>';
    const root = fixtureRoot({
      ...ogImage,
      "public/.gitkeep": "",
      "public/resume/cv.pdf": "%PDF-1.4",
      "src/assets/diagrams/flow.svg": svg,
      "src/assets/.DS_Store": "",
    });
    const fs = await collectFsFacts(root);
    expect([...fs.assets.keys()]).toEqual(["diagrams/flow.svg"]);
    expect(fs.assets.get("diagrams/flow.svg")).toEqual({ bytes: svg.length, width: 400, height: 300 });
    expect([...fs.publicFiles.keys()].sort()).toEqual(["og-image.png", "resume/cv.pdf"]);
    expect(fs.publicFiles.get("og-image.png")).toMatchObject({ width: 1200, height: 630 });
    expect(fs.publicFiles.get("resume/cv.pdf")).toEqual({ bytes: 8 });
  });

  it("returns empty maps when the directories do not exist", async () => {
    const fs = await collectFsFacts(join(tempRoot, "does-not-exist"));
    expect(fs.assets.size).toBe(0);
    expect(fs.publicFiles.size).toBe(0);
  });
});

describe("formatValidationReport", () => {
  it("prints a count header and one file › field line per error", () => {
    const report = formatValidationReport([
      { file: "journey.ts", path: "[2].detail", message: "Journey_Stage 2: detail is empty" },
      { file: "pipeline.ts", path: "", message: 'no stage mentions "referential integrity"' },
    ], formatValidationError);
    expect(report).toBe(
      [
        "Content_Config validation failed with 2 errors:",
        "  - src/data/journey.ts › [2].detail: Journey_Stage 2: detail is empty",
        '  - src/data/pipeline.ts: no stage mentions "referential integrity"',
      ].join("\n"),
    );
  });
});

describe("content-validation plugin in vite build", () => {
  it(
    "fails the client build for bad content, naming each file and field",
    async () => {
      const root = fixtureRoot(ogImage);
      const failure = await fixtureBuild(root, join(fixtures, "invalidContent.ts")).then(
        () => undefined,
        (error: unknown) => (error instanceof Error ? error.message : String(error)),
      );
      expect(failure).toBeDefined();
      expect(failure).toContain("Content_Config validation failed with 3 errors:");
      expect(failure).toContain(`src/data/hook.ts › hookAfter.image.src: file "${MISSING_IMAGE}" not found`);
      expect(failure).toMatch(new RegExp(`src/data/dependencyDemo\\.ts › edges\\[\\d+\\]: .*unknown job "${UNKNOWN_JOB}"`));
      expect(failure).toContain("src/data/journey.ts › [0].detail: Journey_Stage 0: detail is empty");
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "fails when a referenced public file is missing (the Open Graph image)",
    async () => {
      const root = fixtureRoot({});
      await expect(fixtureBuild(root, resolve(import.meta.dirname, "content.ts"))).rejects.toThrow(
        'src/data/site.ts › ogImage.src: file "public/og-image.png" not found',
      );
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "passes the real Content_Config and defines __RESUME_AVAILABLE__ = false while the resume is a placeholder",
    async () => {
      const root = fixtureRoot(ogImage);
      const code = await fixtureBuild(root, resolve(import.meta.dirname, "content.ts"));
      expect(code).toContain("resume-no");
      expect(code).not.toContain("resume-yes");
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "defines __RESUME_AVAILABLE__ = true only when the configured PDF exists under public/",
    async () => {
      const module = join(fixtures, "resumeContent.ts");
      const withPdf = await fixtureBuild(fixtureRoot({ ...ogImage, [`public/${RESUME_PDF}`]: "%PDF-1.4" }), module);
      expect(withPdf).toContain("resume-yes");
      expect(withPdf).not.toContain("resume-no");
      // Configured but missing: not an error, the CTA falls back to the placeholder (Req 9.10).
      const withoutPdf = await fixtureBuild(fixtureRoot(ogImage), module);
      expect(withoutPdf).toContain("resume-no");
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    "skips the validators in the SSR build (the client build already ran them)",
    async () => {
      const root = fixtureRoot({});
      const code = await fixtureBuild(root, join(fixtures, "invalidContent.ts"), true);
      expect(code).toContain("resume-no");
    },
    BUILD_TIMEOUT_MS,
  );
});
