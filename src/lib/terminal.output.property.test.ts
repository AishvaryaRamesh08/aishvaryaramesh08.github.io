import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  TERMINAL_COMMANDS,
  defaultTerminalContext,
  runCommand,
} from "./terminal";

const PHONE = /(\+\d{1,3}[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

function output(input: string): string[] {
  const action = runCommand(input, defaultTerminalContext);
  if (action.type !== "append") return [];
  return action.output.map((line) => (typeof line === "string" ? line : line.text));
}

const safeInput = fc.string({ maxLength: 30 }).filter((value) => !PHONE.test(value));

describe("Terminal output completeness", () => {
  it("uses configured whoami, experience and education output", () => {
    expect(output("whoami")).toEqual([defaultTerminalContext.config.whoami]);
    expect(output("experience")).toEqual(defaultTerminalContext.config.experience);
    expect(output("education")).toEqual(defaultTerminalContext.config.education);
  });

  it("includes each configured skill cluster and its items", () => {
    const result = output("skills");
    const names = new Map(defaultTerminalContext.skills.skills.map((skill) => [skill.id, skill.name] as const));
    expect(result).toHaveLength(defaultTerminalContext.skills.clusters.length);
    defaultTerminalContext.skills.clusters.forEach((cluster, index) => {
      expect(result[index]).toContain(cluster.name);
      for (const id of cluster.skills) expect(result[index]).toContain(names.get(id) ?? id);
    });
  });

  it("includes all configured featured projects and certifications", () => {
    const projectOutput = output("projects").join("\n");
    for (const project of defaultTerminalContext.projects) expect(projectOutput).toContain(project.title);
    const certOutput = output("certs").join("\n");
    for (const certification of defaultTerminalContext.certifications) expect(certOutput).toContain(certification.name);
  });

  it("lists every supported command in help", () => {
    const help = output("help");
    for (const command of TERMINAL_COMMANDS) {
      expect(help.some((line) => line.startsWith(`${command} - `))).toBe(true);
    }
  });

  it("does not emit phone numbers for arbitrary phone-free input", () => {
    fc.assert(
      fc.property(safeInput, (input) => {
        for (const line of output(input)) expect(line).not.toMatch(PHONE);
      }),
    );
  });

  it("returns no more than three search result titles", () => {
    const action = runCommand("bigquery", defaultTerminalContext);
    if (action.type !== "append") throw new Error("expected search results");
    expect(action.output.filter((line) => typeof line !== "string" && line.title)).toHaveLength(3);
  });
});
