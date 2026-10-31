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
import { terminal } from "./terminal";
import { isPlaceholder, skillIds, type CaseStudy, type HeadedSectionId, type SectionId } from "./types";
import { viz } from "./viz";

const content: Content = {
  site,
  hook,
  hookImages,
  intro,
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

/** All rendered anchor IDs in page order, plus navigation and footer landmarks. */
const SECTION_ORDER = [
  "site-nav",
  "home",
  "work",
  "skills",
  "journey",
  "contact",
  "site-footer",
] as const satisfies readonly SectionId[];

type MissingSectionId = Exclude<Exclude<SectionId, "hook">, (typeof SECTION_ORDER)[number]>;
const sectionOrderIsExhaustive: [MissingSectionId] extends [never] ? true : false = true;

const HEADED_ORDER = SECTION_ORDER.filter(
  (id): id is HeadedSectionId => id !== "site-nav" && id !== "site-footer",
);

const ANCHOR_ID = /^[a-z0-9-]+$/;

/** Index of each needle in `text` (case-insensitive); -1 when absent. */
const positions = (text: string, needles: readonly string[]) =>
  needles.map((n) => text.toLowerCase().indexOf(n.toLowerCase()));

const isAscending = (xs: readonly number[]) => xs.every((x, i) => x >= 0 && (i === 0 || x > xs[i - 1]));

describe("Content_Config integrity", () => {
  describe("section IDs (Req 3.3)", () => {
    it("lists 7 unique anchor IDs of lowercase letters, digits and hyphens", () => {
      expect(sectionOrderIsExhaustive).toBe(true);
      expect(SECTION_ORDER).toHaveLength(7);
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
        { id: "about", label: "About", sections: ["home"] },
        { id: "work", label: "Work", sections: ["work"] },
        { id: "skills", label: "Skills", sections: ["skills"] },
        { id: "journey", label: "Journey", sections: ["journey"] },
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
    it("lists the three certifications in order with issuers and descriptions", () => {
      expect(certifications.map(({ name, issuer }) => ({ name, issuer }))).toEqual([
        { name: "Cloud Digital Leader", issuer: "Google Cloud Certified" },
        { name: "Azure AI Fundamentals", issuer: "Microsoft Certified" },
        { name: "Azure Fundamentals", issuer: "Microsoft Certified" },
      ]);
      for (const c of certifications) {
        expect(c.description.trim(), c.name).not.toBe("");
        expect([...c.description].length, c.name).toBeLessThanOrEqual(120);
      }
      expect(certifications.map((cert) => cert.description)).toEqual([
        "Cloud fundamentals and the business value of Google Cloud.",
        "AI and machine learning concepts and Azure AI services.",
        "Core Azure services, pricing and governance.",
      ]);
      expect(new Set(certifications.map((c) => c.id)).size).toBe(3);
    });
  });

  describe("Journey_Stages (Req 19.5)", () => {
    it("holds the four initial entries in order with their exact values", () => {
      expect(journey).toEqual([
        {
          label: "Undergraduate",
          organization: "M S Ramaiah Institute of Technology, Bengaluru",
          role: "B.E. Electronics & Telecommunication",
          years: "2018 to 2022",
          detail: [
            "GPA 9.19/10.",
            "Coursework: Data Structures & Algorithms, Object-Oriented Programming, Machine Learning, Internet of Things.",
            "Event Coordinator for the Empyreal tech fest, managing 50+ volunteers.",
          ],
        },
        {
          label: "Internship",
          organization: "Kimberly-Clark",
          role: "Graduate Engineer Trainee Intern, Application Operations",
          years: "2022",
          detail: [
            "Built an organization-wide Power BI incident-management dashboard with automated daily refreshes.",
            "Recognized by the Global CIO.",
          ],
        },
        {
          label: "Data engineer",
          organization: "Wells Fargo",
          role: "Senior Software Engineer, Data Engineering (Senior AVP)",
          years: "2022 to 2026",
          detail: [
            "Built cloud ELT pipelines on GCP and automated ETL at scale.",
            "Led a GenAI Autosys visualizer (Spotlight Award).",
            "GenAI cohort member who ran webinars.",
          ],
        },
        {
          label: "Graduate student",
          organization: "Texas A&M University, Mays Business School",
          role: "MS Management Information Systems",
          years: "2026 to 2028, in progress",
          detail: [
            "GPA 4.0.",
            "Advanced Data Management, Advanced Systems Analysis & Design, Project Management.",
            "Product@TAMU team case challenge.",
          ],
          current: true,
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
    // Featured work → skills → journey → contact.
    it("orders the emphasis sections on the page by priority", () => {
      const order = ["work", "skills", "journey", "contact"].map((id) =>
        HEADED_ORDER.indexOf(id as HeadedSectionId),
      );
      expect(isAscending(order)).toBe(true);
      expect(HEADED_ORDER.indexOf("skills")).toBe(HEADED_ORDER.indexOf("work") + 1);
    });

    it("orders the emphasis Nav_Groups by priority", () => {
      const labels: string[] = site.navGroups.map((g) => g.label);
      expect(isAscending(["About", "Work", "Skills", "Journey", "Contact"].map((l) => labels.indexOf(l)))).toBe(true);
    });

    it("orders the skill clusters by priority", () => {
      const ids: string[] = skills.clusters.map((c) => c.id);
      expect(
        isAscending(["data-engineering", "analysis-visualization", "systems-delivery", "ai-ml"].map((id) => ids.indexOf(id))),
      ).toBe(true);
    });

    it("orders the areas by priority in the meta description and Open Graph alt text", () => {
      expect(isAscending(positions(site.metaDescription, ["aishvarya ramesh", "data engineer", "pipelines", "analysis-ready"]))).toBe(true);
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

    it("uses the six requested skill groups and their configured labels", () => {
      expect(skills.clusters.map((cluster) => cluster.name)).toEqual([
        "Data engineering",
        "Cloud",
        "Databases",
        "Analysis and visualization",
        "Systems and delivery",
        "AI/ML",
      ]);
      expect(skills.skills.find(({ id }) => id === "pyspark")?.name).toBe("Apache Spark / PySpark");
      expect(skills.skills.find(({ id }) => id === "etl-elt")?.name).toBe("ETL / ELT");
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

    it("configures common command aliases and no-result feedback", () => {
      expect(terminal.aliases["who are you"]).toBe("whoami");
      expect(terminal.aliases.cv).toBe("resume");
      expect(terminal.noResults("unknown term")).toBe("No results for 'unknown term'. Try: help");
    });
  });
});
