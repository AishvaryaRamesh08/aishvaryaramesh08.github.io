/**
 * Shared types for the build-time content validators (design: Build-time validators).
 *
 * Every validator is a pure function `(content, fsFacts) => ValidationError[]`. It never touches the
 * file system: the content-validation Vite plugin (task 4.9) collects `FsFacts` and passes them in,
 * so validators can be unit- and property-tested with generated inputs.
 *
 * Each validator only reads the slice of `Content` it needs (typed as a `Pick`), so tests can pass
 * just that slice, while still being assignable to the uniform `Validator` type.
 */
import type {
  AnalysisConfig,
  BackgroundConfig,
  BuiltWithAiConfig,
  CaseStudy,
  Certification,
  ContactConfig,
  DependencyDemoConfig,
  HookConfig,
  HookImages,
  IntroConfig,
  JourneyConfig,
  LiveDemoConfig,
  PipelineConfig,
  SiteConfig,
  SkillsConfig,
  StoryConfig,
  TerminalConfig,
  VizConfig,
} from "../../data/types";

/** One validation failure: the Content_Config file, the field path inside it, and what is wrong. */
export interface ValidationError {
  /** Content_Config file name, e.g. "hook.ts". */
  file: string;
  /** Field path inside the file's exported value, e.g. "hookAfter.image.src"; "" for file-level. */
  path: string;
  message: string;
}

export interface Size {
  width: number;
  height: number;
}

/** What the build knows about one file on disk. Existence is "the key is present in the map". */
export interface FileFacts {
  /** Intrinsic px (from the image header), when readable. */
  width?: number;
  height?: number;
  /** File size in bytes, when known. */
  bytes?: number;
}

export interface FsFacts {
  /** Files under `/src/assets/`, keyed by normalized relative path (e.g. "diagrams/flow.svg"). */
  assets: ReadonlyMap<string, FileFacts>;
  /** Files under `/public/`, keyed by normalized relative path (e.g. "og-image.png"). */
  publicFiles: ReadonlyMap<string, FileFacts>;
}

/** The whole Content_Config: one key per exported constant in `/src/data/*.ts`. */
export interface Content {
  site: SiteConfig;
  hook: HookConfig;
  hookImages: HookImages;
  intro: IntroConfig;
  story: StoryConfig;
  pipeline: PipelineConfig;
  projects: readonly CaseStudy[];
  dependencyDemo: DependencyDemoConfig;
  viz: VizConfig;
  liveDemo: LiveDemoConfig;
  analysis: AnalysisConfig;
  skills: SkillsConfig;
  certifications: readonly Certification[];
  journey: JourneyConfig;
  builtWithAi: BuiltWithAiConfig;
  contact: ContactConfig;
  terminal: TerminalConfig;
  background: BackgroundConfig;
}

/** Source file for each Content key, used in error reports. */
export const CONTENT_FILES = {
  site: "site.ts",
  hook: "hook.ts",
  hookImages: "hook.ts",
  intro: "intro.ts",
  story: "story.ts",
  pipeline: "pipeline.ts",
  projects: "projects.ts",
  dependencyDemo: "dependencyDemo.ts",
  viz: "viz.ts",
  liveDemo: "liveDemo.ts",
  analysis: "analysis.ts",
  skills: "skills.ts",
  certifications: "certifications.ts",
  journey: "journey.ts",
  builtWithAi: "builtWithAi.ts",
  contact: "contact.ts",
  terminal: "terminal.ts",
  background: "background.ts",
} as const satisfies Record<keyof Content, string>;

export type Validator = (content: Content, fs: FsFacts) => ValidationError[];

export const validationError = (file: string, path: string, message: string): ValidationError => ({
  file,
  path,
  message,
});

/** "hook.ts › hookAfter.image.src: file … not found", or "pipeline.ts: …" for file-level errors. */
export function formatValidationError(e: ValidationError): string {
  return e.path ? `${e.file} › ${e.path}: ${e.message}` : `${e.file}: ${e.message}`;
}

/** True when `s` is a string with at least one non-whitespace character. */
export const hasText = (s: unknown): s is string => typeof s === "string" && s.trim() !== "";

/** Length in code points, so an emoji or accented letter counts once. */
export const charLength = (s: string): number => [...s].length;
