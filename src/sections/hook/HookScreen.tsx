// Screen 1, The Hook (Req 8). A single headline, a subline and two CTAs. SSR-safe: motion gating
// reads the motion store, which renders "full" during
// prerender/hydration and switches live on the client.
import { type MouseEvent } from "react";
import { LinkButton } from "../../components/Button";
import { hook } from "../../data/hook";
import type { SectionId } from "../../data/types";
import { isPlainClick } from "../../layout/navLinks";
import { scrollToSection } from "../../lib/scrollToSection";
import { HookArrow } from "./HookArrow";
import { HookHeadline } from "./HookHeadline";
import { HookPlotlyChart } from "./HookPlotlyChart";
import { HookRawCsvPreview } from "./HookRawCsvPreview";

const BASE_URL = import.meta.env.BASE_URL;

/** A plain-click CTA that scrolls in-page, with a real `href` so it works without JS / in a new tab. */
function hrefFor(target: SectionId): string {
  return `${BASE_URL}#${target}`;
}

function onCtaClick(event: MouseEvent<HTMLAnchorElement>, target: SectionId): void {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  void scrollToSection(target);
}

/**
 * Hook_Screen body. The headline is styled text, not a heading (Req 8.9); its `id="hook-headline"`
 * labels the section (Req 3.2). `min-height: 100svh` so it fills the first viewport (Req 8.6).
 */
export default function HookScreen() {
  return (
    <div
      data-section-body="hook"
      className="flex min-h-[100svh] flex-col justify-center gap-8 py-8"
    >
      <HookHeadline />

      <p className="text-balance text-text-muted">{hook.subline}</p>

      <div className="grid min-w-0 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <HookRawCsvPreview />
        <HookArrow />
        <HookPlotlyChart />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <LinkButton
          href={hrefFor(hook.primaryCta.target)}
          variant="primary"
          onClick={(event) => onCtaClick(event, hook.primaryCta.target)}
        >
          {hook.primaryCta.label}
        </LinkButton>
        <LinkButton
          href={hrefFor(hook.secondaryCta.target)}
          variant="secondary"
          onClick={(event) => onCtaClick(event, hook.secondaryCta.target)}
        >
          {hook.secondaryCta.label}
        </LinkButton>
      </div>
    </div>
  );
}
