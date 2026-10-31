import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { work, type FeaturedWorkItem } from "../../data/work";
import { useEscapeKey, useOutsideTap } from "../../hooks/useDismiss";
import { useFocusTrap, type FocusTarget } from "../../hooks/useFocusTrap";
import { useScrollLock } from "../../hooks/useScrollLock";
import { ProjectDiagram } from "./ProjectDiagram";

interface WorkDialogProps {
  project: FeaturedWorkItem;
  returnFocusTo: FocusTarget;
  onClose: () => void;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 font-mono text-xs font-semibold tracking-wide text-text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function WorkDialog({ project, returnFocusTo, onClose }: WorkDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useFocusTrap(dialogRef, { active: true, initialFocus: closeRef, returnFocusTo });
  useScrollLock(true);
  useEscapeKey(onClose, true);
  useOutsideTap(
    sheetRef,
    (event) => {
      event.preventDefault();
      onClose();
    },
    true,
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-[var(--z-overlay)] flex items-end justify-center bg-[color-mix(in_srgb,var(--color-base)_85%,transparent)] outline-none md:items-center md:p-6"
    >
      <div
        ref={sheetRef}
        className="flex h-full w-full flex-col overflow-y-auto border border-border bg-surface shadow-xl md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4 md:px-8">
          <div className="min-w-0">
            <p className="m-0 text-sm text-text-muted">{project.context}</p>
            <h2 id={titleId} className="m-0 mt-1 font-heading text-xl leading-tight font-bold text-text md:text-2xl">
              {project.title}
            </h2>
            {project.badge ? (
              <span className="mt-2 inline-flex rounded-sm border border-accent-violet px-2 py-0.5 font-mono text-xs font-semibold text-accent-violet-text">
                {project.badge}
              </span>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={work.dialog.closeLabel}
            onClick={onClose}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong text-text transition-colors hover:bg-surface-2 hover:text-accent-cyan-text"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 py-6 md:px-8">
          {project.challenge ? (
            <DetailSection title={work.dialog.challenge}>
              <p className="m-0 max-w-prose leading-relaxed text-text">{project.challenge}</p>
            </DetailSection>
          ) : null}

          <DetailSection title={work.dialog.approach}>
            <p className="m-0 max-w-prose leading-relaxed text-text">{project.approach}</p>
          </DetailSection>

          {project.outcome ? (
            <DetailSection title={work.dialog.outcome}>
              <p className="m-0 max-w-prose leading-relaxed text-text">{project.outcome}</p>
            </DetailSection>
          ) : null}

          {project.tech.length > 0 ? (
            <DetailSection title={work.dialog.tech}>
              <ul aria-label={work.dialog.techLabel} className="m-0 flex list-none flex-wrap gap-2 p-0">
                {project.tech.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-full border border-border-strong bg-surface-2 px-3 py-1 font-mono text-xs text-text"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}

          {project.diagram ? (
            <DetailSection title={project.diagram.kind === "dependency" ? project.diagram.caption : project.diagram.title}>
              <ProjectDiagram diagram={project.diagram} />
            </DetailSection>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
