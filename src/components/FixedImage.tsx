import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { tryResolveAsset } from "../data/assets";
import { isPlaceholder, type ImageAsset, type Placeholder, type SizedSlot } from "../data/types";
import { ui } from "../data/ui";
import { cx } from "../lib/cx";
import { PlaceholderAsset } from "./PlaceholderAsset";

export interface FixedImageProps {
  image: ImageAsset | Placeholder;
  /** Above-the-fold image (Hook panels): eager load with `fetchpriority="high"`. */
  priority?: boolean;
  /** Stretch to the container width (height follows the declared ratio). Default: declared width, shrinking to fit. */
  fill?: boolean;
  /** Extra content shown in the box with the alt text when the image fails, e.g. the Hook label chip (Req 8.20). */
  fallbackExtra?: ReactNode;
  /** Applied to the image, its failure box and its placeholder alike. */
  className?: string;
}

/** Turns a `SizedSlot` (declared box + optional real file) into a `FixedImage` input. */
export function fromSizedSlot(slot: SizedSlot): ImageAsset | Placeholder {
  return isPlaceholder(slot.image)
    ? { ...slot.image, width: slot.width, height: slot.height }
    : { src: slot.image.src, width: slot.width, height: slot.height, alt: slot.alt };
}

/**
 * Image with explicit `width`/`height` from the Content_Config, so it never shifts layout
 * (Req 8.3, 30.3). Lazy-loaded unless `priority`. Placeholders render a `PlaceholderAsset` in the
 * same box. If the file fails to load (or cannot be resolved), the same box shows the alt text and
 * "Image unavailable" (Req 8.20, 14.15).
 */
export function FixedImage({ image, priority = false, fill = false, fallbackExtra, className }: FixedImageProps) {
  const [failed, setFailed] = useState(false);
  const src = isPlaceholder(image) ? undefined : tryResolveAsset(image.src);

  // An error that fires before hydration attaches `onError` is caught here: a finished image with
  // no natural size is broken. (A lazy image that has not started loading is not `complete`.)
  const checkAlreadyFailed = useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth === 0) setFailed(true);
  }, []);

  if (isPlaceholder(image)) {
    return (
      <PlaceholderAsset
        variant="image"
        expected={image.expected}
        width={image.width}
        height={image.height}
        className={cx(fill && "w-full", className)}
      />
    );
  }

  const { width, height, alt } = image;

  if (failed || src === undefined) {
    const style: CSSProperties = { aspectRatio: `${width} / ${height}`, maxWidth: "100%" };
    if (!fill) style.width = `${width}px`;
    return (
      <span
        data-image-unavailable=""
        style={style}
        className={cx(
          "flex flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-border bg-surface p-4 text-center text-sm text-text",
          fill && "w-full",
          className,
        )}
      >
        <span>{alt}</span>
        <span className="text-text-muted">{ui.imageUnavailable}</span>
        {fallbackExtra}
      </span>
    );
  }

  return (
    <img
      ref={checkAlreadyFailed}
      src={src}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onError={() => setFailed(true)}
      className={cx("block h-auto max-w-full", fill && "w-full", className)}
    />
  );
}
