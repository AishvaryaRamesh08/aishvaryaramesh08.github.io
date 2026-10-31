import { useMemo, useRef, useState } from "react";
import { CertificationCard } from "../certifications/CertificationCard";
import { certifications } from "../../data/certifications";
import { skills } from "../../data/skills";
import { work, type FeaturedWorkItem } from "../../data/work";
import type { SkillId } from "../../data/types";
import { useEscapeKey, useOutsideTap } from "../../hooks/useDismiss";
import { cx } from "../../lib/cx";
import { computeHighlight, skillAccessibleName, type SkillHighlight } from "../../lib/skills";
import { projects } from "../../data/projects";
import { skillsCopy } from "./copy";

const emphasisClass = {
  selected: "border-accent-cyan-text bg-surface-2 text-text shadow-glow-cyan",
  related: "border-accent-violet-text bg-surface-2 text-text",
  dim: "border-border bg-surface text-text-muted opacity-50",
  none: "border-border-strong bg-surface text-text",
} as const;

function SkillButton({
  skillId,
  highlight,
  onSelect,
  onClear,
}: {
  skillId: SkillId;
  highlight: SkillHighlight | null;
  onSelect: (id: SkillId) => void;
  onClear: () => void;
}) {
  const skill = skills.skills.find((entry) => entry.id === skillId);
  if (!skill) return null;

  const emphasis =
    highlight === null
      ? "none"
      : highlight.selected === skillId
        ? "selected"
        : highlight.related.has(skillId)
          ? "related"
          : "dim";

  return (
    <button
      type="button"
      data-skill-node={skillId}
      aria-label={skillAccessibleName(skillId, skills)}
      aria-pressed={highlight?.selected === skillId}
      onFocus={() => onSelect(skillId)}
      onBlur={onClear}
      onClick={() => onSelect(skillId)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onSelect(skillId);
      }}
      className={cx(
        "inline-flex min-h-11 max-w-full items-center justify-center rounded-pill border px-3 py-2 text-center font-mono text-xs leading-snug transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan",
        emphasisClass[emphasis],
      )}
    >
      <span className="whitespace-normal break-words">{skill.name}</span>
      {skills.clusters.filter((cluster) => cluster.skills.some((id) => id === skillId)).length > 1 ? (
        <span aria-hidden="true" className="ml-1 shrink-0 text-[0.625rem] opacity-70">★</span>
      ) : null}
    </button>
  );
}

function SkillDetails({ highlight }: { highlight: SkillHighlight | null }) {
  if (!highlight) {
    return <p className="text-sm text-text-muted">{skillsCopy.idlePrompt}</p>;
  }

  const relatedNames = [...highlight.related]
    .map((id) => skills.skills.find((skill) => skill.id === id)?.name)
    .filter((name): name is string => name !== undefined);
  const featuredWork = work.featured.filter((item: FeaturedWorkItem) =>
    item.tech.some((tech) => tech.id === highlight.selected),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
      <div>
        <h3 className="font-heading text-sm font-semibold text-text">{skillsCopy.relatedHeading}</h3>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          {relatedNames.length > 0 ? relatedNames.join(", ") : "—"}
        </p>
      </div>
      <div>
        <h3 className="font-heading text-sm font-semibold text-text">{skillsCopy.projectsHeading}</h3>
        {featuredWork.length > 0 ? (
          <ul className="mt-1 flex list-none flex-col gap-1 p-0">
            {featuredWork.map((item) => (
              <li key={item.id} className="text-sm text-accent-cyan-text">{item.title}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-text-muted">{skillsCopy.noFeaturedWork}</p>
        )}
      </div>
    </div>
  );
}

function SkillsTextListing() {
  const listing = useMemo(
    () =>
      skills.clusters.map((cluster) => ({
        ...cluster,
        items: cluster.skills.map((id) => skills.skills.find((skill) => skill.id === id)?.name ?? id),
      })),
    [],
  );

  return (
    <div className="sr-only">
      <h3>{skillsCopy.listingHeading}</h3>
      <ul>
        {listing.map((cluster) => (
          <li key={cluster.id}>{cluster.name}: {cluster.items.join(", ")}</li>
        ))}
      </ul>
    </div>
  );
}

export default function SkillConstellation() {
  const [highlight, setHighlight] = useState<SkillHighlight | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const onSelect = (skill: SkillId) => setHighlight(computeHighlight(skill, skills, projects));
  const onClear = () => setHighlight(null);

  useEscapeKey(onClear, highlight !== null);
  useOutsideTap(cardRef, onClear, highlight !== null);

  return (
    <div data-section-body="skills" className="flex flex-col gap-8">
      <p className="max-w-prose text-text-muted">{skillsCopy.intro}</p>

      <div
        ref={cardRef}
        onPointerLeave={(event) => {
          const nextTarget = event.relatedTarget;
          if (
            event.pointerType === "mouse" &&
            !(nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) &&
            !event.currentTarget.contains(document.activeElement)
          ) {
            onClear();
          }
        }}
        className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
      >
        <ul className="grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
          {skills.clusters.map((cluster) => (
            <li key={cluster.id} className="min-w-0 rounded-xl border border-border bg-surface-2 p-4">
              <h3 className="mb-3 font-heading text-sm font-semibold text-text">{cluster.name}</h3>
              <div className="flex flex-wrap gap-2">
                {cluster.skills.map((skillId) => (
                  <SkillButton
                    key={`${cluster.id}-${skillId}`}
                    skillId={skillId}
                    highlight={highlight}
                    onSelect={onSelect}
                    onClear={onClear}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
        <aside
          aria-label={skillsCopy.projectsHeading}
          className="mt-4 rounded-xl border border-border bg-surface p-4"
        >
          <SkillDetails highlight={highlight} />
        </aside>
      </div>

      <section aria-labelledby="certifications-heading">
        <h3 id="certifications-heading" className="mb-4 font-heading text-xl font-semibold text-text">
          {skillsCopy.certificationsHeading}
        </h3>
        <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
          {certifications.map((cert) => <CertificationCard key={cert.id} cert={cert} />)}
        </ul>
      </section>

      <SkillsTextListing />
    </div>
  );
}
