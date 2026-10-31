import type { SkillId } from "./types";

export type WorkDiagram =
  | { kind: "pipeline"; stages: readonly string[]; title: string; description: string }
  | {
      kind: "dependency";
      title: string;
      description: string;
      caption: string;
      interactionHint: string;
      failedLabel: string;
      downstreamLabel: string;
      failedJobId: string;
      jobs: readonly { id: string; label: string; x: number; y: number }[];
      edges: readonly { from: string; to: string }[];
    };

export interface FeaturedWorkItem {
  id: string;
  title: string;
  context: string;
  badge?: string;
  summary: string;
  challenge?: string;
  approach: string;
  outcome?: string;
  tech: readonly { id: SkillId; label: string }[];
  diagram?: WorkDiagram;
}

export interface MoreProject {
  title: string;
  context?: string;
  description: string;
}

export const work = {
  dialog: {
    closeLabel: "Close project details",
    challenge: "Challenge",
    approach: "Approach",
    outcome: "Outcome",
    tech: "Tech",
    techLabel: "Technologies used",
    viewDetails: "View details",
    moreProjects: "More projects",
  },
  featured: [
    {
      id: "cloud-migration",
      title: "Migrating 50+ tables to the cloud",
      context: "Wells Fargo",
      summary: "Greenfield ELT pipeline on GCP moving on-prem sources into BigQuery.",
      challenge:
        "Fragmented on-premise source data, including PII, needed to become unified, business-ready tables.",
      approach:
        "Built an ELT pipeline in Python, SQL and Airflow that moves 50+ tables into BigQuery through raw, staging, sanitized and conformed layers, with deduplication and incremental refresh logic.",
      outcome:
        "Delivered all requirements within the deadline and iteratively improved the pipeline from business user feedback.",
      tech: [
        { id: "gcp", label: "GCP" },
        { id: "bigquery", label: "BigQuery" },
        { id: "airflow", label: "Airflow" },
        { id: "python", label: "Python" },
        { id: "sql", label: "SQL" },
      ],
      diagram: {
        kind: "pipeline",
        title: "Five-layer ELT pipeline",
        description: "Data flows from Source through Raw, Staging and Sanitized into Conformed.",
        stages: ["Source", "Raw", "Staging", "Sanitized", "Conformed"],
      },
    },
    {
      id: "autosys-visualizer",
      title: "GenAI Autosys dependency visualizer",
      context: "Wells Fargo",
      badge: "Spotlight Award",
      summary: "A GenAI-powered tool that shows job dependencies and failure impact.",
      challenge:
        "Application support teams needed to trace dependencies and judge the impact of failures across production workloads.",
      approach:
        "Coordinated and led a team to build a GenAI-powered Autosys job-dependency visualization solution.",
      outcome: "Earned a Spotlight Award for the work.",
      tech: [],
      diagram: {
        kind: "dependency",
        title: "Job dependency failure impact",
        description:
          "Illustrative dependency graph. Focus or activate a fictional job to mark it failed and highlight downstream jobs.",
        caption: "Illustrative demo, fictional jobs",
        interactionHint: "Focus or activate to simulate failure impact.",
        failedLabel: "failed",
        downstreamLabel: "downstream impact",
        failedJobId: "source-orders",
        jobs: [
          { id: "source-orders", label: "source_orders", x: 18, y: 30 },
          { id: "source-customers", label: "source_customers", x: 18, y: 102 },
          { id: "validate-orders", label: "validate_orders", x: 164, y: 30 },
          { id: "validate-customers", label: "validate_customers", x: 164, y: 102 },
          { id: "build-dim", label: "build_customer_dim", x: 310, y: 102 },
          { id: "build-facts", label: "build_order_facts", x: 310, y: 30 },
          { id: "publish-mart", label: "publish_sales_mart", x: 456, y: 66 },
          { id: "refresh-report", label: "refresh_report", x: 602, y: 66 },
        ],
        edges: [
          { from: "source-orders", to: "validate-orders" },
          { from: "source-customers", to: "validate-customers" },
          { from: "validate-customers", to: "build-dim" },
          { from: "validate-orders", to: "build-facts" },
          { from: "build-dim", to: "build-facts" },
          { from: "build-facts", to: "publish-mart" },
          { from: "publish-mart", to: "refresh-report" },
        ],
      },
    },
    {
      id: "etl-at-scale",
      title: "Automated ETL at scale",
      context: "Wells Fargo",
      summary: "UNIX shell + PySpark pipeline loading time-critical files into SQL Server.",
      approach:
        "Built an automated ETL pipeline using UNIX shell scripting and distributed PySpark processing, covering 200+ subject matter areas.",
      outcome: "Reduced development time by roughly 75% for a four-person team.",
      tech: [
        { id: "pyspark", label: "PySpark" },
        { id: "unix", label: "UNIX shell" },
        { id: "sql-server", label: "SQL Server" },
      ],
    },
    {
      id: "lakehouse-rag",
      title: "Enterprise Data Lakehouse & RAG pipeline",
      context: "AWS",
      badge: "In progress",
      summary: "Messy multi-source ERP data into a governed 3NF schema, prepared for retrieval.",
      approach:
        "Provision an AWS EC2 environment and build an ELT pipeline with SQL, Python and regex-based cleaning to load a messy multi-source ERP dataset into a normalized 3NF schema with validated referential integrity; implement audit triggers, generated columns and role-based security views; prepare RAG-ready payloads for a vector database.",
      tech: [
        { id: "aws", label: "AWS" },
        { id: "sql", label: "SQL" },
        { id: "python", label: "Python" },
      ],
    },
  ],
  moreProjects: [
    {
      title: "GenAI test-data generation",
      context: "Wells Fargo",
      description: "Microsoft Copilot produced 100+ records across 200 tables from DDLs within hours.",
    },
    {
      title: "Stock market analysis and conversational AI assistant",
      description:
        "Plotly/Dash candlestick platform with a Random Forest classifier (97.36% accuracy on engulfing patterns) and a Rasa assistant.",
    },
    {
      title: "Incident-management dashboard",
      context: "Kimberly-Clark",
      description: "Power BI dashboard with automated daily refreshes, recognized by the Global CIO.",
    },
  ],
} satisfies {
  dialog: Record<string, string>;
  featured: readonly FeaturedWorkItem[];
  moreProjects: readonly MoreProject[];
};
