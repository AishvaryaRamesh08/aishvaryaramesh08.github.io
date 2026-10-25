import { cx } from "../lib/cx";

export interface CodeBlockProps {
  code: string;
  /** Accessible name of the scrollable region, e.g. the artifact caption. */
  label: string;
  className?: string;
}

/**
 * `<pre><code>` in JetBrains Mono with `white-space: pre`. Long lines scroll horizontally inside
 * the block only, never the page, and the block is focusable so keyboard users can scroll it
 * (Req 20.7, 20.10).
 */
export function CodeBlock({ code, label, className }: CodeBlockProps) {
  return (
    <pre
      role="region"
      aria-label={label}
      // A scrollable region must be keyboard reachable (WCAG 2.1.1).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className={cx(
        "max-w-full overflow-x-auto rounded-md border border-border bg-surface p-4 font-mono text-sm leading-6 whitespace-pre text-text",
        className,
      )}
    >
      <code>{code}</code>
    </pre>
  );
}
