// Background_Layer: the "backend made visible" decorative scene (Req 1.3, 5.2, 5.10, 6, 28.8).
//
// A fixed, full-viewport layer behind all content (`z-bg`, `pointer-events: none`,
// `aria-hidden`, no focusable children). It renders:
//   - a hidden <symbol> set,
//   - 2–3 parallax SVG depth layers (icons via <use>, crow's-foot relationship lines),
//   - one <canvas> driven by a dynamically-imported engine (packets, pulses, neural edges),
//   - the SQL_Ticker side-gutter lanes.
//
// The SVG layers are rendered deterministically (`buildScene` is pure, no `window`/`Date`), so the
// prerendered HTML and the hydration pass agree and there is no mismatch — only the canvas engine
// is client-only, created after first paint (`requestIdleCallback`) so the `<canvas>` ships empty
// and LCP is untouched. The whole thing is isolated by an ErrorBoundary with a `null` fallback, so
// any failure simply leaves the layer blank (Req 6.15).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChunkErrorBoundary } from "../components/ChunkErrorBoundary";
import { background } from "../data/background";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { subscribeScrollFrame } from "../hooks/useScrollFrame";
import { BackgroundSymbols, iconSymbolId } from "./BackgroundIcons";
import type { CanvasEngine } from "./engine/canvasEngine";
import { crowsFootPath, toSvgPoints, trimPolyline, wrappedLayerOffsets } from "./geometry";
import { buildScene, MOBILE_MEDIA_QUERY, viewportClassFor, type RelationshipLine, type Scene, type SceneIcon } from "./scene";
import { SqlTickerGutters } from "./SqlTicker";

/** Sections whose first appearance reveals the Neural_Layer (`#intro` or anything after it). */
const NEURAL_REVEAL_SELECTOR = "#intro, #work, #skills, #certifications, #terminal, #journey, #built-with-ai, #analysis, #story, #contact, #site-footer";

/** Runs `cb` once the browser is idle after first paint; falls back to a macrotask. */
function onIdle(cb: () => void): () => void {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(cb, { timeout: 2000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = setTimeout(cb, 200);
  return () => clearTimeout(id);
}

/** Half the icon box, used to trim relationship lines back to each node's edge. */
const LINE_TRIM = 14;

/** One depth layer's worth of SVG: icons placed with <use>, plus trimmed crow's-foot lines. */
function DepthLayerSvg({ scene, layer }: { scene: Scene; layer: number }) {
  const icons = scene.icons.filter((i) => i.layer === layer);
  const lines = scene.lines.filter((l) => l.layer === layer);
  if (icons.length === 0 && lines.length === 0) return null;
  const { width, height } = scene.viewport;
  return (
    <svg
      focusable="false"
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full text-text"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {lines.map((line) => (
          <RelationshipLineSvg key={line.id} line={line} />
        ))}
      </g>
      {icons.map((icon) => (
        <IconUse key={icon.id} icon={icon} />
      ))}
    </svg>
  );
}

function RelationshipLineSvg({ line }: { line: RelationshipLine }) {
  const trimmed = trimPolyline(line.points, LINE_TRIM, LINE_TRIM);
  if (trimmed.length < 2) return null;
  return (
    <g style={{ opacity: line.opacity }}>
      <polyline points={toSvgPoints(trimmed)} />
      <path d={crowsFootPath(trimmed)} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function IconUse({ icon }: { icon: SceneIcon }) {
  return (
    <use
      href={`#${iconSymbolId(icon.kind)}`}
      x={icon.x - icon.size / 2}
      y={icon.y - icon.size / 2}
      width={icon.size}
      height={icon.size}
      className="text-text"
      style={{ opacity: icon.opacity, color: "currentColor" }}
    />
  );
}

/**
 * Parallax SVG layers are rendered twice (stacked) and shifted by a wrapped parallax offset
 * (see `wrappedLayerOffsets`) so they keep covering the
 * viewport at any scroll depth. Parallax is driven by the shared rAF scroll frame directly on the
 * DOM (no React re-render per frame); under reduced motion the offsets stay at 0 via CSS/engine.
 */
function SvgScene({ scene }: { scene: Scene }) {
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = layerRefs.current;
    const apply = (scrollY: number) => {
      const offsets = wrappedLayerOffsets(scrollY, scene.layers, window.innerHeight);
      scene.layers.forEach((_, i) => {
        const el = els[i];
        if (el) el.style.transform = `translate3d(0, ${offsets[i] ?? 0}px, 0)`;
      });
    };
    return subscribeScrollFrame(apply);
  }, [scene]);

  return (
    <>
      {scene.layers.map((layer, i) => (
        <div
          key={layer.index}
          ref={(el) => {
            layerRefs.current[i] = el;
          }}
          className="absolute inset-0 will-change-transform"
          aria-hidden="true"
        >
          {/* Two stacked viewport-high tiles so a wrapped parallax offset never reveals a gap. */}
          <div className="absolute inset-x-0 top-0 h-screen">
            <DepthLayerSvg scene={scene} layer={layer.index} />
          </div>
          <div className="absolute inset-x-0 top-full h-screen">
            <DepthLayerSvg scene={scene} layer={layer.index} />
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Canvas + engine. The engine chunk is imported after first paint; the scene is rebuilt when the
 * viewport crosses the 768 px boundary (passed to `engine.setScene`), and the Neural_Layer is
 * revealed the first time `#intro` or a later section intersects the viewport.
 */
function CanvasScene({ scene }: { scene: Scene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  // Set when the engine reports a draw error (it fires outside React); re-thrown during render so
  // the surrounding ErrorBoundary catches it and blanks the layer (Req 6.15).
  const [engineError, setEngineError] = useState<unknown>(null);

  // The latest scene for the async engine creation to pick up without re-running its effect.
  const sceneRef = useRef(scene);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    // Whether a reveal target has intersected yet; the engine reveals as soon as it exists.
    let shouldReveal = false;

    const cancelIdle = onIdle(async () => {
      try {
        const { createCanvasEngine } = await import("./engine/canvasEngine");
        if (disposed) return;
        const engine = createCanvasEngine(canvas, {
          scene: sceneRef.current,
          pulseIntervalMs: background.pulseIntervalMs,
          seed: background.seed,
          onError: setEngineError,
        });
        engineRef.current = engine;
        if (engine && shouldReveal) engine.revealNeural();
      } catch {
        // Chunk failed to load: leave the SVG layers, skip the canvas (Req 6.15).
      }
    });

    const reveal = () => {
      shouldReveal = true;
      engineRef.current?.revealNeural();
    };
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            reveal();
            observer?.disconnect();
          }
        },
        { rootMargin: "0px" },
      );
      const targets = document.querySelectorAll(NEURAL_REVEAL_SELECTOR);
      if (targets.length > 0) targets.forEach((t) => observer!.observe(t));
      else reveal(); // Nothing to observe: reveal once the engine exists.
    } else {
      reveal(); // No IntersectionObserver support: reveal immediately.
    }

    return () => {
      disposed = true;
      cancelIdle();
      observer?.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // Track the latest scene and swap it into the running engine (e.g. after crossing 768 px).
  useEffect(() => {
    sceneRef.current = scene;
    engineRef.current?.setScene(scene);
  }, [scene]);

  if (engineError) throw engineError;

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}

const LAYER_STYLE: CSSProperties = { zIndex: "var(--z-bg)" };

/**
 * The decorative scene. `buildScene` is pure and deterministic (no `window`, `Date` or storage),
 * so the SVG layers render identically during prerender, hydration and on the client — there is
 * no hydration mismatch and no post-mount flip. The viewport class comes from `useMediaQuery`,
 * which renders its `serverValue` (desktop) during prerender/hydration and only switches to the
 * real value afterwards (via `useSyncExternalStore`, mismatch-safe). The canvas engine is the only
 * client-only part: it is created in an effect after first paint, so the `<canvas>` ships empty.
 */
function BackgroundScene() {
  const mobile = useMediaQuery(MOBILE_MEDIA_QUERY);
  // Rebuilt only when the viewport class actually changes (768 px boundary), not on every resize.
  const scene = useMemo(
    () => buildScene(background.seed, viewportClassFor(mobile ? 767 : 768), background),
    [mobile],
  );
  return (
    <div aria-hidden="true" style={LAYER_STYLE} className="pointer-events-none fixed inset-0 overflow-hidden select-none">
      <BackgroundSymbols />
      <SvgScene scene={scene} />
      <CanvasScene scene={scene} />
      <SqlTickerGutters />
    </div>
  );
}

/**
 * Public Background_Layer. Deterministic SVG so prerender and hydration agree (no mismatch); the
 * canvas engine stays client-only inside `CanvasScene`. Wrapped in an ErrorBoundary whose fallback
 * is `null`, so any failure leaves the page blank behind the content instead of surfacing an
 * error (Req 6.13, 6.15, 28.8).
 */
export function BackgroundLayer() {
  return (
    <ChunkErrorBoundary fallback={() => null}>
      <BackgroundScene />
    </ChunkErrorBoundary>
  );
}
