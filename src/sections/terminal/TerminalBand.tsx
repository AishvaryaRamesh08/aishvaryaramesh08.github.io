// Retained legacy wrapper; it is not included in the section registry. The current compact
// command/search widget is rendered inside the Hero by IntroScreen.
import { TerminalWidget } from "./TerminalWidget";

/** Legacy standalone body, intentionally left unmounted. */
export default function TerminalBand() {
  return (
    <div data-section-body="terminal">
      <TerminalWidget />
    </div>
  );
}
