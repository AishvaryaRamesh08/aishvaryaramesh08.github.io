// @vitest-environment node
// Structural checks on the Deploy_Workflow (Req 2.1, 2.2, 2.6, 2.7, 2.8, 32.5).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface Step {
  name?: string;
  id?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
}

interface Job {
  "runs-on"?: string;
  needs?: string | string[];
  environment?: string | { name: string; url?: string };
  steps: Step[];
}

interface Workflow {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: Record<string, Job>;
}

const root = resolve(import.meta.dirname, "..");
const workflowPath = resolve(root, ".github/workflows/deploy.yml");
// yaml parses YAML 1.2 by default, so the `on` key stays the string "on" (not boolean true).
const workflow = parse(readFileSync(workflowPath, "utf8")) as Workflow;
const buildJob = workflow.jobs.build;
const deployJob = workflow.jobs.deploy;
const allSteps = Object.values(workflow.jobs).flatMap((job) => job.steps);

/** Index of the build-job step whose `run` command is exactly `command`. */
function runIndex(command: string): number {
  return buildJob.steps.findIndex((step) => step.run?.trim() === command);
}

/** Index of the build-job step that uses the given action (owner/name, any ref). */
function usesIndex(action: string): number {
  return buildJob.steps.findIndex((step) => step.uses?.startsWith(`${action}@`));
}

describe("Deploy_Workflow triggers", () => {
  it("runs only on pushes to main", () => {
    expect(Object.keys(workflow.on)).toEqual(["push"]);
    const push = workflow.on.push as Record<string, unknown>;
    expect(push.branches).toEqual(["main"]);
    expect(push).not.toHaveProperty("branches-ignore");
    expect(push).not.toHaveProperty("tags");
  });

  it("grants only the Pages deployment permissions", () => {
    expect(workflow.permissions).toEqual({ contents: "read", pages: "write", "id-token": "write" });
  });

  it("cancels in-progress runs so the newest main commit wins", () => {
    expect(workflow.concurrency).toEqual({ group: "pages", "cancel-in-progress": true });
  });
});

describe("Deploy_Workflow build job", () => {
  it("runs typecheck, lint and tests as separate steps before the build", () => {
    const typecheck = runIndex("npm run typecheck");
    const lint = runIndex("npm run lint");
    const test = runIndex("npm run test");
    const build = runIndex("npm run build");
    for (const index of [typecheck, lint, test, build]) expect(index).toBeGreaterThanOrEqual(0);
    expect(typecheck).toBeLessThan(build);
    expect(lint).toBeLessThan(build);
    expect(test).toBeLessThan(build);
  });

  it("installs with npm ci before any npm script", () => {
    expect(runIndex("npm ci")).toBeGreaterThanOrEqual(0);
    expect(runIndex("npm ci")).toBeLessThan(runIndex("npm run typecheck"));
  });

  it("names every step so the failing step is identified in the run log", () => {
    for (const step of buildJob.steps) expect(step.name?.trim()).toBeTruthy();
  });

  it("uploads dist as the Pages artifact after the build", () => {
    const upload = usesIndex("actions/upload-pages-artifact");
    expect(upload).toBeGreaterThan(runIndex("npm run build"));
    expect(buildJob.steps[upload].with).toEqual({ path: "dist" });
    expect(usesIndex("actions/configure-pages")).toBeGreaterThan(runIndex("npm run build"));
  });

  it("uses Node from .nvmrc", () => {
    const setupNode = buildJob.steps[usesIndex("actions/setup-node")];
    expect(setupNode.with?.["node-version-file"]).toBe(".nvmrc");
    expect(readFileSync(resolve(root, ".nvmrc"), "utf8").trim()).toMatch(/^v?24(\.|$)/);
  });
});

describe("Deploy_Workflow deploy job", () => {
  it("runs only after the build job succeeds", () => {
    const needs = [deployJob.needs].flat();
    expect(needs).toEqual(["build"]);
  });

  it("deploys to the github-pages environment with deploy-pages", () => {
    const environment = deployJob.environment;
    expect(typeof environment === "string" ? environment : environment?.name).toBe("github-pages");
    expect(deployJob.steps.some((step) => step.uses?.startsWith("actions/deploy-pages@"))).toBe(true);
  });

  it("is the only job that publishes", () => {
    const publishers = Object.entries(workflow.jobs)
      .filter(([, job]) => job.steps.some((step) => step.uses?.startsWith("actions/deploy-pages@")))
      .map(([id]) => id);
    expect(publishers).toEqual(["deploy"]);
  });
});

describe("Deploy_Workflow supply chain and domain", () => {
  it("pins every action to a full commit SHA", () => {
    const uses = allSteps.flatMap((step) => (step.uses ? [step.uses] : []));
    expect(uses.length).toBeGreaterThan(0);
    for (const ref of uses) expect(ref).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/);
  });

  it("configures no custom domain or CNAME", () => {
    for (const step of allSteps) {
      const inputs = Object.keys(step.with ?? {}).map((key) => key.toLowerCase());
      expect(inputs).not.toContain("cname");
      expect(step.run ?? "").not.toMatch(/CNAME/i);
    }
    expect(existsSync(resolve(root, "public/CNAME"))).toBe(false);
    expect(existsSync(resolve(root, "CNAME"))).toBe(false);
  });
});
