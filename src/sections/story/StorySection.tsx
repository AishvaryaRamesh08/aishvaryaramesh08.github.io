// Story_Section — "Why I love data". Its heading and anchor come from `SectionShell`.
import { TerminalQuote } from "./TerminalQuote";

/** Story_Section body: the pull quote, rendered verbatim. */
export default function StorySection() {
  return <div data-section-body="story"><TerminalQuote /></div>;
}
