// Terminal_Widget command logic (Req 24.2–24.5, 24.7–24.10). Pure TypeScript, no DOM.
//
// Every response is generated from the Content_Config passed in a `TerminalContext`, so the
// terminal never drifts from what the page shows and can be property-tested against generated
// content. Inputs are normalized (trimmed + lower-cased) before dispatch, and the unknown-command
// message echoes the normalized command (design interpretation note 1), so Req 24.5 holds for all
// inputs.

import { certifications } from "../data/certifications";
import { contact } from "../data/contact";
import { intro } from "../data/intro";
import { projects } from "../data/projects";
import { skills } from "../data/skills";
import { terminal } from "../data/terminal";
import {
  isPlaceholder,
  type CaseStudy,
  type Certification,
  type ContactLinks,
  type SkillsConfig,
  type TerminalCommand,
  type TerminalConfig,
  type TerminalEntry,
} from "../data/types";
import { withBase } from "./url";

/** The seven supported commands, in the order `help` and the unknown-command message list them. */
export const TERMINAL_COMMANDS = [
  "whoami",
  "skills",
  "projects",
  "certs",
  "contact",
  "help",
  "clear",
] as const satisfies readonly TerminalCommand[];

/** Default number of entries the output history keeps (Req 24.2). */
export const DEFAULT_MAX_HISTORY = 50;

/** Everything the commands read. Only the fields each command needs, so tests can generate it. */
export interface TerminalContext {
  config: Pick<TerminalConfig, "help" | "unknown">;
  /** `whoami` (Req 24.3). */
  owner: { name: string; role: string };
  /** `skills`: every cluster with its skills. */
  skills: SkillsConfig;
  /** `projects`: every Case_Study title. */
  projects: readonly Pick<CaseStudy, "title">[];
  /** `certs`: every Certification_Card name. */
  certifications: readonly Pick<Certification, "name">[];
  /** `contact`: email, LinkedIn, GitHub and resume PDF links (shared with Contact and Footer). */
  links: ContactLinks;
  /** Whether the resume PDF is present at build time (Req 9.10); false prints it as pending. */
  resumeAvailable: boolean;
  /** Turns a site-relative path (the resume PDF) into the served URL, e.g. `withBase`. */
  resolvePath: (path: string) => string;
}

/** Result of one submission, applied to the history by `historyReducer`. */
export type TerminalAction =
  /** A supported command other than `clear`, or an unknown command (Req 24.2, 24.4). */
  | { type: "append"; command: string; output: readonly string[] }
  /** `clear` (Req 24.10). */
  | { type: "clear" }
  /** Blank or whitespace-only input (Req 24.8). */
  | { type: "noop" };

/** Text printed for a contact link the Owner has not supplied yet. */
export const PENDING_LINK_TEXT = "not yet available";

/** Trims leading/trailing whitespace and lower-cases the input (Req 24.5). */
export function normalizeCommand(input: string): string {
  return input.trim().toLowerCase();
}

/** Type guard for the seven supported commands. */
export function isTerminalCommand(value: string): value is TerminalCommand {
  return (TERMINAL_COMMANDS as readonly string[]).includes(value);
}

/** Lines printed by each command that appends output. */
function commandOutput(command: Exclude<TerminalCommand, "clear">, ctx: TerminalContext): readonly string[] {
  switch (command) {
    case "whoami":
      return [ctx.owner.name, ctx.owner.role];
    case "skills": {
      const names = new Map(ctx.skills.skills.map((s) => [s.id, s.name] as const));
      return ctx.skills.clusters.map(
        (cluster) => `${cluster.name}: ${cluster.skills.map((id) => names.get(id) ?? id).join(", ")}`,
      );
    }
    case "projects":
      return ctx.projects.map((p) => `- ${p.title}`);
    case "certs":
      return ctx.certifications.map((c) => `- ${c.name}`);
    case "contact": {
      const { email, linkedin, github, resumePdf } = ctx.links;
      const resume =
        isPlaceholder(resumePdf) || !ctx.resumeAvailable ? PENDING_LINK_TEXT : ctx.resolvePath(resumePdf);
      return [
        `email: ${email.replace(/^mailto:/, "")}`,
        `linkedin: ${isPlaceholder(linkedin) ? PENDING_LINK_TEXT : linkedin}`,
        `github: ${isPlaceholder(github) ? PENDING_LINK_TEXT : github}`,
        `resume: ${resume}`,
      ];
    }
    case "help":
      return TERMINAL_COMMANDS.map((c) => `${c} - ${ctx.config.help[c]}`);
  }
}

/**
 * Dispatches one submitted input. Blank input is a `noop`, `clear` clears, and every other input
 * appends an entry whose `command` is the normalized input. Depends only on `normalizeCommand(input)`.
 */
export function runCommand(input: string, ctx: TerminalContext): TerminalAction {
  const command = normalizeCommand(input);
  if (command === "") return { type: "noop" };
  if (isTerminalCommand(command)) {
    if (command === "clear") return { type: "clear" };
    return { type: "append", command, output: commandOutput(command, ctx) };
  }
  return { type: "append", command, output: [ctx.config.unknown(command, TERMINAL_COMMANDS)] };
}

/**
 * Applies an action to the output history: `append` adds one entry at the end and drops the oldest
 * entries beyond `max` (Req 24.2), `clear` empties it (Req 24.10), `noop` returns `h` unchanged
 * (Req 24.8). Earlier entries are never modified (Req 24.4). Ids increase by one per appended
 * entry, so they stay unique within a history and are usable as React keys.
 */
export function historyReducer(
  h: readonly TerminalEntry[],
  a: TerminalAction,
  max: number = DEFAULT_MAX_HISTORY,
): readonly TerminalEntry[] {
  switch (a.type) {
    case "noop":
      return h;
    case "clear":
      return h.length === 0 ? h : [];
    case "append": {
      const id = h.length === 0 ? 0 : h[h.length - 1].id + 1;
      const next = [...h, { id, command: a.command, output: a.output }];
      return next.length > max ? next.slice(next.length - Math.max(0, max)) : next;
    }
  }
}

/** The context the page uses, built from the Content_Config files. */
export const defaultTerminalContext: TerminalContext = {
  config: terminal,
  owner: { name: intro.name, role: intro.titleLine },
  skills,
  projects,
  certifications,
  links: contact.links,
  resumeAvailable: typeof __RESUME_AVAILABLE__ !== "undefined" && __RESUME_AVAILABLE__,
  resolvePath: (path) => withBase(path),
};
