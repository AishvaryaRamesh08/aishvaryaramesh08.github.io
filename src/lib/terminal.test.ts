import { describe, expect, it } from "vitest";
import { certifications } from "../data/certifications";
import { terminal } from "../data/terminal";
import { work } from "../data/work";
import type { TerminalEntry } from "../data/types";
import {
  TERMINAL_COMMANDS,
  defaultTerminalContext as ctx,
  historyReducer,
  normalizeCommand,
  runCommand,
} from "./terminal";

const outputOf = (input: string) => {
  const action = runCommand(input, ctx);
  if (action.type !== "append") throw new Error(`expected append, got ${action.type}`);
  return action.output;
};

const textOf = (input: string) =>
  outputOf(input).map((line) => (typeof line === "string" ? line : line.text));

describe("normalizeCommand", () => {
  it("trims and lower-cases", () => {
    expect(normalizeCommand("  WhoAmI\t")).toBe("whoami");
    expect(normalizeCommand("   ")).toBe("");
  });
});

describe("runCommand", () => {
  it("treats blank input as a noop and clear as clear", () => {
    expect(runCommand("", ctx)).toEqual({ type: "noop" });
    expect(runCommand(" \n\t ", ctx)).toEqual({ type: "noop" });
    expect(runCommand("  CLEAR ", ctx)).toEqual({ type: "clear" });
  });

  it("gives the same result for raw and normalized input", () => {
    expect(runCommand("  SKILLS  ", ctx)).toEqual(runCommand("skills", ctx));
    expect(runCommand(" FooBar ", ctx)).toEqual(runCommand("foobar", ctx));
  });

  it("prints whoami, experience and education from terminal content config", () => {
    expect(textOf("whoami")).toEqual([terminal.whoami]);
    expect(textOf("experience")).toEqual(terminal.experience);
    expect(textOf("education")).toEqual(terminal.education);
  });

  it("prints all skill clusters and skill names", () => {
    const out = textOf("skills");
    expect(out).toHaveLength(ctx.skills.clusters.length);
    expect(out.find((line) => line.startsWith("Cloud:"))).toContain("BigQuery");
    expect(out.find((line) => line.startsWith("Databases:"))).toContain("BigQuery");
    expect(out[0]).toContain("Apache Spark / PySpark");
  });

  it("prints every featured project and certification", () => {
    const projects = textOf("projects").join("\n");
    for (const project of work.featured) expect(projects).toContain(project.title);
    expect(projects).toContain(terminal.projectsHint);
    const certs = textOf("certs").join("\n");
    for (const certification of certifications) expect(certs).toContain(certification.name);
  });

  it("prints configured public contact links as real-link output lines", () => {
    const action = runCommand("contact", ctx);
    if (action.type !== "append") throw new Error("expected contact output");
    const links = action.output.filter((line): line is { text: string; href: string } =>
      typeof line !== "string" && Boolean(line.href),
    );
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining("Aishvarya.ramesh@tamu.edu"), href: "mailto:Aishvarya.ramesh@tamu.edu" }),
        expect.objectContaining({ text: expect.stringContaining("linkedin.com"), href: ctx.links.linkedin }),
        expect.objectContaining({ text: expect.stringContaining("github.com"), href: ctx.links.github }),
      ]),
    );
  });

  it("prints and opens the configured resume URL", () => {
    const action = runCommand("resume", {
      ...ctx,
      resolvePath: (path) => `/base${path}`,
    });
    expect(action).toMatchObject({
      type: "append",
      command: "resume",
      output: [{ text: "/base/resume.pdf", href: "/base/resume.pdf" }],
    });
    expect(
      runCommand("resume", { ...ctx, resumeUrl: "" }),
    ).toMatchObject({ type: "append", output: [terminal.resumeUnavailable] });
  });

  it("lists every command with its description for help", () => {
    expect(textOf("help")).toEqual(TERMINAL_COMMANDS.map((command) => `${command} - ${terminal.help[command]}`));
  });

  it("navigates to valid sections and rejects unsupported sections", () => {
    expect(runCommand("goto work", ctx)).toMatchObject({
      type: "append",
      command: "goto work",
      navigateTo: "work",
      output: [terminal.gotoConfirmation("work")],
    });
    expect(textOf("goto about")).toEqual([terminal.gotoUnknown("about")]);
  });

  it("resolves aliases and searches free text with stop words removed", () => {
    expect(textOf("who are you")).toEqual([terminal.whoami]);
    expect(textOf("cv")).toEqual(textOf("resume"));
    expect(textOf("what is BigQuery about?").join("\n")).toContain("BigQuery");
    expect(textOf("texas a&m").join("\n")).toContain("Texas A&M University");
  });

  it("returns configured no-results feedback for an unmatched query", () => {
    expect(textOf("qzxv-no-such-portfolio-topic")).toEqual([
      terminal.noResults("qzxv-no-such-portfolio-topic"),
    ]);
  });
});

describe("historyReducer", () => {
  const append = (command: string) => ({ type: "append" as const, command, output: [command] });

  it("appends entries with increasing ids and leaves earlier entries untouched", () => {
    const h1 = historyReducer([], append("a"));
    const h2 = historyReducer(h1, append("b"));
    expect(h2.map((entry) => [entry.id, entry.command])).toEqual([[0, "a"], [1, "b"]]);
    expect(h2[0]).toBe(h1[0]);
  });

  it("returns the same history for noop and an empty one for clear", () => {
    const history: readonly TerminalEntry[] = [{ id: 3, command: "x", output: [] }];
    expect(historyReducer(history, { type: "noop" })).toBe(history);
    expect(historyReducer(history, { type: "clear" })).toEqual([]);
  });

  it("keeps only the most recent max entries", () => {
    let history: readonly TerminalEntry[] = [];
    for (let index = 0; index < 55; index++) history = historyReducer(history, append(`c${index}`));
    expect(history).toHaveLength(50);
    expect(history[0].command).toBe("c5");
    expect(history[49].command).toBe("c54");
    expect(historyReducer(history, append("z"), 3).map((entry) => entry.command)).toEqual(["c53", "c54", "z"]);
  });
});
