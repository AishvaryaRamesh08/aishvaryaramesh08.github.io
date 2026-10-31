import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { terminal } from "../../data/terminal";
import type { TerminalEntry } from "../../data/types";
import { cx } from "../../lib/cx";
import {
  defaultTerminalContext,
  historyReducer,
  normalizeCommand,
  runCommand,
  TERMINAL_COMMANDS,
  type TerminalContext,
} from "../../lib/terminal";
import { scrollToSection } from "../../lib/scrollToSection";

export interface TerminalWidgetProps {
  context?: TerminalContext;
  maxHistory?: number;
}

export function TerminalWidget({ context = defaultTerminalContext, maxHistory = terminal.maxHistory }: TerminalWidgetProps) {
  const [history, setHistory] = useState<readonly TerminalEntry[]>([]);
  const [value, setValue] = useState("");
  const [entered, setEntered] = useState<readonly string[]>([]);
  const [recall, setRecall] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [history]);

  const append = useCallback(
    (command: string, output: TerminalEntry["output"]) => {
      setHistory((previous) =>
        historyReducer(previous, { type: "append", command, output }, maxHistory),
      );
    },
    [maxHistory],
  );

  const execute = useCallback(
    (command: string) => {
      const action = runCommand(command, context);
      if (action.type === "noop") return;
      if (action.type === "clear") {
        setHistory((previous) => historyReducer(previous, action, maxHistory));
        return;
      }

      append(action.command, action.output);
      if (action.navigateTo) void scrollToSection(action.navigateTo);
      if (["resume", "cv"].includes(normalizeCommand(command))) {
        const resumeLink = action.output.find((line): line is { text: string; href: string } =>
          typeof line !== "string" && Boolean(line.href),
        );
        if (resumeLink) window.open(resumeLink.href, "_blank", "noopener,noreferrer");
      }
    },
    [append, context, maxHistory],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const submitted = value.trim();
      if (!submitted) return;
      execute(submitted);
      setValue("");
      setEntered((previous) => [...previous, submitted]);
      setRecall(null);
    },
    [execute, value],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setHistory((previous) => historyReducer(previous, { type: "clear" }, maxHistory));
        setValue("");
        setRecall(null);
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        append(value, [context.config.interruptOutput]);
        if (value.trim()) setEntered((previous) => [...previous, value.trim()]);
        setValue("");
        setRecall(null);
        return;
      }

      if (event.key === "Tab") {
        const prefix = value.trim().toLowerCase();
        const match = prefix ? TERMINAL_COMMANDS.find((command) => command.startsWith(prefix)) : undefined;
        if (match && match !== prefix) {
          event.preventDefault();
          setValue(match);
          setRecall(null);
        }
        return;
      }

      if (entered.length === 0) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const next = recall === null ? entered.length - 1 : Math.max(0, recall - 1);
        setRecall(next);
        setValue(entered[next]);
      } else if (event.key === "ArrowDown" && recall !== null) {
        event.preventDefault();
        const next = recall + 1;
        if (next >= entered.length) {
          setRecall(null);
          setValue("");
        } else {
          setRecall(next);
          setValue(entered[next]);
        }
      }
    },
    [append, context.config.interruptOutput, entered, maxHistory, recall, value],
  );

  const focusInput = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    // The accessible input is the keyboard control; this container only offers pointer-to-focus convenience.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      ref={rootRef}
      className="h-[300px] min-w-0 w-full overflow-hidden rounded-xl border border-border bg-[var(--terminal-bg)] lg:h-[clamp(300px,42vh,400px)]"
      onClick={focusInput}
    >
      <div className="flex h-8 items-center gap-2 border-b border-border px-3 font-mono text-xs text-[var(--terminal-muted)]">
        <span aria-hidden="true" className="size-2 rounded-full bg-[var(--terminal-muted)]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[var(--terminal-muted)]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[var(--terminal-muted)]" />
        <span className="ml-1">{context.config.windowLabel}</span>
      </div>

      <div
        ref={outputRef}
        role="log"
        aria-live="polite"
        aria-label={context.config.outputLabel}
        className="flex h-[calc(100%-2rem)] min-h-0 flex-col overflow-y-auto overscroll-contain px-3 py-2 font-mono text-sm leading-[1.5] text-[var(--terminal-fg)]"
      >
        <div className="shrink-0 text-[var(--terminal-muted)]">
          {context.config.banner.map((line) => (
            <p key={line} className="m-0">
              {line}
            </p>
          ))}
        </div>

        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {history.map((entry) => (
            <li key={entry.id} className="min-w-0 whitespace-pre-wrap break-words">
              <p className="m-0 text-[var(--terminal-prompt)]">
                {context.config.prompt} {entry.command}
              </p>
              {entry.output.map((line, index) => {
                const outputLine = typeof line === "string" ? undefined : line;
                const text = typeof line === "string" ? line : line.text;
                return (
                  <p
                    key={`${entry.id}-${index}`}
                    className={cx(
                      "m-0 break-words",
                      outputLine?.title ? "font-semibold text-[var(--terminal-fg)]" : "text-[var(--terminal-muted)]",
                    )}
                  >
                    {outputLine?.href ? (
                      <a
                        href={outputLine.href}
                        target={outputLine.href.startsWith("http") ? "_blank" : undefined}
                        rel={outputLine.href.startsWith("http") ? "noreferrer" : undefined}
                        className="break-all text-[var(--terminal-fg)] underline underline-offset-2 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--terminal-prompt)]"
                      >
                        {text}
                      </a>
                    ) : (
                      text
                    )}
                  </p>
                );
              })}
            </li>
          ))}
        </ol>

        <form onSubmit={handleSubmit} className="mt-auto flex min-w-0 shrink-0 items-center gap-2">
          <label htmlFor={inputId} className="shrink-0 whitespace-nowrap text-[var(--terminal-prompt)]">
            <span className="sr-only">{context.config.inputLabel}: </span>
            <span aria-hidden="true">{context.config.prompt}</span>
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={value}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={context.config.inputLabel}
            className="terminal-input min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[16px] leading-[1.5] text-[var(--terminal-fg)] outline-none lg:text-[14px]"
            onChange={(event) => {
              setValue(event.target.value);
              setRecall(null);
            }}
            onKeyDown={handleKeyDown}
          />
        </form>
      </div>
    </div>
  );
}
