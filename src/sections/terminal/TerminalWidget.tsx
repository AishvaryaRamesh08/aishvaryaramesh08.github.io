// Terminal_Widget (Req 24.1–24.11). An accessible, interactive terminal whose command logic lives
// in the pure functions of `src/lib/terminal.ts` (`runCommand` → `historyReducer`), so rendering
// stays a thin shell over property-tested logic (design D5).
//
// Accessibility:
//  - A labelled single-line `<input>` inside a `<form onSubmit>`; Enter submits (Req 24.1).
//  - An `<ol>` output history, each entry showing the submitted command after the prompt symbol
//    followed by its response lines (Req 24.2).
//  - A separate polite live region that holds ONLY the latest response, so assistive tech hears
//    the new output without re-announcing earlier entries (Req 24.6).
//
// Focus: on blank/whitespace input (noop) and on `clear`, focus stays in the input and the input
// is cleared (Req 24.8, 24.10). Up/Down recall previously entered commands from an input-history
// list kept here — the output `historyReducer` does no recall.
//
// SSR-safe: the initial state is a deterministic empty history and empty live region, so the
// prerendered HTML matches the first client render. No phone number can appear: every line comes
// from `runCommand`, which never emits one (Req 24.7, enforced by Property 18).
import { useCallback, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import {
  defaultTerminalContext,
  historyReducer,
  runCommand,
  type TerminalContext,
} from "../../lib/terminal";
import { terminal } from "../../data/terminal";
import type { TerminalEntry } from "../../data/types";

export interface TerminalWidgetProps {
  /** Command context; defaults to the page's Content_Config-derived context. Injectable for tests. */
  context?: TerminalContext;
  /** Max entries kept in the output history (Req 24.2); defaults to the configured `maxHistory`. */
  maxHistory?: number;
}

/**
 * The interactive terminal. State:
 *  - `history`: the output `<ol>` entries, capped by `historyReducer`.
 *  - `latestResponse`: the response lines of the most recent append, shown in the live region
 *    only (never the whole log), so each new response is announced once (Req 24.6).
 *  - `entered`: the list of non-blank commands the Visitor has submitted, for Up/Down recall.
 *  - `recall`: index into `entered` while arrowing, or `null` when typing fresh input.
 */
export function TerminalWidget({ context = defaultTerminalContext, maxHistory = terminal.maxHistory }: TerminalWidgetProps) {
  const [history, setHistory] = useState<readonly TerminalEntry[]>([]);
  const [latestResponse, setLatestResponse] = useState<readonly string[]>([]);
  const [value, setValue] = useState("");
  const [entered, setEntered] = useState<readonly string[]>([]);
  const [recall, setRecall] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const logId = useId();

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const submitted = value;
      const action = runCommand(submitted, context);

      // Blank/whitespace input: add nothing, keep and clear focus in the input (Req 24.8).
      if (action.type === "noop") {
        setValue("");
        setRecall(null);
        focusInput();
        return;
      }

      // `clear`: empty the output history and the live region, clear and keep focus (Req 24.10).
      if (action.type === "clear") {
        setHistory((prev) => historyReducer(prev, action, maxHistory));
        setLatestResponse([]);
        setValue("");
        setEntered((prev) => [...prev, submitted.trim()]);
        setRecall(null);
        focusInput();
        return;
      }

      // Any command (supported or unknown): append one entry and announce only its response.
      setHistory((prev) => historyReducer(prev, action, maxHistory));
      setLatestResponse(action.output);
      setValue("");
      setEntered((prev) => [...prev, submitted.trim()]);
      setRecall(null);
      focusInput();
    },
    [value, context, maxHistory, focusInput],
  );

  // Up/Down recall walks the input-history list (most recent last). Up moves toward older
  // commands, Down toward newer; past the newest returns to a blank, freshly-typed input.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (entered.length === 0) return;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const next = recall === null ? entered.length - 1 : Math.max(0, recall - 1);
        setRecall(next);
        setValue(entered[next]);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (recall === null) return;
        const next = recall + 1;
        if (next >= entered.length) {
          setRecall(null);
          setValue("");
          return;
        }
        setRecall(next);
        setValue(entered[next]);
      }
    },
    [entered, recall],
  );

  return (
    <div className="rounded-md border border-border bg-surface p-4 font-mono text-sm leading-6 text-text">
      {/* Output history. Role="log" + polite so new entries are in a live container, but the
          dedicated region below carries only the newest response to avoid re-announcing. */}
      <ol
        id={logId}
        role="log"
        aria-label="Terminal output"
        aria-live="off"
        className="m-0 flex list-none flex-col gap-3 p-0"
      >
        {history.map((entry) => (
          <li key={entry.id} className="whitespace-pre-wrap">
            <p className="m-0">
              <span className="text-accent-green-text">{terminal.prompt}</span>{" "}
              <span>{entry.command}</span>
            </p>
            {entry.output.map((line, index) => (
              // Output lines are a fixed ordered list for this entry; index keys are stable here.
              <p key={index} className="m-0 text-text-muted">
                {line}
              </p>
            ))}
          </li>
        ))}
      </ol>

      {/* Polite live region: only the latest response, announced once (Req 24.6). Visually hidden
          because the same text is already shown in the <ol> above. */}
      <div aria-live="polite" className="sr-only">
        {latestResponse.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={cx("mt-3 flex items-center gap-2", history.length === 0 && "mt-0")}>
        <label htmlFor={inputId} className="shrink-0 text-accent-green-text">
          <span className="sr-only">{terminal.inputLabel}: </span>
          <span aria-hidden="true">{terminal.prompt}</span>
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={value}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={terminal.inputLabel}
          aria-controls={logId}
          placeholder={terminal.inputLabel}
          onChange={(event) => {
            setValue(event.target.value);
            setRecall(null);
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-sm text-text outline-none placeholder:text-text-muted"
        />
      </form>
    </div>
  );
}
