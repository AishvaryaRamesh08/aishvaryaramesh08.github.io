// Unit tests for the pure content validators (task 4.3). Property tests come in tasks 4.4–4.8.
import { describe, expect, it } from "vitest";
import { analysis } from "../../data/analysis";
import { background } from "../../data/background";
import { builtWithAi } from "../../data/builtWithAi";
import { certifications } from "../../data/certifications";
import { contact } from "../../data/contact";
import { dependencyDemo } from "../../data/dependencyDemo";
import { hook, hookImages } from "../../data/hook";
import { intro } from "../../data/intro";
import { journey as journeyData } from "../../data/journey";
import { liveDemo } from "../../data/liveDemo";
import { pipeline } from "../../data/pipeline";
import { projects } from "../../data/projects";
import { site } from "../../data/site";
import { skills } from "../../data/skills";
import { terminal } from "../../data/terminal";
import { viz } from "../../data/viz";
import type { ImageAsset, VizStage } from "../../data/types";
import {
  assetsExist,
  assetsUnique,
  backgroundConfig,
  certMeaning,
  checkAssetsUnique,
  dependencyEdges,
  formatValidationError,
  hookAspect,
  intrinsicSize,
  isResumeAvailable,
  journey,
  pipelineTopics,
  reflectionTopics,
  runValidators,
  seoCopy,
  validators,
  vizBullets,
  type Content,
  type FileFacts,
  type FsFacts,
} from "./index";

const content: Content = {
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
  journey: journeyData,
  builtWithAi,
  contact,
  terminal,
  background,
};

const fsWith = (assets: Record<string, FileFacts> = {}, publicFiles: Record<string, FileFacts> = {}): FsFacts => ({
  assets: new Map(Object.entries(assets)),
  publicFiles: new Map(Object.entries({ "og-image.png": { width: 1200, height: 630, bytes: 120_000 }, ...publicFiles })),
});

const fmt = (errors: ReturnType<typeof runValidators>) => errors.map(formatValidationError);

describe("content validators", () => {
  it("exposes all twelve validators", () => {
    expect(Object.keys(validators)).toHaveLength(12);
  });

  it("accepts the real Content_Config", () => {
    expect(fmt(runValidators(content, fsWith()))).toEqual([]);
  });

  describe("assets", () => {
    const logo: ImageAsset = { src: "logos/gcp.svg", width: 96, height: 96, alt: "Google Cloud" };
    const withLogo = { ...content, certifications: [{ ...certifications[0], badgeImage: logo }, ...certifications.slice(1)] };

    it("names a missing referenced file and a missing OG image", () => {
      const fs: FsFacts = { assets: new Map(), publicFiles: new Map() };
      expect(fmt(assetsExist(withLogo, fs))).toEqual([
        'certifications.ts › [0].badgeImage.src: file "logos/gcp.svg" not found',
        'site.ts › ogImage.src: file "public/og-image.png" not found',
      ]);
    });

    it("reports a file referenced by two entries", () => {
      const twice = { ...withLogo, certifications: [withLogo.certifications[0], { ...certifications[1], badgeImage: logo }, certifications[2]] };
      expect(fmt(assetsUnique(twice))).toEqual([
        'certifications.ts › [1].badgeImage.src: file "logos/gcp.svg" duplicates certifications.ts › [0].badgeImage.src; reuse that entry instead',
      ]);
      expect(checkAssetsUnique([{ file: "a.ts", path: "x", src: "/src/assets/a.svg" }, { file: "b.ts", path: "y", src: "a.svg" }])).toHaveLength(1);
    });

    it("checks declared aspect ratios and the OG image size", () => {
      const fs = fsWith({ "logos/gcp.svg": { width: 120, height: 90 } }, { "og-image.png": { width: 1200, height: 600, bytes: 2_000_000 } });
      expect(fmt(intrinsicSize(withLogo, fs))).toEqual([
        "certifications.ts › [0].badgeImage.src: declared 96×96 (1:1), file is 120×90 (4:3); aspect ratios differ",
        'site.ts › ogImage.src: "public/og-image.png" is 1200×600; it must be exactly 1200×630',
        'site.ts › ogImage.src: "public/og-image.png" is 2000000 bytes; the limit is 1000000 bytes',
      ]);
      expect(intrinsicSize(withLogo, fsWith({ "logos/gcp.svg": { width: 192, height: 192 } }))).toEqual([]);
    });

    it("treats a missing resume as unavailable, not as an error", () => {
      expect(isResumeAvailable(content, fsWith())).toBe(false);
      const supplied = { contact: { ...contact, links: { ...contact.links, resumePdf: "resume/cv.pdf" as const } } };
      expect(isResumeAvailable(supplied, fsWith({}, { "resume/cv.pdf": {} }))).toBe(true);
    });
  });

  it("hookAspect names both entries when ratios differ", () => {
    const images = { hookBefore: { ...hookImages.hookBefore, width: 1600, height: 900 }, hookAfter: hookImages.hookAfter };
    expect(fmt(hookAspect({ hookImages: images }))).toEqual([
      "hook.ts: hookBefore (1600×900) and hookAfter (1200×589) aspect ratios differ",
    ]);
    const scaled = { hookBefore: { ...hookImages.hookBefore, width: 2400, height: 1178 }, hookAfter: hookImages.hookAfter };
    expect(hookAspect({ hookImages: scaled })).toEqual([]);
  });

  it("dependencyEdges reports the invalid edge with both endpoints and its index", () => {
    const edges = [...dependencyDemo.edges, { from: "publish_sales_mart", to: "rpt_daily" }];
    const errors = dependencyEdges({ dependencyDemo: { ...dependencyDemo, edges } });
    expect(fmt(errors)).toEqual([
      `dependencyDemo.ts › edges[11]: "publish_sales_mart" → "rpt_daily" (edge 11): unknown job "rpt_daily"`,
    ]);
    const few = { jobs: dependencyDemo.jobs.slice(0, 4), edges: [] };
    expect(fmt(dependencyEdges({ dependencyDemo: few }))).toEqual(["dependencyDemo.ts › jobs: 4 jobs (allowed 5–30)"]);
  });

  it("vizBullets names the stage with too many or too long bullets", () => {
    const [s1, s2, s3] = viz.stages;
    const bad: VizStage = { ...s3, changes: ["a", "b", "c", "d"] };
    const long: VizStage = { ...s1, changes: ["x".repeat(121), "ok"] };
    const errors = vizBullets({ viz: { stages: [long, s2, bad] } });
    expect(fmt(errors)).toEqual([
      'viz.ts › stages[0].changes[0]: stage 1 "Raw CSV": bullet 1 is 121 characters (max 120)',
      'viz.ts › stages[2].changes: stage 3 "Dash": 4 bullets (allowed 2–3)',
    ]);
    expect(fmt(vizBullets({ viz: { stages: [s2, s1, s3] } }))).toEqual([
      'viz.ts › stages[0].number: stage 2 "Plotly": expected stage number 1',
      'viz.ts › stages[1].number: stage 1 "Raw CSV": expected stage number 2',
    ]);
  });

  it("journey flags an empty array and whitespace-only fields", () => {
    expect(fmt(journey({ journey: [] }))).toEqual(["journey.ts: the Journey_Stage array is empty; add at least one entry"]);
    const stages = [
      journeyData[0],
      { label: "X", organization: "Org", role: "Role", years: " \t", detail: ["valid detail", "valid second detail"] },
    ];
    expect(fmt(journey({ journey: stages }))).toEqual([
      "journey.ts › [1].years: Journey_Stage 1: years is empty",
    ]);
  });

  it("pipelineTopics names each topic no stage mentions", () => {
    const stages = pipeline.stages.map((s) => ({ ...s, explanation: s.explanation.replace(/referential integrity|governance/gi, "") }));
    expect(fmt(pipelineTopics({ pipeline: { ...pipeline, stages: stages as unknown as typeof pipeline.stages } }))).toEqual([
      'pipeline.ts: no stage mentions "referential integrity"',
      'pipeline.ts: no stage mentions "governance"',
    ]);
  });

  it("certMeaning enforces three entries and the 120-character limit", () => {
    const certs = [{ ...certifications[0], description: "m".repeat(121) }, certifications[1]];
    expect(fmt(certMeaning({ certifications: certs }))).toEqual([
      "certifications.ts: 2 certifications (expected exactly 3)",
      `certifications.ts › [0].description: "${certifications[0].name}": description is 121 characters (max 120)`,
    ]);
  });

  it("seoCopy checks title and description lengths and the owner name", () => {
    const bad = { ...site, pageTitle: "Data Engineer", metaDescription: "Too short." };
    expect(fmt(seoCopy({ site: bad }))).toEqual([
      'site.ts › pageTitle: does not contain the owner name "Aishvarya Ramesh"',
      "site.ts › metaDescription: 10 characters (allowed 50–160)",
    ]);
    expect(fmt(seoCopy({ site: { ...site, pageTitle: `${site.ownerName} ${"x".repeat(60)}` } }))).toEqual([
      "site.ts › pageTitle: 77 characters (allowed 1–60)",
    ]);
  });

  it("backgroundConfig enforces caps, opacities, snippets and distinct speeds", () => {
    const bad = {
      ...background,
      mobileObjectCap: 64,
      depthLayers: [
        { speed: 0.2, opacity: 0.2 },
        { speed: 0.2, opacity: 0.1 },
      ] as const,
      ticker: { ...background.ticker, opacity: 0.1, snippets: background.ticker.snippets.slice(1) },
    };
    expect(fmt(backgroundConfig({ background: bad }))).toEqual([
      "background.ts › mobileObjectCap: 64 must be lower than desktopObjectCount (64)",
      "background.ts › depthLayers[0].opacity: opacity 0.2 is outside 0–0.15",
      "background.ts › ticker.opacity: opacity 0.1 is outside 0.05–0.08",
      'background.ts › ticker.snippets: missing required snippet "SELECT * FROM raw.orders;"',
      "background.ts › depthLayers[1].speed: speed 0.2 repeats an earlier layer",
    ]);
  });

  it("reflectionTopics names each missing topic", () => {
    const reflection = { didWell: ["Debugging test failures."], steppedIn: ["Accessibility checks."] };
    expect(fmt(reflectionTopics({ builtWithAi: { ...builtWithAi, reflection } }))).toEqual([
      'builtWithAi.ts › reflection: no entry mentions "performance tuning"',
      'builtWithAi.ts › reflection: no entry mentions "keeping design consistent"',
    ]);
  });
});
