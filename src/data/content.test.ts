// Content integrity tests (task 4.10): the copy, order and values the requirements fix.
// Requirements: 3.3, 7.2, 10.1, 11.4, 12.1, 18.1, 19.5, 20.5, 21.10, 31.7
// The "passes every validator against the real file system" check needs Node APIs, so it lives in
// build/contentIntegrity.test.ts.
import { describe, expect, it } from "vitest";
import {
  missingTopics,
  PIPELINE_TOPICS,
  REFLECTION_TOPICS,
  type Content,
} from "../lib/validators";
import { analysis } from "./analysis";
import { background } from "./background";
import { builtWithAi } from "./builtWithAi";
import { certifications } from "./certifications";
import { contact } from "./contact";
import { dependencyDemo } from "./dependencyDemo";
import { hook, hookImages } from "./hook";
import { intro } from "./intro";
import { journey } from "./journey";
import { liveDemo } from "./liveDemo";
import { pipeline } from "./pipeline";
import { projects } from "./projects";
import { site } from "./site";
import { skills } from "./skills";
import { story } from "./story";
import { terminal } from "./terminal";
import { isPlaceholder, skillIds, type CaseStudy, type HeadedSectionId, type SectionId } from "./types";
import { viz } from "./viz";

const content: Content = {
  site,
  hook,
  hookImages,
  intro,
  story,
  pipeline,
  projects,
  dependencyDemo,
  viz,
  liveDemo,
  analysis,
  skills,
  certifications,
  journey,
  builtWithAi,
  contact,
  terminal,
  background,
};

// ---------- section IDs (Req 3.1 order) ----------

/** All 13 section anchor IDs in page order. */
const SECTION_ORDER = [
  "site-nav",
  "hook",
  "intro",
  "work",
  "skills",
  "certifications",
  "terminal",
  "journey",
  "built-with-ai",
  "analysis",
  "story",
  "contact",
  "site-footer",
] as const satisfies readonly SectionId[];

// Compile-time check: SECTION_ORDER lists every SectionId.
type MissingSectionId = Exclude<SectionId, (typeof SECTION_ORDER)[number]>;
const sectionOrderIsExhaustive: [MissingSectionId] extends [never] ? true : false = true;

const HEADED_ORDER = SECTION_ORDER.filter(
  (id): id is HeadedSectionId => id !== "site-nav" && id !== "hook" && id !== "site-footer",
);

const ANCHOR_ID = /^[a-z0-9-]+$/;

/** Index of each needle in `text` (case-insensitive); -1 when absent. */
const positions = (text: string, needles: readonly string[]) =>
  needles.map((n) => text.toLowerCase().indexOf(n.toLowerCase()));

const isAscending = (xs: readonly number[]) => xs.every((x, i) => x >= 0 && (i === 0 || x > xs[i - 1]));

describe("Content_Config integrity", () => {
  describe("section IDs (Req 3.3)", () => {
    it("lists 13 unique anchor IDs of lowercase letters, digits and hyphens", () => {
      expect(sectionOrderIsExhaustive).toBe(true);
      expect(SECTION_ORDER).toHaveLength(13);
      expect(new Set(SECTION_ORDER).size).toBe(SECTION_ORDER.length);
      for (const id of SECTION_ORDER) expect(id).toMatch(ANCHOR_ID);
    });

    it("defines a heading for every headed section, in page order", () => {
      expect(Object.keys(site.sections)).toEqual(HEADED_ORDER);
      for (const [id, { heading }] of Object.entries(site.sections)) expect(heading.trim(), id).not.toBe("");
    });

    it("keeps hook CTA targets on real section IDs", () => {
      expect(SECTION_ORDER).toContain(hook.primaryCta.target);
      expect(SECTION_ORDER).toContain(hook.secondaryCta.target);
    });
  });

  describe("Nav_Groups (Req 7.2)", () => {
    it("has one group for each navigation label with its assigned sections", () => {
      expect(site.navGroups.map(({ id, label, sections }) => ({ id, label, sections }))).toEqual([
        { id: "story", label: "Story", sections: ["intro", "story"] },
        { id: "work", label: "Work", sections: ["work"] },
        { id: "skills", label: "Skills", sections: ["skills", "certifications", "terminal"] },
        { id: "journey", label: "Journey", sections: ["journey"] },
        { id: "built-with-ai", label: "Built with AI", sections: ["built-with-ai"] },
        { id: "analysis", label: "Analysis", sections: ["analysis"] },
        { id: "contact", label: "Contact", sections: ["contact"] },
      ]);
    });

    it("covers each rendered section exactly once", () => {
      const groupedSections = site.navGroups.flatMap((g) => g.sections);
      expect(new Set(groupedSections).size).toBe(groupedSections.length);
      expect([...groupedSections].sort()).toEqual([...HEADED_ORDER].sort());
      for (const g of site.navGroups) expect(g.id).toMatch(ANCHOR_ID);
    });
  });

  describe("pipeline topics (Req 11.4)", () => {
    it("keeps the six stages in order", () => {
      expect(pipeline.stages.map((s) => s.name)).toEqual([
        "Source",
        "Raw",
        "Staging",
        "Sanitized",
        "Conformed",
        "Insights / AI",
      ]);
    });

    it("names every pipeline topic in at least one stage explanation", () => {
      const texts = pipeline.stages.flatMap((s) => (isPlaceholder(s.explanation) ? [] : [s.explanation]));
      expect(texts).toHaveLength(6);
      expect(missingTopics(texts, PIPELINE_TOPICS).map((t) => t.name)).toEqual([]);
      const all = texts.join(" ").toLowerCase();
      for (const topic of ["deduplication", "pii handling", "incremental refresh", "validation", "referential integrity", "governance"]) {
        expect(all).toContain(topic);
      }
    });
  });

  describe("Case_Studies (Req 12.1)", () => {
    const studies: readonly CaseStudy[] = projects;
    // Required title, org, award and description for each card, in order.
    const required = [
      {
        title: "Migrating 50+ tables to the cloud",
        org: "Wells Fargo",
        description:
          "greenfield ELT on GCP with Python, SQL and Airflow, moving on-prem sources including PII data into BigQuery through raw, staging, sanitized and conformed layers with deduplication and incremental refresh",
      },
      {
        title: "GenAI Autosys dependency visualizer",
        org: "Wells Fargo",
        award: "Spotlight Award",
        description: "interactive graph of job dependencies and failure impact",
      },
      {
        title: "Automated ETL at scale",
        org: "Wells Fargo",
        description:
          "UNIX shell + PySpark loading time-critical files into SQL Server across 200+ subject areas, cutting development time by about 75% for a four-person team",
      },
      {
        title: "GenAI test-data generation",
        description: "Microsoft Copilot producing 100+ records across 200 tables from DDLs within hours",
      },
      {
        title: "Enterprise Data Lakehouse & RAG Pipeline",
        description:
          "messy multi-source ERP data into a normalized 3NF schema with validated referential integrity, audit triggers, generated columns and role-based security views, feeding a vector database for natural-language retrieval",
      },
      {
        title: "Stock Market Analysis and Conversational AI Assistant",
        description:
          "Plotly/Dash candlestick platform, Random Forest classifier (97.36% accuracy on engulfing patterns), Rasa voice/text assistant",
      },
      {
        title: "Power BI incident dashboard",
        org: "Kimberly-Clark",
        description: "replaced manual reporting with automated daily refreshes, recognized by the Global CIO",
      },
    ];

    it("lists the seven Case_Studies in the required order with unique anchor-safe IDs", () => {
      expect(studies.map((p) => p.title)).toEqual(required.map((r) => r.title));
      expect(new Set(studies.map((p) => p.id)).size).toBe(studies.length);
      for (const p of studies) expect(p.id).toMatch(ANCHOR_ID);
    });

    it("keeps each card's employer, award and description as written", () => {
      studies.forEach((p, i) => {
        const r = required[i];
        expect(p.org, p.title).toBe(r.org);
        expect(p.award, p.title).toBe(r.award);
        expect(p.summary.toLowerCase(), p.title).toContain(r.description.toLowerCase());
      });
    });

    it("marks only the AWS Lakehouse & RAG Pipeline as work in progress", () => {
      expect(studies.filter((p) => p.workInProgress).map((p) => p.title)).toEqual([
        "Enterprise Data Lakehouse & RAG Pipeline",
      ]);
      const lakehouse = studies[4];
      expect(lakehouse.summary).toContain("AWS");
      expect(lakehouse.tech).toContain("aws");
    });

    it("links the dependency demo only from the Autosys visualizer", () => {
      expect(studies.filter((p) => p.demo === "dependency-demo").map((p) => p.id)).toEqual(["autosys-visualizer"]);
    });
  });

  describe("certifications (Req 18.1)", () => {
    it("lists the three certifications in order with issuers and short meanings", () => {
      expect(certifications.map(({ name, issuer }) => ({ name, issuer }))).toEqual([
        { name: "Google Cloud Certified – Cloud Digital Leader", issuer: "Google Cloud" },
        { name: "Microsoft Certified – Azure AI Fundamentals", issuer: "Microsoft" },
        { name: "Microsoft Certified – Azure Fundamentals", issuer: "Microsoft" },
      ]);
      for (const c of certifications) {
        expect(c.meaning.trim(), c.name).not.toBe("");
        expect([...c.meaning].length, c.name).toBeLessThanOrEqual(120);
      }
      expect(new Set(certifications.map((c) => c.id)).size).toBe(3);
    });
  });

  describe("Journey_Stages (Req 19.5)", () => {
    it("holds the four initial entries in order with their exact values", () => {
      expect(journey).toEqual([
        {
          label: "Undergraduate",
          approxYear: "~2018-2022",
          detail:
            'M S Ramaiah Institute of Technology, Bengaluru. B.E. in Electronics & Telecommunication Engineering. Event Coordinator for "Empyreal" tech fest, 50+ volunteers; coursework in Data Structures & Algorithms, OOP, Machine Learning, IoT.',
        },
        {
          label: "Kimberly-Clark",
          approxYear: "~2022",
          detail:
            "Graduate Engineer Trainee Intern, Application Operations. Built an org-wide Power BI incident-management dashboard with automated daily refreshes, recognized by the Global CIO.",
        },
        {
          label: "Wells Fargo",
          approxYear: "~2022-2026",
          detail:
            "Senior Software Engineer, Data Engineering (Senior AVP). Led the GenAI Autosys dependency visualizer (Spotlight Award), architected the GCP ELT pipeline migrating 50+ tables, GenAI cohort member running webinars.",
        },
        {
          label: "Texas A&M",
          approxYear: "~2026-2028 (in progress)",
          detail:
            "MS in Management Information Systems, Mays Business School. 4.0 GPA; Advanced Data Management, Advanced Systems Analysis & Design, Project Management; Product@TAMU, Mobile Productivity Leap case challenge.",
        },
      ]);
    });
  });

  describe("Built with AI (Req 20.1, 20.5)", () => {
    it("keeps the seven timeline steps in order", () => {
      expect(builtWithAi.steps.map((s) => s.title)).toEqual([
        "Idea",
        "Requirements (spec-driven in Kiro)",
        "Design",
        "Task execution",
        "Review and refinement",
        "CI/CD to GitHub Pages",
        "Live",
      ]);
    });

    it("names every reflection topic across both non-empty parts", () => {
      const { didWell, steppedIn } = builtWithAi.reflection;
      expect(didWell.length).toBeGreaterThan(0);
      expect(steppedIn.length).toBeGreaterThan(0);
      expect(missingTopics([...didWell, ...steppedIn], REFLECTION_TOPICS).map((t) => t.name)).toEqual([]);
    });
  });

  describe("emphasis order (Req 31.7)", () => {
    // Featured work → tech constellation → AI-assisted development → analysis → story.
    it("orders the emphasis sections on the page by priority", () => {
      const order = ["work", "skills", "built-with-ai", "analysis", "story", "contact"].map((id) =>
        HEADED_ORDER.indexOf(id as HeadedSectionId),
      );
      expect(isAscending(order)).toBe(true);
      expect(HEADED_ORDER.indexOf("skills")).toBe(HEADED_ORDER.indexOf("work") + 1);
      expect(HEADED_ORDER.indexOf("story")).toBe(HEADED_ORDER.indexOf("contact") - 1);
    });

    it("orders the emphasis Nav_Groups by priority", () => {
      const labels: string[] = site.navGroups.map((g) => g.label);
      expect(isAscending(["Work", "Skills", "Built with AI", "Analysis"].map((l) => labels.indexOf(l)))).toBe(true);
    });

    it("orders the skill clusters by priority", () => {
      const ids: string[] = skills.clusters.map((c) => c.id);
      expect(
        isAscending(["data-engineering", "analysis-visualization", "systems-delivery", "ai-ml"].map((id) => ids.indexOf(id))),
      ).toBe(true);
    });

    it("orders the areas by priority in the meta description and Open Graph alt text", () => {
      expect(isAscending(positions(site.metaDescription, ["pipelines", "visualization", "systems analysis"]))).toBe(true);
      expect(isAscending(positions(site.ogImage.alt, ["data engineer", "analyst", "systems thinker"]))).toBe(true);
    });
  });

  describe("no phone number (Req 21.10)", () => {
    const text = JSON.stringify(content);
    // Content includes site meta (title, description, JSON-LD fields) and every contact link.

    it("contains no phone-number pattern", () => {
      // Optional country code, then 3-3-4 digits with optional separators or parentheses.
      expect(text).not.toMatch(/(\+\d{1,3}[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
      expect(text).not.toMatch(/\+\d[\d\s().-]{7,}\d/);
    });

    it("has no telephone fields or tel: links", () => {
      expect(text).not.toMatch(/\btel:/i);
      expect(text).not.toMatch(/"(tele)?phone"\s*:/i);
      expect(text.toLowerCase()).not.toContain("telephone");
    });
  });

  describe("other fixed content", () => {
    it("covers every skill id exactly once, with BigQuery in two clusters", () => {
      expect(skills.skills.map((s) => s.id).sort()).toEqual([...skillIds].sort());
      expect(new Set(skills.clusters.flatMap((c) => c.skills)).size).toBe(skillIds.length);
      expect(skills.clusters.filter((c) => (c.skills as readonly string[]).includes("bigquery"))).toHaveLength(2);
    });

    it("includes the four required SQL_Ticker snippets", () => {
      for (const snippet of [
        "SELECT * FROM raw.orders;",
        "MERGE INTO conformed.customers;",
        "DAG: ingest >> clean >> validate >> load;",
        "vector_index.upsert()",
      ]) {
        expect(background.ticker.snippets).toContain(snippet);
      }
    });

    it("echoes the normalized command in the unknown-command message", () => {
      expect(terminal.unknown("foo", ["help", "clear"])).toBe("command not found: foo. Supported commands: help, clear");
    });
  });
});
