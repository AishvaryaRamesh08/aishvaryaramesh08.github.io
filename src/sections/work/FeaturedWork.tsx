// Featured work (Req 12). A responsive grid of seven `CaseStudyCard`s in `projects.ts` order; a
// single disclosure group keeps at most one card expanded at a time (Req 12.2), and because the
// cards' triggers are native buttons that never move focus, collapsing leaves focus on the card
// (Req 12.6). The heading and anchor come from `SectionShell`, so they are prerendered (Req 3.2,
// 3.3); this body renders no heading of its own.
//
// SSR-safe: the disclosure group starts with everything collapsed and every panel stays mounted
// (hidden), so the server and the first client render produce the same DOM.
import { useDisclosureGroup } from "../../components/Disclosure";
import { projects } from "../../data/projects";
import { CaseStudyCard } from "./CaseStudyCard";

export default function FeaturedWork() {
  // One group over all cards keeps "at most one expanded" by construction (Property 27).
  const group = useDisclosureGroup<string>();

  return (
    <div data-section-body="work">
      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <CaseStudyCard
            key={project.id}
            project={project}
            expanded={group.isExpanded(project.id)}
            onToggle={() => group.toggle(project.id)}
            // Task 12.6 passes the DependencyDemo for the `dependency-demo` card; until then the
            // card shows a labelled placeholder in the demo slot.
          />
        ))}
      </ul>
    </div>
  );
}
