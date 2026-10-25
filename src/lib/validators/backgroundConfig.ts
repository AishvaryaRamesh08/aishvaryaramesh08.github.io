/**
 * `backgroundConfig` (Req 6.1, 6.3, 6.7, 6.9): every decorative opacity is in [0, 0.15], the SQL
 * ticker sits at 0.05–0.08 and includes the four required snippets, depth-layer speeds are
 * distinct and in (0, 1), and the mobile object cap is lower than the desktop object count.
 */
import { CONTENT_FILES, validationError, type Content, type ValidationError } from "./types";

export const BACKGROUND_LIMITS = {
  maxOpacity: 0.15,
  ticker: { minOpacity: 0.05, maxOpacity: 0.08 },
} as const;

/** Req 6.7 */
export const REQUIRED_TICKER_SNIPPETS = [
  "SELECT * FROM raw.orders;",
  "MERGE INTO conformed.customers;",
  "DAG: ingest >> clean >> validate >> load;",
  "vector_index.upsert()",
] as const;

const file = CONTENT_FILES.background;

const inRange = (n: number, min: number, max: number): boolean => Number.isFinite(n) && n >= min && n <= max;

export function backgroundConfig(content: Pick<Content, "background">): ValidationError[] {
  const bg = content.background;
  const errors: ValidationError[] = [];
  const max = BACKGROUND_LIMITS.maxOpacity;

  if (!(bg.mobileObjectCap < bg.desktopObjectCount)) {
    errors.push(
      validationError(
        file,
        "mobileObjectCap",
        `${bg.mobileObjectCap} must be lower than desktopObjectCount (${bg.desktopObjectCount})`,
      ),
    );
  }

  const opacities: [string, number][] = [
    ["maxOpacity", bg.maxOpacity],
    ...bg.depthLayers.map((layer, i): [string, number] => [`depthLayers[${i}].opacity`, layer.opacity]),
    ["ticker.opacity", bg.ticker.opacity],
  ];
  for (const [path, value] of opacities) {
    if (!inRange(value, 0, max)) errors.push(validationError(file, path, `opacity ${value} is outside 0–${max}`));
  }

  const { minOpacity, maxOpacity } = BACKGROUND_LIMITS.ticker;
  if (!inRange(bg.ticker.opacity, minOpacity, maxOpacity)) {
    errors.push(validationError(file, "ticker.opacity", `opacity ${bg.ticker.opacity} is outside ${minOpacity}–${maxOpacity}`));
  }

  for (const snippet of REQUIRED_TICKER_SNIPPETS) {
    if (!bg.ticker.snippets.includes(snippet)) {
      errors.push(validationError(file, "ticker.snippets", `missing required snippet "${snippet}"`));
    }
  }

  const seen = new Set<number>();
  bg.depthLayers.forEach((layer, i) => {
    const path = `depthLayers[${i}].speed`;
    if (!(Number.isFinite(layer.speed) && layer.speed > 0 && layer.speed < 1)) {
      errors.push(validationError(file, path, `speed ${layer.speed} must be between 0 and 1 (exclusive)`));
    }
    if (seen.has(layer.speed)) errors.push(validationError(file, path, `speed ${layer.speed} repeats an earlier layer`));
    seen.add(layer.speed);
  });
  return errors;
}
