import { describe, expect, it } from "vitest";
import { certifications } from "../data/certifications";
import { projects } from "../data/projects";
import { terminal } from "../data/terminal";
import type { TerminalEntry } from "../data/types";
import {
  TERMINAL_COMMANDS,
  defaultTerminalContext as ctx,
  historyReducer,
  normalizeCommand,
  runCommand,
  type TerminalAction,
  type TerminalContext,
} from "./terminal";

const outputOf = (input: string, c: TerminalContext = ctx): readonly string[] => {
  const action = runCommand(input, c);
  if (action.type !== "append") throw new Error(`expected append, got ${action.type}`);
  return action.output;
};

const append = (command: string): TerminalAction => ({ type: "append", command, output: [command] });

describe("normalizeCommand", () => {
  it("trims and lower-cases", () => {
    expect(normalizeCommand("  WhoAmI\t")).toBe("whoami");
    expect(normalizeCommand("   ")).toBe("");
  });
});

describe("runCommand", () => {
  it("treats blank input as a noop and clear as clear (Req 24.8, 24.10)", () => {
    expect(runCommand("", ctx)).toEqual({ type: "noop" });
    expect(runCommand(" \n\t ", ctx)).toEqual({ type: "noop" });
    expect(runCommand("  CLEAR ", ctx)).toEqual({ type: "clear" });
  });

  it("gives the same result for raw and normalized input (Req 24.5)", () => {
    expect(runCommand("  SKILLS  ", ctx)).toEqual(runCommand("skills", ctx));
    expect(runCommand(" FooBar ", ctx)).toEqual(runCommand("foobar", ctx));
  });

  it("prints the owner's name and role for whoami", () => {
    expect(outputOf("whoami")).toEqual(["Aishvarya Ramesh", ctx.owner.role]);
    expect(ctx.owner.role).toContain("Data Engineer");
  });

  it("prints every cluster with its skill names, BigQuery under Cloud and Databases", () => {
    const out = outputOf("skills");
    expect(out).toHaveLength(ctx.skills.clusters.length);
    expect(out.find((l) => l.startsWith("Cloud:"))).toContain("BigQuery");
    expect(out.find((l) => l.startsWith("Databases:"))).toContain("BigQuery");
    expect(out[0]).toContain("PySpark/Apache Spark");
  });

  it("prints every Case_Study title and certification name", () => {
    const p = outputOf("projects").join("\n");
    for (const { title } of projects) expect(p).toContain(title);
    const c = outputOf("certs").join("\n");
    for (const { name } of certifications) expect(c).toContain(name);
  });

  it("prints contact links and marks the missing resume as pending", () => {
    expect(outputOf("contact")).toEqual([
      "email: Aishvarya.ramesh@tamu.edu",
      "linkedin: https://www.linkedin.com/in/aishvarya-ramesh",
      "github: https://github.com/AishvaryaRamesh08",
      "resume: not yet available",
    ]);
  });

  it("prints the resolved resume URL once the PDF is supplied", () => {
    const withResume: TerminalContext = {
      ...ctx,
      links: { ...ctx.links, resumePdf: "resume/cv.pdf" },
      resumeAvailable: true,
      resolvePath: (p) => `/base/${p}`,
    };
    expect(outputOf("contact", withResume)).toContain("resume: /base/resume/cv.pdf");
  });

  it("lists every command with its description for help (Req 24.9)", () => {
    expect(outputOf("help")).toEqual(TERMINAL_COMMANDS.map((c) => `${c} - ${terminal.help[c]}`));
  });

  it("echoes the normalized unknown command and lists all seven commands (Req 24.4)", () => {
    const action = runCommand("  LS -la ", ctx);
    expect(action).toMatchObject({ type: "append", command: "ls -la" });
    const [line] = outputOf("  LS -la ");
    expect(line).toContain("ls -la");
    for (const c of TERMINAL_COMMANDS) expect(line).toContain(c);
  });
});

describe("historyReducer", () => {
  it("appends entries with increasing ids and leaves earlier entries untouched", () => {
    const h1 = historyReducer([], append("a"));
    const h2 = historyReducer(h1, append("b"));
    expect(h2.map((e) => [e.id, e.command])).toEqual([
      [0, "a"],
      [1, "b"],
    ]);
    expect(h2[0]).toBe(h1[0]);
  });

  it("returns the same history for noop and an empty one for clear", () => {
    const h: readonly TerminalEntry[] = [{ id: 3, command: "x", output: [] }];
    expect(historyReducer(h, { type: "noop" })).toBe(h);
    expect(historyReducer(h, { type: "clear" })).toEqual([]);
  });

  it("keeps only the most recent max entries, oldest dropped first (Req 24.2)", () => {
    let h: readonly TerminalEntry[] = [];
    for (let i = 0; i < 55; i++) h = historyReducer(h, append(`c${i}`));
    expect(h).toHaveLength(50);
    expect(h[0].command).toBe("c5");
    expect(h[49].command).toBe("c54");
    expect(historyReducer(h, append("z"), 3).map((e) => e.command)).toEqual(["c53", "c54", "z"]);
  });
});
