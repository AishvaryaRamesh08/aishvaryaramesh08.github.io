/**
 * Featured work Case_Studies in Req 12.1 order. Figures, employers, awards and outcomes are taken
 * from the Owner's resume as stated in the requirements (Req 12.10, 31.1); anything not supplied
 * yet is a Placeholder (Req 31.2).
 *
 * Architecture diagrams are not supplied yet. Add each SVG under src/assets/diagrams/ and replace
 * the placeholder with `{ src, width, height, components, flow }`, using fictional system names
 * only (Req 31.3).
 */
import type { CaseStudy, Placeholder } from "./types";

const diagram = (name: string): Placeholder => ({
  placeholder: true,
  expected: `architecture diagram: ${name} (SVG)`,
  width: 960,
  height: 540,
});

export const projects = [
  {
    id: "cloud-migration",
    title: "Migrating 50+ tables to the cloud",
    org: "Wells Fargo",
    summary:
      "Greenfield ELT on GCP with Python, SQL and Airflow, moving on-prem sources including PII data into BigQuery through raw, staging, sanitized and conformed layers with deduplication and incremental refresh.",
    challenge:
      "Move 50+ on-prem tables, including PII data, into BigQuery on a greenfield GCP platform, and keep the data trustworthy and current after the move.",
    approach:
      "Built ELT pipelines in Python, SQL and Airflow that land each source in a raw layer and promote it through staging, sanitized and conformed layers, with deduplication and incremental refresh along the way.",
    architecture: diagram("cloud migration ELT layers"),
    outcome: "50+ tables migrated into BigQuery through a layered, repeatable pipeline.",
    tech: ["python", "sql", "airflow", "gcp", "bigquery", "etl-elt", "data-pipelines", "data-warehousing"],
  },
  {
    id: "autosys-visualizer",
    title: "GenAI Autosys dependency visualizer",
    org: "Wells Fargo",
    award: "Spotlight Award",
    summary: "Interactive graph of job dependencies and failure impact.",
    challenge: "When a scheduled job fails, the team needs to see quickly which downstream jobs it affects.",
    approach:
      "Led a GenAI-assisted tool that turns job dependencies into an interactive graph showing failure impact. The demo below uses fictional jobs.",
    architecture: diagram("dependency visualizer"),
    outcome: "Recognized with a Spotlight Award.",
    tech: ["generative-ai", "llms"],
    demo: "dependency-demo",
  },
  {
    id: "etl-at-scale",
    title: "Automated ETL at scale",
    org: "Wells Fargo",
    summary:
      "UNIX shell + PySpark loading time-critical files into SQL Server across 200+ subject areas, cutting development time by about 75% for a four-person team.",
    challenge: "Time-critical files across 200+ subject areas had to load into SQL Server reliably.",
    approach: "Automated the loads with UNIX shell scripts and PySpark.",
    architecture: diagram("automated ETL loads"),
    outcome: "Cut development time by about 75% for a four-person team.",
    tech: ["unix", "pyspark", "sql-server", "etl-elt", "data-pipelines"],
  },
  {
    id: "genai-test-data",
    title: "GenAI test-data generation",
    summary: "Microsoft Copilot producing 100+ records across 200 tables from DDLs within hours.",
    challenge: "Testing needed realistic data across 200 tables.",
    approach: "Used Microsoft Copilot to generate records directly from the table DDLs.",
    architecture: diagram("GenAI test-data generation"),
    outcome: "100+ records across 200 tables, produced within hours.",
    tech: ["generative-ai", "llms", "microsoft-copilot", "sql"],
  },
  {
    id: "lakehouse-rag",
    title: "Enterprise Data Lakehouse & RAG Pipeline",
    summary:
      "On AWS: messy multi-source ERP data into a normalized 3NF schema with validated referential integrity, audit triggers, generated columns and role-based security views, feeding a vector database for natural-language retrieval.",
    workInProgress: true,
    challenge: "Messy ERP data from multiple sources needs one trustworthy schema before it can feed AI retrieval.",
    approach:
      "Normalizing the data into a 3NF schema with validated referential integrity, audit triggers, generated columns and role-based security views, then loading a vector database for natural-language retrieval.",
    architecture: diagram("lakehouse and RAG pipeline"),
    outcome: { placeholder: true, expected: "Lakehouse & RAG outcome (project in progress)" },
    tech: ["aws", "sql", "data-transformation", "data-warehousing", "rag", "generative-ai"],
  },
  {
    id: "stock-analysis",
    title: "Stock Market Analysis and Conversational AI Assistant",
    summary:
      "Plotly/Dash candlestick platform, Random Forest classifier (97.36% accuracy on engulfing patterns), Rasa voice/text assistant.",
    challenge: "Make candlestick patterns easy to explore and to ask questions about.",
    approach:
      "Built a Plotly/Dash candlestick platform, trained a Random Forest classifier on engulfing patterns, and added a Rasa voice/text assistant on top.",
    architecture: diagram("stock analysis platform"),
    outcome: "97.36% accuracy on engulfing patterns.",
    tech: ["python", "plotly", "dash", "machine-learning", "rasa-nlu"],
  },
  {
    id: "powerbi-incidents",
    title: "Power BI incident dashboard",
    org: "Kimberly-Clark",
    summary: "Replaced manual reporting with automated daily refreshes, recognized by the Global CIO.",
    challenge: "Incident reporting was manual.",
    approach: "Built an org-wide Power BI incident-management dashboard with automated daily refreshes.",
    architecture: diagram("Power BI incident dashboard"),
    outcome: "Replaced manual reporting with automated daily refreshes, recognized by the Global CIO.",
    tech: ["power-bi"],
  },
] satisfies readonly CaseStudy[];
