import { certifications } from "../data/certifications";
import { contact } from "../data/contact";
import { intro } from "../data/intro";
import { skills } from "../data/skills";
import { terminal } from "../data/terminal";
import { work, type FeaturedWorkItem } from "../data/work";
import {
  isPlaceholder,
  type Certification,
  type ContactLinks,
  type SectionId,
  type SkillsConfig,
  type TerminalCommand,
  type TerminalConfig,
  type TerminalEntry,
  type TerminalOutputLine,
  type TerminalSearchEntry,
} from "../data/types";
import { withBase } from "./url";

export const TERMINAL_COMMANDS = [
  "whoami",
  "experience",
  "education",
  "skills",
  "projects",
  "certs",
  "contact",
  "resume",
  "help",
  "goto",
  "clear",
] as const satisfies readonly TerminalCommand[];

export const DEFAULT_MAX_HISTORY = 50;

export interface TerminalContext {
  config: TerminalConfig;
  skills: SkillsConfig;
  projects: readonly Pick<FeaturedWorkItem, "title" | "summary" | "context" | "tech">[];
  certifications: readonly Pick<Certification, "issuer" | "name" | "description">[];
  links: ContactLinks;
  resumeUrl: string;
  resolvePath: (path: string) => string;
  searchIndex: readonly TerminalSearchEntry[];
}

type SearchIndexSource = Omit<TerminalContext, "searchIndex" | "resolvePath" | "resumeUrl">;

export type TerminalAction =
  | { type: "append"; command: string; output: readonly (string | TerminalOutputLine)[]; navigateTo?: SectionId }
  | { type: "clear" }
  | { type: "noop" };

export function normalizeCommand(input: string): string {
  return input.trim().toLowerCase();
}

export function normalizeSearchText(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/\ba\s*&\s*m\b/g, "am")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isTerminalCommand(value: string): value is TerminalCommand {
  return (TERMINAL_COMMANDS as readonly string[]).includes(value);
}

function emailOutput(email: string): TerminalOutputLine | undefined {
  const address = email.replace(/^mailto:/i, "").trim();
  const separator = address.lastIndexOf("@");
  if (!address || separator <= 0 || separator === address.length - 1) return undefined;
  const localPart = address.slice(0, separator);
  const domainPart = address.slice(separator + 1);
  return { text: `${localPart}@${domainPart}`, href: `mailto:${localPart}@${domainPart}` };
}

function contactOutput(ctx: TerminalContext): TerminalOutputLine[] {
  const output: TerminalOutputLine[] = [];
  const email = emailOutput(ctx.links.email);
  if (email) output.push({ text: `${ctx.config.contactLabels.email}: ${email.text}`, href: email.href });
  if (!isPlaceholder(ctx.links.linkedin)) {
    output.push({ text: `${ctx.config.contactLabels.linkedin}: ${ctx.links.linkedin}`, href: ctx.links.linkedin });
  }
  if (!isPlaceholder(ctx.links.github)) {
    output.push({ text: `${ctx.config.contactLabels.github}: ${ctx.links.github}`, href: ctx.links.github });
  }
  return output;
}

function contactSearchEntries(ctx: SearchIndexSource): TerminalSearchEntry[] {
  const entries: TerminalSearchEntry[] = [];
  const email = emailOutput(ctx.links.email);
  if (email) {
    entries.push({
      title: ctx.config.contactLabels.email,
      text: email.text,
      keywords: [ctx.config.contactLabels.email, email.text],
      section: "contact",
      href: email.href,
    });
  }
  if (!isPlaceholder(ctx.links.linkedin)) {
    entries.push({
      title: ctx.config.contactLabels.linkedin,
      text: ctx.links.linkedin,
      keywords: [ctx.config.contactLabels.linkedin, ctx.links.linkedin],
      section: "contact",
      href: ctx.links.linkedin,
    });
  }
  if (!isPlaceholder(ctx.links.github)) {
    entries.push({
      title: ctx.config.contactLabels.github,
      text: ctx.links.github,
      keywords: [ctx.config.contactLabels.github, ctx.links.github],
      section: "contact",
      href: ctx.links.github,
    });
  }
  return entries;
}

export function buildSearchIndex(source: SearchIndexSource): readonly TerminalSearchEntry[] {
  const skillName = new Map(source.skills.skills.map((skill) => [skill.id, skill.name] as const));
  const experiences = source.config.experience.map((text) => ({
    title: text.split(",")[0],
    text,
    keywords: [text],
    section: "journey" as const,
  }));
  const education = source.config.education.map((text) => ({
    title: text.split(",")[0],
    text,
    keywords: [text],
    section: "journey" as const,
  }));
  const skillClusters = source.skills.clusters.map((cluster) => {
    const names = cluster.skills.map((id) => skillName.get(id) ?? id);
    return {
      title: cluster.name,
      text: names.join(", "),
      keywords: [cluster.name, ...names],
      section: "skills" as const,
    };
  });
  const projects = source.projects.map((project) => ({
    title: project.title,
    text: project.summary,
    keywords: [project.context ?? "", ...project.tech.map((item) => item.label)],
    section: "work" as const,
  }));
  const certs = source.certifications.map((cert) => ({
    title: `${cert.issuer}, ${cert.name}`,
    text: cert.description,
    keywords: [cert.issuer, cert.name],
    section: "skills" as const,
  }));

  return [...experiences, ...education, ...skillClusters, ...projects, ...certs, ...contactSearchEntries(source)];
}

function outputFor(command: Exclude<TerminalCommand, "goto" | "clear">, ctx: TerminalContext) {
  switch (command) {
    case "whoami":
      return [ctx.config.whoami];
    case "experience":
      return ctx.config.experience;
    case "education":
      return ctx.config.education;
    case "skills": {
      const names = new Map(ctx.skills.skills.map((skill) => [skill.id, skill.name] as const));
      return ctx.skills.clusters.map(
        (cluster) => `${cluster.name}: ${cluster.skills.map((id) => names.get(id) ?? id).join(", ")}`,
      );
    }
    case "projects":
      return [...ctx.projects.map((project) => `- ${project.title}`), ctx.config.projectsHint];
    case "certs":
      return ctx.certifications.map((cert) => `- ${cert.issuer}, ${cert.name}`);
    case "contact":
      return contactOutput(ctx);
    case "resume":
      return ctx.resumeUrl.trim()
        ? [{ text: ctx.resolvePath(ctx.resumeUrl), href: ctx.resolvePath(ctx.resumeUrl) }]
        : [ctx.config.resumeUnavailable];
    case "help":
      return TERMINAL_COMMANDS.map((item) => `${item} - ${ctx.config.help[item]}`);
  }
}

function search(input: string, ctx: TerminalContext): readonly (string | TerminalOutputLine)[] {
  const stopWords = new Set(ctx.config.stopWords);
  const tokens = normalizeSearchText(input).filter((token) => !stopWords.has(token));
  if (tokens.length === 0) return [ctx.config.noResults(input)];

  const ranked = ctx.searchIndex
    .map((entry, index) => {
      const titleTokens = normalizeSearchText(entry.title);
      const keywordTokens = normalizeSearchText(entry.keywords.join(" "));
      const textTokens = normalizeSearchText(entry.text);
      let score = 0;
      let matchedTokens = 0;

      for (const token of tokens) {
        const weight = (words: readonly string[], exact: number, prefix: number) =>
          words.some((word) => word === token) ? exact : words.some((word) => word.startsWith(token)) ? prefix : 0;
        const tokenScore = Math.max(
          weight(titleTokens, 6, 3),
          weight(keywordTokens, 4, 2),
          weight(textTokens, 2, 1),
        );
        if (tokenScore > 0) {
          score += tokenScore;
          matchedTokens++;
        }
      }

      return { entry, index, score: matchedTokens === 0 ? 0 : score / tokens.length };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3);

  if (ranked.length === 0) return [ctx.config.noResults(input)];
  return ranked.flatMap(({ entry }, index) => [
    { text: ctx.config.resultTitle(index + 1, entry.title), title: true },
    entry.href ? { text: entry.text, href: entry.href } : entry.text,
    ...(entry.section ? [`${ctx.config.gotoHint} ${entry.section}`] : []),
  ]);
}

export function runCommand(input: string, ctx: TerminalContext): TerminalAction {
  const normalized = normalizeCommand(input);
  if (!normalized) return { type: "noop" };
  if (normalized === "clear") return { type: "clear" };

  if (normalized === "goto" || normalized.startsWith("goto ")) {
    const target = normalized.slice("goto".length).trim();
    const destinations = ["work", "skills", "journey", "contact"] as const satisfies readonly SectionId[];
    const destination = destinations.find((item) => item === target);
    if (destination) {
      return {
        type: "append",
        command: normalized,
        output: [ctx.config.gotoConfirmation(target)],
        navigateTo: destination,
      };
    }
    return { type: "append", command: normalized, output: [ctx.config.gotoUnknown(target || "section")] };
  }

  const aliasQuery = normalizeSearchText(normalized).join(" ");
  const command = ctx.config.aliases[aliasQuery] ?? normalized;
  if (isTerminalCommand(command)) {
    return { type: "append", command: normalized, output: outputFor(command, ctx) };
  }

  const output = search(normalized, ctx);
  return { type: "append", command: normalized, output };
}

export function historyReducer(
  history: readonly TerminalEntry[],
  action: TerminalAction,
  max: number = DEFAULT_MAX_HISTORY,
): readonly TerminalEntry[] {
  switch (action.type) {
    case "noop":
      return history;
    case "clear":
      return history.length === 0 ? history : [];
    case "append": {
      const id = history.length === 0 ? 0 : history[history.length - 1].id + 1;
      const next = [...history, { id, command: action.command, output: action.output }];
      return next.length > max ? next.slice(next.length - Math.max(0, max)) : next;
    }
  }
}

const terminalSearchSource: SearchIndexSource = {
  config: terminal,
  skills,
  projects: work.featured,
  certifications,
  links: contact.links,
};

export const defaultTerminalContext: TerminalContext = {
  ...terminalSearchSource,
  resumeUrl: intro.resumeUrl,
  resolvePath: (path) => withBase(path),
  searchIndex: buildSearchIndex(terminalSearchSource),
};
