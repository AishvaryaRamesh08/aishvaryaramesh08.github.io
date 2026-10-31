/**
 * Asset reference validators: `assetsExist` (Req 4.6), `assetsUnique` (Req 4.7) and
 * `intrinsicSize` (Req 29.3, 30.3).
 *
 * `collectAssetRefs` lists every non-placeholder file reference under `/src/assets/` in the
 * Content_Config. The `check*` functions work on any ref list, so the property tests can generate
 * refs directly. Placeholders are skipped: they have no file yet.
 */
import { normalizeAssetPath, normalizePublicPath } from "../assetPath";
import { isPlaceholder, type ImageAsset, type Slot } from "../../data/types";
import {
  CONTENT_FILES,
  validationError,
  type Content,
  type FileFacts,
  type FsFacts,
  type Size,
  type ValidationError,
} from "./types";

/** One file reference in the Content_Config. */
export interface AssetRef {
  file: string;
  /** Field path of the `src` value, e.g. "hookBefore.image.src". */
  path: string;
  /** Path as written in the Content_Config, relative to `/src/assets/`. */
  src: string;
  /** Declared box, when the entry declares one. */
  declared?: Size;
}

export type AssetContent = Pick<Content, "hookImages" | "viz" | "projects" | "analysis" | "certifications" | "builtWithAi">;

/** Open Graph image limits (Req 29.3). 1 MB is read as 1,000,000 bytes, like the 3 MB budget in Req 30.1. */
export const OG_IMAGE = { width: 1200, height: 630, maxBytes: 1_000_000 } as const;

/** Allowed relative difference between declared and intrinsic aspect ratios (SVG viewBox rounding). */
export const ASPECT_TOLERANCE = 0.005;

const sizeOf = (s: { width: number; height: number }): Size => ({ width: s.width, height: s.height });

function imageRef(file: string, path: string, slot: Slot<ImageAsset>): AssetRef[] {
  return isPlaceholder(slot) ? [] : [{ file, path: `${path}.src`, src: slot.src, declared: sizeOf(slot) }];
}

/** Every non-placeholder file reference under `/src/assets/`, in Content_Config order. */
export function collectAssetRefs(content: AssetContent): AssetRef[] {
  const refs: AssetRef[] = [];

  const hookFile = CONTENT_FILES.hookImages;
  for (const key of ["hookBefore", "hookAfter"] as const) {
    const entry = content.hookImages[key];
    if (!isPlaceholder(entry.image)) {
      refs.push({ file: hookFile, path: `${key}.image.src`, src: entry.image.src, declared: sizeOf(entry) });
    }
  }

  content.viz.stages.forEach((stage, i) => {
    const base = `stages[${i}].media`;
    const media = stage.media;
    if (media.kind === "image") refs.push(...imageRef(CONTENT_FILES.viz, `${base}.asset`, media.asset));
    if (media.kind === "video") {
      refs.push({ file: CONTENT_FILES.viz, path: `${base}.src`, src: media.src, declared: sizeOf(media) });
      refs.push(...imageRef(CONTENT_FILES.viz, `${base}.poster`, media.poster));
    }
    // kind "hook" reuses the hook entry and references no file of its own (Req 14.2).
  });

  content.projects.forEach((project, i) => {
    const diagram = project.architecture;
    if (!isPlaceholder(diagram)) {
      refs.push({ file: CONTENT_FILES.projects, path: `[${i}].architecture.src`, src: diagram.src, declared: sizeOf(diagram) });
    }
  });

  content.analysis.artifacts.forEach((artifact, i) => {
    if (!isPlaceholder(artifact.svg)) {
      refs.push({ file: CONTENT_FILES.analysis, path: `artifacts[${i}].svg.src`, src: artifact.svg.src, declared: sizeOf(artifact.svg) });
    }
  });

  content.certifications.forEach((cert, i) => {
    if (cert.badgeImage) {
      refs.push({
        file: CONTENT_FILES.certifications,
        path: `[${i}].badgeImage.src`,
        src: cert.badgeImage.src,
        declared: sizeOf(cert.badgeImage),
      });
    }
  });

  const shots = content.builtWithAi.artifacts;
  refs.push(...imageRef(CONTENT_FILES.builtWithAi, "artifacts.kiroScreenshot", shots.kiroScreenshot));
  refs.push(...imageRef(CONTENT_FILES.builtWithAi, "artifacts.actionsScreenshot", shots.actionsScreenshot));

  return refs;
}

/** Errors for every ref whose file is not in `existing` (keys are normalized asset paths). */
export function checkAssetsExist(refs: readonly AssetRef[], existing: { has(path: string): boolean }): ValidationError[] {
  return refs
    .filter((ref) => !existing.has(normalizeAssetPath(ref.src)))
    .map((ref) => validationError(ref.file, ref.path, `file "${normalizeAssetPath(ref.src)}" not found`));
}

/** One error per extra reference to a file that an earlier entry already references. */
export function checkAssetsUnique(refs: readonly AssetRef[]): ValidationError[] {
  const first = new Map<string, AssetRef>();
  const errors: ValidationError[] = [];
  for (const ref of refs) {
    const key = normalizeAssetPath(ref.src);
    const owner = first.get(key);
    if (owner === undefined) {
      first.set(key, ref);
    } else {
      errors.push(
        validationError(
          ref.file,
          ref.path,
          `file "${key}" duplicates ${owner.file} › ${owner.path}; reuse that entry instead`,
        ),
      );
    }
  }
  return errors;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** "1200×800 (3:2)" for integer sizes, "1200×800" otherwise. */
export function describeSize(s: Size): string {
  const box = `${s.width}×${s.height}`;
  if (!Number.isInteger(s.width) || !Number.isInteger(s.height) || s.width <= 0 || s.height <= 0) return box;
  const g = gcd(s.width, s.height);
  return `${box} (${s.width / g}:${s.height / g})`;
}

const isPositive = (n: number): boolean => Number.isFinite(n) && n > 0;

/** True when the two boxes have the same aspect ratio within `tolerance` (relative). */
export function sameAspect(a: Size, b: Size, tolerance = ASPECT_TOLERANCE): boolean {
  const lhs = a.width * b.height;
  const rhs = b.width * a.height;
  return Math.abs(lhs - rhs) <= tolerance * Math.max(lhs, rhs);
}

/**
 * Declared boxes must be positive and match the file's intrinsic aspect ratio. Refs with no
 * declared box, missing files, or files without readable dimensions (e.g. videos) are skipped.
 */
export function checkIntrinsicSizes(refs: readonly AssetRef[], facts: ReadonlyMap<string, FileFacts>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const ref of refs) {
    const declared = ref.declared;
    if (!declared) continue;
    if (!isPositive(declared.width) || !isPositive(declared.height)) {
      errors.push(validationError(ref.file, ref.path, `declared size ${declared.width}×${declared.height} must be positive`));
      continue;
    }
    const fact = facts.get(normalizeAssetPath(ref.src));
    if (fact?.width === undefined || fact.height === undefined) continue;
    const actual = { width: fact.width, height: fact.height };
    if (!sameAspect(declared, actual)) {
      errors.push(
        validationError(ref.file, ref.path, `declared ${describeSize(declared)}, file is ${describeSize(actual)}; aspect ratios differ`),
      );
    }
  }
  return errors;
}

/** Open Graph image checks: exactly 1200 × 630 and at most 1 MB (Req 29.3). Missing file → `assetsExist`. */
export function checkOgImage(src: string, facts: ReadonlyMap<string, FileFacts>): ValidationError[] {
  const key = normalizePublicPath(src);
  const fact = facts.get(key);
  if (fact === undefined) return [];
  const file = CONTENT_FILES.site;
  const path = "ogImage.src";
  const errors: ValidationError[] = [];
  if (fact.width === undefined || fact.height === undefined) {
    errors.push(validationError(file, path, `could not read the dimensions of "public/${key}"`));
  } else if (fact.width !== OG_IMAGE.width || fact.height !== OG_IMAGE.height) {
    errors.push(
      validationError(file, path, `"public/${key}" is ${fact.width}×${fact.height}; it must be exactly ${OG_IMAGE.width}×${OG_IMAGE.height}`),
    );
  }
  if (fact.bytes === undefined) {
    errors.push(validationError(file, path, `could not read the file size of "public/${key}"`));
  } else if (fact.bytes > OG_IMAGE.maxBytes) {
    errors.push(validationError(file, path, `"public/${key}" is ${fact.bytes} bytes; the limit is ${OG_IMAGE.maxBytes} bytes`));
  }
  return errors;
}

/** Every referenced asset exists under `/src/assets/`, and the Open Graph image exists under `/public/` (Req 4.6). */
export function assetsExist(content: AssetContent & Pick<Content, "site">, fs: FsFacts): ValidationError[] {
  const errors = checkAssetsExist(collectAssetRefs(content), fs.assets);
  const og = normalizePublicPath(content.site.ogImage.src);
  if (!fs.publicFiles.has(og)) {
    errors.push(validationError(CONTENT_FILES.site, "ogImage.src", `file "public/${og}" not found`));
  }
  return errors;
}

/** No two Content_Config entries reference the same file (Req 4.7). */
export function assetsUnique(content: AssetContent): ValidationError[] {
  return checkAssetsUnique(collectAssetRefs(content));
}

/** Declared sizes match intrinsic aspect ratios; the Open Graph image is 1200 × 630 and ≤ 1 MB (Req 29.3, 30.3). */
export function intrinsicSize(content: AssetContent & Pick<Content, "site">, fs: FsFacts): ValidationError[] {
  return [...checkIntrinsicSizes(collectAssetRefs(content), fs.assets), ...checkOgImage(content.site.ogImage.src, fs.publicFiles)];
}

/**
 * Whether the resume PDF is supplied and present under `/public/`. A missing resume is not an
 * error: the build defines `__RESUME_AVAILABLE__` from this and the CTA renders a placeholder (Req 9.10).
 */
export function isResumeAvailable(content: Pick<Content, "contact">, fs: Pick<FsFacts, "publicFiles">): boolean {
  const pdf = content.contact.links.resumePdf;
  return !isPlaceholder(pdf) && fs.publicFiles.has(normalizePublicPath(pdf));
}
