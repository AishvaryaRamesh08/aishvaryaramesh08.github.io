// Terminal_Band (Req 24.11). The section heading and anchor come from `SectionShell`
// (`site.sections.terminal.heading`, which reads `terminal.heading`), so they are prerendered
// (Req 3.2, 3.3). This body renders the single `TerminalWidget` on the page: there is no floating
// launcher or any other instance elsewhere (Req 24.11), and the widget is imported only here.
import { TerminalWidget } from "./TerminalWidget";

/** Terminal_Band body: the one interactive Terminal_Widget, placed between Certifications and Journey. */
export default function TerminalBand() {
  return (
    <div data-section-body="terminal">
      <TerminalWidget />
    </div>
  );
}
