// Intro_Screen typewriter line (Req 9.2, 9.3, 9.11). Motion on: one line cycles through the three
// phrases via `useTypewriter`, shown in an `aria-hidden` span with a blinking caret; the three full
// lines are also rendered `sr-only` so assistive tech reads complete static text and never the
// per-character typing (Req 9.11). Reduced motion: the three lines render as plain static text with
// no caret or animation (Req 9.3), and the sr-only copy is dropped to avoid a duplicate reading.
import { useMotionMode } from "../../hooks/motionStore";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import { useTypewriter } from "./useTypewriter";

export interface TypewriterProps {
  lines: readonly [string, string, string];
}

export function Typewriter({ lines }: TypewriterProps) {
  const reduced = useMotionMode() === "reduced";

  if (reduced) {
    // Three static lines in order, each read once (Req 9.3).
    return (
      <ul className="m-0 flex list-none flex-col gap-1 p-0 font-mono text-lg text-accent-cyan-text">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    );
  }

  return <AnimatedTypewriter lines={lines} />;
}

function AnimatedTypewriter({ lines }: TypewriterProps) {
  const { text } = useTypewriter(lines);

  return (
    <p className="m-0 min-h-[1.75rem] font-mono text-lg text-accent-cyan-text">
      {/* Visual-only: the animated characters are hidden from the accessibility tree (Req 9.11). */}
      <span aria-hidden="true">
        {text}
        <span className="ml-0.5 inline-block w-[1px] motion-safe:animate-pulse" aria-hidden="true">
          |
        </span>
      </span>
      {/* Complete static lines for screen readers (Req 9.11). */}
      <VisuallyHidden>{lines.join(". ")}</VisuallyHidden>
    </p>
  );
}
