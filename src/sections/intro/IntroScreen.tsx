// Screen 2, Introduction (Req 9). The page's single h1 (the Owner's name) is rendered by
// `SectionShell` from `site.sections.intro.heading` (Req 9.1); this body must NOT render another
// heading. It lays out, below that h1: the title line, the cycling typewriter line, the intro
// paragraph (or a placeholder), three count-up stat chips, and three CTAs.
//
// SSR-safe and hydration-stable: the motion store reports "full" during prerender, the typewriter
// starts at elapsed 0 and the chips start at their final value (count-up only begins once a chip is
// in view on the client), so the server and first client render produce the same DOM.
import { type MouseEvent } from "react";
import { LinkButton } from "../../components/Button";
import { PlaceholderAsset } from "../../components/PlaceholderAsset";
import { contact } from "../../data/contact";
import { intro } from "../../data/intro";
import type { ContactConfig, SectionId } from "../../data/types";
import { isPlaceholder } from "../../data/types";
import { isPlainClick } from "../../layout/navLinks";
import { scrollToSection } from "../../lib/scrollToSection";
import { withBase } from "../../lib/url";
import { StatChip } from "./StatChip";
import { Typewriter } from "./Typewriter";

const BASE_URL = import.meta.env.BASE_URL;

/** A plain-click CTA that scrolls in-page, with a real `href` so it works without JS / in a new tab. */
function hrefFor(target: SectionId): string {
  return `${BASE_URL}#${target}`;
}

function onCtaClick(event: MouseEvent<HTMLAnchorElement>, target: SectionId): void {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  // `scrollToSection` moves keyboard focus to the target heading (Req 9.7).
  void scrollToSection(target);
}

/** The "Download resume" control: a real download link when the PDF is present, else a placeholder. */
function ResumeCta() {
  // Widened to the `Slot` so the placeholder guard narrows both branches regardless of the current
  // Content_Config value (today a placeholder; a real `.pdf` path once the Owner adds one).
  const slot: ContactConfig["links"]["resumePdf"] = contact.links.resumePdf;
  // `__RESUME_AVAILABLE__` is true only when the PDF is a real path AND present under /public at
  // build (Req 9.9, 9.10). A placeholder slot is never available.
  if (!isPlaceholder(slot) && __RESUME_AVAILABLE__) {
    return (
      <LinkButton href={withBase(slot)} download variant="secondary">
        {intro.ctas.resume}
      </LinkButton>
    );
  }
  // No file: a labelled Placeholder_Asset with no link to a missing file (Req 9.10).
  return <PlaceholderAsset expected="resume PDF" variant="button" />;
}

/** Intro_Screen body (Req 9). The h1 lives in `SectionShell`; this renders everything under it. */
export default function IntroScreen() {
  const paragraph = intro.paragraph;

  return (
    <div data-section-body="intro" className="flex flex-col gap-6">
      {/* Title line, immediately after the h1 (Req 9.1). */}
      <p className="text-lg text-text-muted">{intro.titleLine}</p>

      <Typewriter lines={intro.typewriterLines} />

      {isPlaceholder(paragraph) ? (
        <PlaceholderAsset expected={paragraph.expected} variant="text" />
      ) : (
        <p className="max-w-prose text-pretty">{paragraph}</p>
      )}

      {/* Three chips in order (Req 9.5); each counts up once when 50% in view (Req 9.6). */}
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
        {intro.chips.map((chip) => (
          <li key={chip.label}>
            <StatChip chip={chip} />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <LinkButton
          href={hrefFor("work")}
          variant="primary"
          onClick={(event) => onCtaClick(event, "work")}
        >
          {intro.ctas.explore}
        </LinkButton>
        <LinkButton
          href={hrefFor("contact")}
          variant="secondary"
          onClick={(event) => onCtaClick(event, "contact")}
        >
          {intro.ctas.talk}
        </LinkButton>
        <ResumeCta />
      </div>
    </div>
  );
}
