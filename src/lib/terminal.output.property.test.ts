// Feature: portfolio-website, Property 18: Command output completeness and phone safety —
// for any generated content config, `skills` output contains every cluster and every skill,
// `projects` every Case_Study title, `certs` every certification name, `contact` the email,
// LinkedIn, GitHub and resume links (or "not yet available" for pending ones), `whoami` the name
// and role, and `help` every command. For any input over phone-free content, no output line matches
// the phone-number pattern; the real Content_Config outputs contain none either.
// **Validates: Requirements 24.3, 24.7**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { skillIds, type ContactLinks, type Placeholder, type SkillId, type SkillsConfig } from "../data/types";
import {
  PENDING_LINK_TEXT,
  TERMINAL_COMMANDS,
  defaultTerminalContext,
  runCommand,
  type TerminalContext,
} from "./terminal";

/** Same phone-number pattern as the content check (Req 21.10): optional country code, then 3-3-4 digits. */
const PHONE = /(\+\d{1,3}[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

// ---------- generators ----------

/**
 * Display text that cannot contain a phone number: digits are allowed (e.g. "AWS S3", "Python 3")
 * but never three in a row, so no field can supply the 3-3-4 digit run.
 */
const arbText = fc
  .string({
    unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-&()/+'"),
    minLength: 1,
    maxLength: 24,
  })
  .filter((s) => s.trim().length > 0 && !/\d{3}/.test(s));

/** URL-safe token for emails, URLs and paths (letters only, so no digit runs). */
const arbToken = fc.string({ unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"), minLength: 1, maxLength: 10 });

const arbPlaceholder: fc.Arbitrary<Placeholder> = arbText.map((expected) => ({ placeholder: true, expected }));

const arbHttps = fc.tuple(arbToken, arbToken).map(([host, path]) => `https://${host}.com/${path}` as const);

const arbLinks: fc.Arbitrary<ContactLinks> = fc.record({
  email: fc.tuple(arbToken, arbToken).map(([user, domain]) => `mailto:${user}@${domain}.edu` as const),
  linkedin: fc.oneof(arbHttps, arbPlaceholder),
  github: fc.oneof(arbHttps, arbPlaceholder),
  resumePdf: fc.oneof(arbToken.map((name) => `/resume/${name}.pdf` as const), arbPlaceholder),
});

/** Skills config where every listed skill belongs to at least one cluster (BigQuery-style sharing allowed). */
const arbSkills: fc.Arbitrary<SkillsConfig> = fc
  .shuffledSubarray([...skillIds], { minLength: 1, maxLength: 10 })
  .chain((pool: SkillId[]) =>
    fc
      .record({
        names: fc.array(arbText, { minLength: pool.length, maxLength: pool.length }),
        clusters: fc.array(
          fc.record({ id: arbToken, name: arbText, skills: fc.subarray(pool) }),
          { minLength: 1, maxLength: 5 },
        ),
      })
      .map(({ names, clusters }) => {
        const covered = new Set(clusters.flatMap((c) => c.skills));
        const missing = pool.filter((id) => !covered.has(id));
        const [first, ...rest] = clusters;
        return {
          skills: pool.map((id, i) => ({ id, name: names[i] })),
          clusters: [{ ...first, skills: [...first.skills, ...missing] }, ...rest],
        };
      }),
  );

const arbContext: fc.Arbitrary<TerminalContext> = fc.record({
  config: fc.record({
    help: fc.record(
      Object.fromEntries(TERMINAL_COMMANDS.map((c) => [c, arbText])) as Record<
        (typeof TERMINAL_COMMANDS)[number],
        fc.Arbitrary<string>
      >,
    ),
    unknown: fc.constant(
      (cmd: string, supported: readonly string[]) => `command not found: ${cmd}. Supported: ${supported.join(", ")}`,
    ),
  }),
  owner: fc.record({ name: arbText, role: arbText }),
  skills: arbSkills,
  projects: fc.array(fc.record({ title: arbText }), { maxLength: 6 }),
  certifications: fc.array(fc.record({ name: arbText }), { maxLength: 6 }),
  links: arbLinks,
  resumeAvailable: fc.boolean(),
  resolvePath: arbToken.map((base) => (path: string) => `/${base}${path}`),
});

/** A supported command in random case with surrounding whitespace. */
const arbCommandInput = fc
  .tuple(
    fc.constantFrom(...TERMINAL_COMMANDS),
    fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
    fc.constantFrom("", " ", "\t", "  "),
    fc.constantFrom("", " ", "\n", "  "),
  )
  .map(([cmd, upper, pre, post]) => pre + [...cmd].map((ch, i) => (upper[i] ? ch.toUpperCase() : ch)).join("") + post);

/**
 * Any input. The unknown-command message echoes the normalized command (Req 24.4), so an input that
 * is itself a phone number would be echoed back; such inputs are excluded since no content supplies them.
 */
const arbInput = fc
  .oneof(arbCommandInput, fc.string({ maxLength: 30 }), arbText)
  .filter((s) => !PHONE.test(s.trim().toLowerCase()));

/** Output lines of a command, or [] for clear/noop. */
function output(input: string, ctx: TerminalContext): readonly string[] {
  const action = runCommand(input, ctx);
  return action.type === "append" ? action.output : [];
}

const has = (lines: readonly string[], needle: string) => lines.some((l) => l.includes(needle));

// ---------- properties ----------

describe("Property 18: Command output completeness and phone safety", () => {
  it("whoami contains the name and role", () => {
    fc.assert(
      fc.property(arbContext, (ctx) => {
        const out = output("whoami", ctx);
        expect(has(out, ctx.owner.name)).toBe(true);
        expect(has(out, ctx.owner.role)).toBe(true);
      }),
    );
  });

  it("skills contains every cluster with each of its skill names, and every skill", () => {
    fc.assert(
      fc.property(arbContext, (ctx) => {
        const out = output("skills", ctx);
        const nameOf = new Map(ctx.skills.skills.map((s) => [s.id, s.name] as const));
        expect(out).toHaveLength(ctx.skills.clusters.length);
        ctx.skills.clusters.forEach((cluster, i) => {
          expect(out[i]).toContain(cluster.name);
          for (const id of cluster.skills) expect(out[i]).toContain(nameOf.get(id) ?? id);
        });
        for (const skill of ctx.skills.skills) expect(has(out, skill.name)).toBe(true);
      }),
    );
  });

  it("projects contains every title and certs every certification name", () => {
    fc.assert(
      fc.property(arbContext, (ctx) => {
        const projects = output("projects", ctx);
        expect(projects).toHaveLength(ctx.projects.length);
        ctx.projects.forEach((p, i) => expect(projects[i]).toContain(p.title));

        const certs = output("certs", ctx);
        expect(certs).toHaveLength(ctx.certifications.length);
        ctx.certifications.forEach((c, i) => expect(certs[i]).toContain(c.name));
      }),
    );
  });

  it("contact contains email, LinkedIn, GitHub and resume links, or the pending text", () => {
    fc.assert(
      fc.property(arbContext, (ctx) => {
        const out = output("contact", ctx);
        const { email, linkedin, github, resumePdf } = ctx.links;
        const line = (label: string) => out.find((l) => l.startsWith(`${label}:`)) ?? "";

        expect(line("email")).toContain(email.replace(/^mailto:/, ""));
        expect(line("linkedin")).toContain(typeof linkedin === "string" ? linkedin : PENDING_LINK_TEXT);
        expect(line("github")).toContain(typeof github === "string" ? github : PENDING_LINK_TEXT);
        const resume =
          typeof resumePdf === "string" && ctx.resumeAvailable ? ctx.resolvePath(resumePdf) : PENDING_LINK_TEXT;
        expect(line("resume")).toContain(resume);
      }),
    );
  });

  it("help lists every supported command with its description", () => {
    fc.assert(
      fc.property(arbContext, (ctx) => {
        const out = output("help", ctx);
        for (const cmd of TERMINAL_COMMANDS) {
          expect(out.some((l) => l.startsWith(cmd) && l.includes(ctx.config.help[cmd]))).toBe(true);
        }
      }),
    );
  });

  it("no output matches the phone-number pattern for any input over phone-free content", () => {
    fc.assert(
      fc.property(arbContext, arbInput, (ctx, input) => {
        for (const line of output(input, ctx)) expect(line).not.toMatch(PHONE);
      }),
    );
  });

  it("the real Content_Config outputs contain no phone-number pattern", () => {
    const contexts = [defaultTerminalContext, { ...defaultTerminalContext, resumeAvailable: true }];
    for (const ctx of contexts) {
      for (const cmd of [...TERMINAL_COMMANDS, "unknown-cmd"]) {
        for (const line of output(cmd, ctx)) expect(line).not.toMatch(PHONE);
      }
    }
  });
});
