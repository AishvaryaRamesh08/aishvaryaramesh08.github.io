import { type MouseEvent, type ReactNode } from "react";
import { LinkButton } from "../../components/Button";
import { intro } from "../../data/intro";
import type { HeroFocusArea, SectionId } from "../../data/types";
import { isPlainClick } from "../../layout/navLinks";
import { scrollToSection } from "../../lib/scrollToSection";
import { withBase } from "../../lib/url";
import { TerminalWidget } from "../terminal/TerminalWidget";

const BASE_URL = import.meta.env.BASE_URL;
const profilePhotos = import.meta.glob<string>("../../assets/profile/headshot.jpg", {
  eager: true,
  import: "default",
  query: "?url",
});

function hrefFor(target: SectionId): string {
  return `${BASE_URL}#${target}`;
}

function onCtaClick(event: MouseEvent<HTMLAnchorElement>, target: SectionId): void {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  void scrollToSection(target);
}

function FocusAreaIcon({ icon }: { icon: HeroFocusArea["icon"] }) {
  const paths: Record<HeroFocusArea["icon"], ReactNode> = {
    data: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12v7c0 1.66 3.58 3 8 3s8-1.34 8-3v-7" />
      </>
    ),
    ai: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm6 11 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />,
    analytics: (
      <>
        <path d="M4 19V5M4 19h17" />
        <path d="m7 15 4-4 3 2 5-6" />
      </>
    ),
    visualization: (
      <>
        <path d="M4 19V5M4 19h17" />
        <rect x="7" y="12" width="3" height="5" rx=".5" />
        <rect x="13" y="9" width="3" height="8" rx=".5" />
        <rect x="19" y="6" width="2" height="11" rx=".5" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      {paths[icon]}
    </svg>
  );
}

export default function IntroScreen() {
  const photo = intro.useMonogramFallback ? undefined : profilePhotos[`../../assets/${intro.photoPath}`];

  return (
    <div data-section-body="home" className="w-full">
      <div className="mx-auto grid w-full max-w-[var(--container)] grid-cols-1 items-center gap-8 px-[var(--gutter)] py-6 lg:grid-cols-[7fr_5fr] lg:gap-10 lg:py-10">
        <div className="hero-copy order-1 flex min-w-0 flex-col items-start gap-4 lg:gap-3">
          <p
            data-hero-item
            className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface/85 px-3 py-1.5 font-mono text-xs leading-5 text-text-muted"
          >
            <span aria-hidden="true" className="size-2 rounded-full bg-accent-green-text" />
            {intro.availability}
          </p>

          <div data-hero-item className="flex min-w-0 items-center gap-4">
            {photo ? (
              <img
                src={photo}
                alt={intro.photoAlt}
                className="size-16 shrink-0 rounded-full border-2 border-accent-cyan object-cover lg:size-20"
                width={80}
                height={80}
              />
            ) : (
              <span
                role="img"
                aria-label={intro.photoAlt}
                className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-accent-cyan bg-surface-2 font-heading text-lg font-bold text-text lg:size-20"
              >
                {intro.name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")}
              </span>
            )}
            <h1
              id="home-heading"
              tabIndex={-1}
              className="scroll-mt-[var(--nav-h)] min-w-0 font-heading text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] font-bold tracking-tight text-text"
            >
              {intro.name}
            </h1>
          </div>

          <p data-hero-item className="text-lg leading-relaxed text-text-muted">
            {intro.titleLine}
          </p>

          <ul data-hero-item className="m-0 flex w-full flex-wrap gap-2 p-0" aria-label="Focus areas">
            {intro.focusAreas.map((area) => (
              <li
                key={area.label}
                className="inline-flex min-h-9 items-center gap-2 rounded-pill border border-border bg-surface/85 px-3 py-1.5 text-sm text-text-muted"
              >
                <FocusAreaIcon icon={area.icon} />
                {area.label}
              </li>
            ))}
          </ul>

          <p data-hero-item className="max-w-[60ch] text-pretty leading-relaxed text-text-muted">
            {intro.paragraph}
          </p>

          <div data-hero-item className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <LinkButton
              href={hrefFor("work")}
              variant="primary"
              className="min-h-12 w-full active:translate-y-px sm:w-auto"
              onClick={(event) => onCtaClick(event, "work")}
            >
              {intro.ctas.work}
            </LinkButton>
            {intro.resumeUrl ? (
              <LinkButton
                href={withBase(intro.resumeUrl)}
                download
                variant="secondary"
                className="min-h-12 w-full active:translate-y-px sm:w-auto"
              >
                {intro.ctas.resume}
              </LinkButton>
            ) : null}
            <a
              href={hrefFor("contact")}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-pill px-4 font-medium text-accent-cyan-text transition-colors hover:text-text active:translate-y-px sm:w-auto sm:justify-start"
              onClick={(event) => onCtaClick(event, "contact")}
            >
              {intro.ctas.contact}
            </a>
          </div>

          <ul className="hero-reveal m-0 grid w-full min-w-0 list-none grid-cols-3 gap-2 p-0">
            {intro.chips.map((chip) => (
              <li
                key={chip.label}
                className="flex min-w-0 flex-col justify-center gap-1 rounded-card border border-border bg-surface px-2.5 py-3 sm:px-3"
              >
                <span className="font-heading text-2xl leading-none font-bold tracking-tight text-text sm:text-3xl">
                  {chip.finalText}
                </span>
                <span className="text-xs leading-snug text-text-muted sm:text-sm">{chip.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-2 flex min-w-0 items-center lg:justify-center">
          <TerminalWidget />
        </div>
      </div>
    </div>
  );
}
