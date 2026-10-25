// Footer landmark (Req 3.2, 22). The page's last element: a single block with the colophon,
// email/LinkedIn/GitHub links, the owner copyright line and a back-to-top control (task 19.6).
import type { ReactNode } from "react";
import { ExternalLink } from "../components/ExternalLink";
import { PlaceholderAsset } from "../components/PlaceholderAsset";
import { contact } from "../data/contact";
import { site } from "../data/site";
import { isPlaceholder, type Slot } from "../data/types";
import { scrollToSection } from "../lib/scrollToSection";

const { links } = contact;
const {
  builtWith,
  linkedinName,
  githubName,
  linkedinExpected,
  githubExpected,
  backToTop,
} = site.footer;

/** Inline SVG icon, decorative: the accessible name comes from the link's `aria-label`. */
function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}

const LINKEDIN_PATH =
  "M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z";
const GITHUB_PATH =
  "M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z";

/** One social icon slot: a new-tab link when the URL is supplied, a Placeholder_Asset otherwise (Req 22.2, 22.3). */
function SocialSlot({
  url,
  name,
  expected,
  icon,
}: {
  url: Slot<string>;
  name: string;
  expected: string;
  icon: ReactNode;
}) {
  if (isPlaceholder(url)) {
    return <PlaceholderAsset variant="link" expected={expected} />;
  }
  return (
    <ExternalLink
      href={url}
      aria-label={name}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-muted hover:text-text"
    >
      {icon}
    </ExternalLink>
  );
}

/** Scroll to the Hook_Screen then move focus to the first focusable element (the Skip link). Req 22.5, 22.6. */
function backToTopHandler(): void {
  // scrollToSection chooses smooth (full motion) or an instant jump (reduced motion) on its own.
  void scrollToSection("hook", { focus: false }).then(() => {
    const skipLink = document.querySelector<HTMLElement>("a[href='#main']");
    skipLink?.focus();
  });
}

/** The page's single footer landmark `#site-footer`, outside `main` (last element of the page). */
export function Footer() {
  return (
    <footer id="site-footer" className="relative z-[var(--z-content)] border-t border-border">
      <div className="mx-auto flex w-full max-w-[var(--container)] flex-col gap-4 px-[var(--gutter)] py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          {/* The prerendered year comes from build time; the client re-renders it after hydration. */}
          <p suppressHydrationWarning>© {new Date().getFullYear()} {site.ownerName}</p>
          <p>{builtWith}</p>
        </div>

        {/* A plain list of links, not a nav landmark: the page keeps a single primary nav (Req 3.2, 28.9). */}
        <ul className="flex list-none items-center gap-3">
          {/* Email opens the visitor's mail client in place, so it is a plain link, not a new tab. */}
          <li>
            <a
              href={links.email}
              aria-label="Email"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-muted hover:text-text"
            >
              <Icon path="M2 4h20v16H2V4zm2 2v.01L12 12l8-5.99V6H4zm16 2.24-8 6-8-6V18h16V8.24z" />
            </a>
          </li>
          <li>
            <SocialSlot
              url={links.linkedin}
              name={linkedinName}
              expected={linkedinExpected}
              icon={<Icon path={LINKEDIN_PATH} />}
            />
          </li>
          <li>
            <SocialSlot
              url={links.github}
              name={githubName}
              expected={githubExpected}
              icon={<Icon path={GITHUB_PATH} />}
            />
          </li>
        </ul>

        <button
          type="button"
          onClick={backToTopHandler}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-border-strong bg-surface px-5 text-text transition-[color,border-color,box-shadow] duration-200 hover:border-accent-cyan hover:shadow-glow-cyan focus-visible:shadow-glow-cyan"
        >
          <span aria-hidden="true">↑</span>
          {backToTop}
        </button>
      </div>
    </footer>
  );
}
