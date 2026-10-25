// Business and systems analysis (Req 16). The section shows analysis-practice cards, Texas A&M
// coursework and the Product@TAMU team case challenge. The h2 and anchor come from SectionShell.
import { Chip } from "../../components/Chip";
import { GlassCard } from "../../components/GlassCard";
import { analysis } from "../../data/analysis";
import { analysisCopy } from "./copy";

/**
 * Analysis_Section body. SSR-safe: it renders static content from the Content_Config.
 */
export default function AnalysisSection() {
  return (
    <div data-section-body="analysis" className="flex flex-col gap-12">
      {/* Five analysis-practice cards (Req 16.1). */}
      <div className="flex flex-col gap-4">
        <h3 className="font-heading text-xl font-semibold text-text">{analysisCopy.practicesHeading}</h3>
        <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.items.map((item) => (
            <GlassCard as="li" key={item.title} className="flex flex-col gap-2 p-5">
              <h4 className="font-heading text-base font-semibold text-text">{item.title}</h4>
              <p className="text-sm leading-relaxed text-text-muted">{item.description}</p>
            </GlassCard>
          ))}
        </ul>
      </div>

      {/* Coursework and the team case challenge as visible text (Req 16.4, 16.5). */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-xl font-semibold text-text">{analysisCopy.coursesHeading}</h3>
          <ul className="flex flex-wrap gap-2 p-0">
            {analysis.courses.map((course) => (
              <li key={course} className="list-none">
                <Chip tone="cyan">{course}</Chip>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-heading text-xl font-semibold text-text">{analysisCopy.caseChallengeHeading}</h3>
          <p className="text-text-muted">{analysis.caseChallenge}</p>
        </div>
      </div>
    </div>
  );
}
