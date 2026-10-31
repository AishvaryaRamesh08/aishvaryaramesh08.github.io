// Navbar (design: "Navigation and scrolling"; Req 7.1–7.13, 27.2, 27.5, 3.2, 28.9).
// Hydration-stable: the prerendered HTML holds both the inline links and the menu button, and
// CSS (`md:`) picks one by width; scroll-driven state (active link, progress, glass) starts at
// its top-of-page value and is updated from effects only.
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { site } from "../data/site";
import type { SectionId } from "../data/types";
import { ui } from "../data/ui";
import { useActiveNavGroup } from "../hooks/useActiveNavGroup";
import { useScrollFrame } from "../hooks/useScrollFrame";
import { cx } from "../lib/cx";
import { scrollProgress } from "../lib/scroll";
import { readNavHeight, scrollToSection } from "../lib/scrollToSection";
import { MobileMenu } from "./MobileMenu";
import { HOME_HREF, HOME_ID, isPlainClick, NAV_LINKS } from "./navLinks";
import { ThemeToggle } from "./ThemeToggle";

/** Small database-cylinder logo mark (Req 7.1). */
function CylinderLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 text-accent-cyan"
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/**
 * `true` once Home's bottom edge has moved above the Navbar's bottom edge (Req 7.7, 7.8).
 * Without
 * IntersectionObserver (or a Hook) the Navbar stays solid so it is always readable.
 */
function useNavbarSolid(): boolean {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const home = document.getElementById(HOME_ID);
    if (!home || typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setSolid(true), 0);
      return () => clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setSolid(!entry.isIntersecting);
      },
      { rootMargin: `-${readNavHeight()}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(home);
    return () => observer.disconnect();
  }, []);
  return solid;
}

/** The page's single header landmark, containing the Navbar's nav landmark `#site-nav`. */
export function Header() {
  const activeGroup = useActiveNavGroup();
  const solid = useNavbarSolid();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  /** Set by a Mobile_Menu link; scrolled to once the menu has closed and released its lock. */
  const pendingTarget = useRef<SectionId | null>(null);

  // Scroll progress (Req 7.5): written straight to the DOM in the shared rAF scroll frame.
  useScrollFrame((scrollY) => {
    const bar = progressRef.current;
    if (!bar) return;
    const progress = scrollProgress(scrollY, document.documentElement.scrollHeight, window.innerHeight);
    bar.style.transform = `scaleX(${progress})`;
  });

  // Runs after the menu's own cleanup (inert removed, scroll unlocked, focus on the menu button),
  // so the scroll isn't blocked and scrollToSection's heading focus lands last (Req 7.13).
  useEffect(() => {
    if (menuOpen) return;
    const target = pendingTarget.current;
    if (!target) return;
    pendingTarget.current = null;
    void scrollToSection(target);
  }, [menuOpen]);

  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, target: SectionId) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    void scrollToSection(target);
  };

  return (
    <header
      data-solid={solid ? "true" : "false"}
      className={cx(
        "sticky top-0 z-[var(--z-nav)] h-[var(--nav-h)] border-b border-border bg-surface/85 backdrop-blur-[var(--glass-blur)]",
        "transition-[background-color,backdrop-filter,border-color] duration-200",
      )}
    >
      <nav
        id="site-nav"
        aria-label={ui.primaryNav}
        className="mx-auto flex h-full w-full max-w-[var(--container)] items-center justify-between gap-2 px-[var(--gutter)] lg:gap-4"
      >
        <a
          href={HOME_HREF}
          onClick={(event) => onLinkClick(event, HOME_ID)}
          className="inline-flex h-11 min-w-11 shrink-0 items-center gap-2 rounded-md font-heading font-bold text-text"
        >
          <CylinderLogo />
          <span className="sr-only lg:not-sr-only">{site.ownerName}</span>
        </a>

        <ul className="hidden items-center md:flex">
          {NAV_LINKS.map((link) => {
            const current = link.id === activeGroup;
            return (
              <li key={link.id}>
                <a
                  href={link.href}
                  aria-current={current ? "true" : undefined}
                  onClick={(event) => onLinkClick(event, link.target)}
                  className={cx(
                    "relative inline-flex h-11 items-center px-2 text-sm whitespace-nowrap hover:text-text",
                    current ? "font-bold text-text" : "text-text-muted",
                  )}
                >
                  {/* Hidden bold copy reserves the bold width, so marking a link current doesn't shift the row. */}
                  <span
                    data-label={link.label}
                    className="inline-flex flex-col items-center after:invisible after:h-0 after:overflow-hidden after:font-bold after:content-[attr(data-label)]"
                  >
                    {link.label}
                  </span>
                  {/* Non-color current indicator (Req 7.11). */}
                  <span
                    aria-hidden="true"
                    className={cx(
                      "absolute inset-x-2 bottom-1.5 h-0.5 origin-left rounded-full bg-accent-cyan transition-transform duration-200",
                      current ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={ui.openMenu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border-strong text-text hover:text-accent-cyan-text md:hidden"
          >
            <MenuIcon />
          </button>
        </div>
      </nav>

      {/* Scroll progress (Req 7.5): decorative, the page position is already exposed by scrolling. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
        <div
          ref={progressRef}
          data-scroll-progress=""
          className="h-full w-full origin-left bg-[image:var(--gradient-accent)]"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {menuOpen && (
        <MobileMenu
          activeGroup={activeGroup}
          menuButtonRef={menuButtonRef}
          onClose={() => setMenuOpen(false)}
          onNavigate={(target) => {
            pendingTarget.current = target;
            setMenuOpen(false);
          }}
        />
      )}
    </header>
  );
}
