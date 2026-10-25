// Content-validation Vite plugin (design D6, Build plugins table). Loads the Content_Config,
// collects file-system facts (which files exist under /src/assets and /public, their byte sizes
// and intrinsic image sizes via `image-size`), runs every validator in src/lib/validators and, in
// the client build, fails `vite build` with one file/field-level line per error
// (Req 4.3, 4.6, 8.5, 13.2, 14.16, 19.10).
//
// It also defines `__RESUME_AVAILABLE__` from resume PDF presence. A missing resume is not an
// error: the Download resume CTA renders a Placeholder_Asset instead (Req 9.10).
//
// Content is loaded with Vite's module runner (`runnerImport`) rather than a static import, so
// /src/data/*.ts never become dependencies of the bundled vite.config.ts (editing content in dev
// would otherwise restart the dev server instead of hot-updating).
import { readdirSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { imageSizeFromFile } from "image-size/fromFile";
import { runnerImport, type ConfigEnv, type Plugin } from "vite";
// Type-only: the validators themselves are loaded through the module runner as well (see
// `loadValidators`), keeping vite.config.ts free of /src imports beyond build/env.ts.
import type * as Validators from "../src/lib/validators/index.ts";
import type { Content, FileFacts, FsFacts, ValidationError } from "../src/lib/validators/index.ts";

export const CONTENT_VALIDATION_PLUGIN = "portfolio-content-validation";

/** Module exporting `content: Content`, relative to the project root. */
export const DEFAULT_CONTENT_MODULE = "build/content.ts";

/** The validators module, relative to this file. */
const VALIDATORS_MODULE = resolve(import.meta.dirname, "../src/lib/validators/index.ts");

/** Extensions whose intrinsic size is read from the file header. */
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);

export interface ContentValidationOptions {
  /** Project root holding src/assets/ and public/. Defaults to the Vite root, then process.cwd(). */
  root?: string;
  /** Module exporting `content`, absolute or relative to `root`. Defaults to DEFAULT_CONTENT_MODULE. */
  contentModule?: string;
}

/**
 * Every file under `dir`, keyed by its "/"-separated path relative to `dir`. Dotfiles (.gitkeep,
 * .DS_Store) are skipped. With `readImages`, image files also get their intrinsic width/height;
 * unreadable headers simply leave the size unknown (the validators report that where it matters).
 */
export async function scanFiles(dir: string, readImages: boolean): Promise<Map<string, FileFacts>> {
  const facts = new Map<string, FileFacts>();
  let entries: string[];
  try {
    entries = readdirSync(dir, { recursive: true, encoding: "utf8" });
  } catch {
    return facts; // the directory does not exist: no files
  }
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.split(sep).some((part) => part.startsWith("."))) return;
      const file = join(dir, entry);
      const stat = statSync(file);
      if (!stat.isFile()) return;
      const fact: FileFacts = { bytes: stat.size };
      if (readImages && IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) {
        try {
          const size = await imageSizeFromFile(file);
          fact.width = size.width;
          fact.height = size.height;
        } catch {
          // Corrupt or unsupported header: size stays unknown.
        }
      }
      facts.set(entry.split(sep).join("/"), fact);
    }),
  );
  return facts;
}

/** File-system facts for the validators: everything under `<root>/src/assets` and `<root>/public`. */
export async function collectFsFacts(root: string, readImages = true): Promise<FsFacts> {
  const [assets, publicFiles] = await Promise.all([
    scanFiles(resolve(root, "src/assets"), readImages),
    scanFiles(resolve(root, "public"), readImages),
  ]);
  return { assets, publicFiles };
}

/** Imports `content` from the given module through Vite's module runner (TypeScript, extensionless imports). */
export async function loadContent(root: string, contentModule: string = DEFAULT_CONTENT_MODULE): Promise<Content> {
  const file = isAbsolute(contentModule) ? contentModule : resolve(root, contentModule);
  const { module } = await runnerImport<{ content?: Content }>(file, { root, logLevel: "error" });
  if (module.content === undefined || module.content === null) {
    throw new Error(`${relative(root, file)} does not export "content"`);
  }
  return module.content;
}

/** Imports src/lib/validators through Vite's module runner. */
async function loadValidators(root: string): Promise<typeof Validators> {
  const { module } = await runnerImport<typeof Validators>(VALIDATORS_MODULE, { root, logLevel: "error" });
  return module;
}

/** The message passed to `this.error()`: a header plus one "src/data/file › path: message" line per error. */
export function formatValidationReport(
  errors: readonly ValidationError[],
  format: (error: ValidationError) => string,
): string {
  const noun = errors.length === 1 ? "error" : "errors";
  return [
    `Content_Config validation failed with ${errors.length} ${noun}:`,
    ...errors.map((e) => `  - src/data/${format(e)}`),
  ].join("\n");
}

interface ValidationResult {
  resumeAvailable: boolean;
  /** The validation report, or a load error; undefined when the content is valid. */
  problems: string | undefined;
}

/** Loads the content, validators and fs facts once; runs every validator (`validate`) or only the resume check. */
async function evaluate(root: string, contentModule: string | undefined, validate: boolean): Promise<ValidationResult> {
  let content: Content;
  let validators: typeof Validators;
  try {
    [content, validators] = await Promise.all([loadContent(root, contentModule), loadValidators(root)]);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { resumeAvailable: false, problems: `Could not load the Content_Config: ${reason}` };
  }
  const fs = await collectFsFacts(root, validate);
  const resumeAvailable = validators.isResumeAvailable(content, fs);
  if (!validate) return { resumeAvailable, problems: undefined };
  const errors = validators.runValidators(content, fs);
  const problems = errors.length > 0 ? formatValidationReport(errors, validators.formatValidationError) : undefined;
  return { resumeAvailable, problems };
}

/**
 * Validation runs for the client build (errors fail it) and the dev server (errors are warnings).
 * The SSR build only needs `__RESUME_AVAILABLE__`; the client build already validated the same
 * content, so it skips the validators and image reads. `vite preview` builds nothing.
 */
export function contentValidationPlugin(options: ContentValidationOptions = {}): Plugin {
  let env: ConfigEnv | undefined;
  let result: ValidationResult | undefined;
  return {
    name: CONTENT_VALIDATION_PLUGIN,
    async config(userConfig, configEnv) {
      env = configEnv;
      if (configEnv.isPreview) return { define: { __RESUME_AVAILABLE__: "false" } };
      const root = resolve(options.root ?? userConfig.root ?? process.cwd());
      const validate = !(configEnv.command === "build" && configEnv.isSsrBuild);
      result = await evaluate(root, options.contentModule, validate);
      return { define: { __RESUME_AVAILABLE__: JSON.stringify(result.resumeAvailable) } };
    },
    configResolved(config) {
      if (env?.command === "serve" && result?.problems) config.logger.warn(result.problems);
    },
    buildStart() {
      if (env?.command === "build" && result?.problems) this.error(result.problems);
    },
  };
}
