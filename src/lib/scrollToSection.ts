// Programmatic in-page navigation (design: "Navigation and scrolling"; Req 7.3, 7.4, 26.3, 28.5).
// Every Navbar link, Mobile_Menu link, CTA and fragment-on-load scroll goes through
// `scrollToSection`. Client-only: call it from effects or event handlers. Importing the module is
// SSR-safe because GSAP plugins are registered on first use, not at import time.
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { getMotionMode } from "../hooks/motionStore";

/** Fixed tween length, so any distance finishes within the 1000 ms budget of Req 7.3. */
export const SCROLL_DURATION_S = 0.8;

/** Used when `--nav-h` is missing or not a px/rem/em length (the token is 4rem = 64 px). */
export const FALLBACK_NAV_HEIGHT_PX = 64;

export interface ScrollToSectionOptions {
  /** Move keyboard focus to the section heading once the scroll ends (default true). */
  focus?: boolean;
}

let pluginRegistered = false;
let activeTween: gsap.core.Tween | null = null;

function ensurePlugin(): void {
  if (pluginRegistered) return;
  gsap.registerPlugin(ScrollToPlugin);
  pluginRegistered = true;
}

/**
 * Current `--nav-h` in CSS px, read from the root's computed style at call time (so a breakpoint
 * or zoom change is honoured). Accepts px, rem and em values; anything else yields 64.
 */
export function readNavHeight(): number {
  if (typeof document === "undefined") return FALLBACK_NAV_HEIGHT_PX;
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue("--nav-h").trim();
  const match = /^(-?\d*\.?\d+)(px|rem|em)$/.exec(raw);
  if (!match) return FALLBACK_NAV_HEIGHT_PX;
  const value = Number(match[1]);
  if (match[2] === "px") return value;
  const rootFontSize = Number.parseFloat(style.fontSize);
  return value * (Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : 16);
}

/**
 * The element that labels the section (`aria-labelledby`: its h1/h2, or the Hook headline),
 * falling back to the section itself. Made programmatically focusable if it is not already.
 */
function focusTarget(section: HTMLElement): HTMLElement {
  const labelId = section.getAttribute("aria-labelledby");
  const label = labelId ? document.getElementById(labelId) : null;
  const target = label ?? section;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  return target;
}

/**
 * Scrolls so the top of section `id` sits just below the sticky Navbar (`--nav-h`), then focuses
 * its heading with `preventScroll` (Req 7.3, 7.4, 28.5).
 *
 * - Full motion: a GSAP ScrollToPlugin tween of exactly 0.8 s. User wheel/touch input kills it
 *   (`autoKill`); focus still moves so keyboard navigation continues from the chosen section.
 * - Reduced_Motion_Mode: one `window.scrollTo({ behavior: "instant" })` jump (Req 26.3).
 *
 * A new call supersedes a running tween (the superseded call resolves without focusing).
 * Resolves once scrolling has finished; resolves immediately if no element has that ID.
 */
export function scrollToSection(id: string, options: ScrollToSectionOptions = {}): Promise<void> {
  const { focus = true } = options;
  const section = typeof document === "undefined" ? null : document.getElementById(id);
  if (!section) return Promise.resolve();

  if (activeTween) {
    // Cleared first, so the old tween's onInterrupt knows it was superseded.
    const previous = activeTween;
    activeTween = null;
    previous.kill();
  }

  const navHeight = readNavHeight();
  const finish = () => {
    if (focus) focusTarget(section).focus({ preventScroll: true });
  };

  if (getMotionMode() === "reduced") {
    const top = Math.max(0, section.getBoundingClientRect().top + window.scrollY - navHeight);
    window.scrollTo({ top, behavior: "instant" });
    finish();
    return Promise.resolve();
  }

  ensurePlugin();
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      // Still current: completed or auto-killed by user input. Otherwise superseded by a newer call.
      const current = activeTween === tween;
      if (current) activeTween = null;
      if (current) finish();
      resolve();
    };
    const tween = gsap.to(window, {
      duration: SCROLL_DURATION_S,
      ease: "power2.inOut",
      scrollTo: { y: section, offsetY: navHeight, autoKill: true },
      onComplete: done,
      onInterrupt: done,
    });
    activeTween = tween;
  });
}
