/**
 * How I think about data (Req 11). Together the explanations name deduplication, PII handling,
 * incremental refresh, validation, referential integrity and governance (Req 11.4).
 */
import type { PipelineConfig } from "./types";

export const pipeline = {
  stages: [
    {
      id: "source",
      name: "Source",
      explanation:
        "Operational systems, files and APIs where data starts. Each source gets an owner, a format, a refresh schedule and a list of fields that carry PII.",
    },
    {
      id: "raw",
      name: "Raw",
      explanation:
        "An unchanged landing copy of each source, so every later layer can be rebuilt and audited. Loads use incremental refresh, pulling only new or changed records.",
    },
    {
      id: "staging",
      name: "Staging",
      explanation:
        "Types are cast, column names standardized, and deduplication removes repeated records so each business key appears once.",
    },
    {
      id: "sanitized",
      name: "Sanitized",
      explanation:
        "PII handling happens here: sensitive fields are masked, tokenized or dropped before data moves on. Validation checks on nulls, ranges and formats flag bad rows.",
    },
    {
      id: "conformed",
      name: "Conformed",
      explanation:
        "Tables are modeled to shared definitions and keys. Referential integrity checks confirm every foreign key has a matching parent record.",
    },
    {
      id: "insights-ai",
      name: "Insights / AI",
      explanation:
        "Dashboards, analysis and AI use cases read only conformed data. Governance covers access roles, lineage and documented definitions, so people know what each number means.",
    },
  ],
  groundingNote: "Grounded in the layered ELT architecture I built on GCP/BigQuery at Wells Fargo.",
} satisfies PipelineConfig;
