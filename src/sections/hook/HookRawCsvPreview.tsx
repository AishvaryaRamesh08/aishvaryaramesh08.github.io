import { hookRawData } from "../../data/hookRawData";

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the horizontally scrollable region needs keyboard focus. */
export function HookRawCsvPreview() {
  return (
    <div
      aria-label="Scrollable raw CSV preview"
      className="w-full min-w-0 overflow-x-auto rounded-card border border-border bg-surface"
      data-testid="hook-raw-data-scroll"
      role="region"
      tabIndex={0}
    >
      <p className="border-b border-border px-3 py-2 font-semibold text-text">Raw data</p>
      <pre className="m-0 min-w-max px-3 py-3 font-mono text-[10px] leading-5 text-text sm:text-xs">
        <code>{hookRawData.csv}</code>
      </pre>
    </div>
  );
}
