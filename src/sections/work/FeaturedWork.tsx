import { useRef, useState } from "react";
import { work, type FeaturedWorkItem } from "../../data/work";
import { cx } from "../../lib/cx";
import { WorkDialog } from "./WorkDialog";

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 transition-transform group-hover:translate-x-1"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

function FeaturedCard({
  project,
  onOpen,
}: {
  project: FeaturedWorkItem;
  onOpen: (project: FeaturedWorkItem, trigger: HTMLButtonElement) => void;
}) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={(event) => onOpen(project, event.currentTarget)}
        className={cx(
          "group flex h-full min-h-[18rem] w-full cursor-pointer flex-col items-start rounded-xl border border-border bg-surface p-5 text-left",
          "transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-accent-cyan hover:bg-surface-2",
          "active:translate-y-0 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-base",
        )}
      >
        <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-heading text-lg font-semibold leading-snug text-text">{project.title}</span>
          {project.badge ? (
            <span className="rounded-sm border border-accent-violet px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-accent-violet-text">
              {project.badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 text-sm text-text-muted">{project.context}</span>
        <span className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-muted">{project.summary}</span>
        {project.tech.length ? (
          <span className="mt-4 flex flex-wrap gap-1.5">
            {project.tech.map((item) => (
              <span
                key={item.id}
                className="rounded-full border border-border px-2 py-0.5 font-mono text-[0.65rem] text-text-muted"
              >
                {item.label}
              </span>
            ))}
          </span>
        ) : null}
        <span className="mt-auto flex min-h-11 w-full items-end justify-between pt-4 text-sm font-medium text-accent-cyan-text">
          <span>{work.dialog.viewDetails}</span>
          <ArrowIcon />
        </span>
      </button>
    </li>
  );
}

export default function FeaturedWork() {
  const [selectedProject, setSelectedProject] = useState<FeaturedWorkItem | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openProject = (project: FeaturedWorkItem, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setSelectedProject(project);
  };

  return (
    <div data-section-body="work" className="flex flex-col gap-10">
      <ul className="m-0 grid list-none grid-cols-1 items-stretch gap-4 p-0 sm:grid-cols-2 sm:gap-5">
        {work.featured.map((project) => (
          <FeaturedCard key={project.id} project={project} onOpen={openProject} />
        ))}
      </ul>

      <section aria-labelledby="more-projects-heading">
        <h3 id="more-projects-heading" className="mb-3 font-heading text-lg font-semibold text-text">
          {work.dialog.moreProjects}
        </h3>
        <ul className="m-0 divide-y divide-border rounded-lg border border-border p-0">
          {work.moreProjects.map((project) => (
            <li key={project.title} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-2">
              <p className="m-0 min-w-0 text-sm leading-relaxed text-text">
                <span className="font-semibold">{project.title}</span>
                {project.context ? <span className="text-text-muted"> ({project.context})</span> : null}
                <span className="text-text-muted">: {project.description}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {selectedProject ? (
        <WorkDialog
          project={selectedProject}
          returnFocusTo={triggerRef}
          onClose={() => setSelectedProject(null)}
        />
      ) : null}
    </div>
  );
}
