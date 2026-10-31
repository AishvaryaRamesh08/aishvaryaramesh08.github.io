/**
 * Skill_Constellation clusters and skills (Req 17.2). Each skill is listed once; BigQuery belongs
 * to both Cloud and Databases (Req 17.3).
 *
 * Cluster order follows the emphasis priority (Req 31.7): data engineering (with its Cloud and
 * Databases platforms), analysis and visualization, systems and delivery, then AI/ML.
 */
import type { SkillsConfig } from "./types";

export const skills = {
  skills: [
    { id: "python", name: "Python" },
    { id: "sql", name: "SQL" },
    { id: "pyspark", name: "Apache Spark / PySpark" },
    { id: "airflow", name: "Airflow" },
    { id: "etl-elt", name: "ETL / ELT" },
    { id: "ssis", name: "SSIS" },
    { id: "unix", name: "UNIX" },
    { id: "data-pipelines", name: "Data pipelines" },
    { id: "data-warehousing", name: "Data warehousing" },
    { id: "data-transformation", name: "Data transformation" },
    { id: "aws", name: "AWS" },
    { id: "gcp", name: "GCP" },
    { id: "bigquery", name: "BigQuery" },
    { id: "azure", name: "Azure" },
    { id: "sql-server", name: "SQL Server" },
    { id: "oracle", name: "Oracle" },
    { id: "power-bi", name: "Power BI" },
    { id: "plotly", name: "Plotly" },
    { id: "dash", name: "Dash" },
    { id: "excel", name: "Excel" },
    { id: "agile", name: "Agile" },
    { id: "jira", name: "Jira" },
    { id: "git", name: "Git" },
    { id: "requirements-gathering", name: "Requirements gathering" },
    { id: "stakeholder-communication", name: "Stakeholder communication" },
    { id: "technical-documentation", name: "Technical documentation" },
    { id: "generative-ai", name: "Generative AI" },
    { id: "llms", name: "LLMs" },
    { id: "microsoft-copilot", name: "Microsoft Copilot" },
    { id: "machine-learning", name: "Machine learning" },
    { id: "rasa-nlu", name: "Rasa NLU" },
    { id: "rag", name: "RAG" },
  ],
  clusters: [
    {
      id: "data-engineering",
      name: "Data engineering",
      skills: [
        "python",
        "sql",
        "pyspark",
        "airflow",
        "etl-elt",
        "ssis",
        "unix",
        "data-pipelines",
        "data-warehousing",
        "data-transformation",
      ],
    },
    { id: "cloud", name: "Cloud", skills: ["aws", "gcp", "bigquery", "azure"] },
    { id: "databases", name: "Databases", skills: ["sql-server", "oracle", "bigquery"] },
    { id: "analysis-visualization", name: "Analysis and visualization", skills: ["power-bi", "plotly", "dash", "excel"] },
    {
      id: "systems-delivery",
      name: "Systems and delivery",
      skills: ["agile", "jira", "git", "requirements-gathering", "stakeholder-communication", "technical-documentation"],
    },
    {
      id: "ai-ml",
      name: "AI/ML",
      skills: ["generative-ai", "llms", "microsoft-copilot", "machine-learning", "rasa-nlu", "rag"],
    },
  ],
} satisfies SkillsConfig;
