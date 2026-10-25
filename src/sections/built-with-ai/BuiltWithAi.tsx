// Built_With_AI_Section (Req 20). Shows how this site was built with AI, guided by specs: an
// introductory statement that the AI work was spec-guided and the Owner reviewed and verified it
// (Req 20.6); a step-by-step timeline of exactly the seven steps in order — Idea → Requirements
// (spec-driven in Kiro) → Design → Task execution → Review and refinement → CI/CD to GitHub Pages
// → Live — each with three labelled entries (what the AI did, what I decided or reviewed, what I
// learned), rendering a Placeholder_Asset where an entry is not yet supplied (Req 20.1, 20.2,
// 20.4); and a two-part "What AI did well / where I had to step in" reflection (Req 20.5). Every
// visible string comes from `data/builtWithAi.ts` (plus the fixed labels in `copy.ts`); the h2 and
// anchor come from SectionShell (Req 3.2). Pure content, so it is SSR-safe and prerenders fully.
//
// Artifacts (CodeBlock excerpts, prompt example, screenshots in a Lightbox) are the rest of task
// 18.1 and are added separately; this body covers the timeline and reflection.
import { Badge, Chip } from "../../components/Chip";
import { GlassCard } from "../../components/GlassCard";
import { PlaceholderAsset } from "../../components/PlaceholderAsset";
import { builtWithAi } from "../../data/builtWithAi";
import { isPlaceholder, type Slot } from "../../data/types";
import { builtWithAiCopy, STEP_ENTRY_KEYS, STEP_ENTRY_LABEL, stepEntryExpected } from "./copy";

/** A per-step entry: the Owner's text, or a labelled placeholder naming what is still expected (Req 20.4). */
function StepEntry({ label, value, expected }: { label: string; value: Slot<string>; expected: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</dt>
      <dd className="m-0 text-sm leading-relaxed text-text">
        {isPlaceholder(value) ? <PlaceholderAsset expected={expected} /> : value}
      </dd>
    </div>
  );
}

/**
 * Built_With_AI_Section body. SSR-safe: pure content with no client-only state, so it prerenders
 * in full (Req 3.2, 3.3).
 */
export default function BuiltWithAi() {
  return (
    <div data-section-body="built-with-ai" className="flex flex-col gap-12">
      {/* Intro: the AI work was spec-guided and the Owner reviewed and verified it (Req 20.6). */}
      <p className="max-w-prose text-base leading-relaxed text-text-muted">{builtWithAi.intro}</p>

      {/* Seven-step timeline in fixed order, each with three labelled entries (Req 20.1, 20.2). */}
      <div className="flex flex-col gap-4">
        <h3 className="font-heading text-xl font-semibold text-text">{builtWithAiCopy.timelineHeading}</h3>
        <ol className="flex list-none flex-col gap-4 p-0">
          {builtWithAi.steps.map((step, index) => (
            <GlassCard as="li" key={step.title} className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <Badge tone="cyan">{`Step ${index + 1}`}</Badge>
                <h4 className="font-heading text-base font-semibold text-text">{step.title}</h4>
              </div>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {STEP_ENTRY_KEYS.map((key) => (
                  <StepEntry
                    key={key}
                    label={STEP_ENTRY_LABEL[key]}
                    value={step[key]}
                    expected={stepEntryExpected(step, key)}
                  />
                ))}
              </dl>
            </GlassCard>
          ))}
        </ol>
      </div>

      {/* Two-part reflection: what AI did well and where I had to step in (Req 20.5). */}
      <div className="flex flex-col gap-4">
        <h3 className="font-heading text-xl font-semibold text-text">{builtWithAiCopy.reflectionHeading}</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <GlassCard className="flex flex-col gap-3 p-5">
            <Chip tone="green">{builtWithAiCopy.didWellLabel}</Chip>
            <ul className="flex flex-col gap-2 p-0">
              {builtWithAi.reflection.didWell.map((item) => (
                <li key={item} className="ml-5 list-disc text-sm leading-relaxed text-text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard className="flex flex-col gap-3 p-5">
            <Chip tone="violet">{builtWithAiCopy.steppedInLabel}</Chip>
            <ul className="flex flex-col gap-2 p-0">
              {builtWithAi.reflection.steppedIn.map((item) => (
                <li key={item} className="ml-5 list-disc text-sm leading-relaxed text-text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
