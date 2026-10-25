/**
 * Cloud certifications in Req 18.1 order. Logos are not supplied yet; add each under
 * src/assets/logos/ and replace the placeholder with `{ src, width, height, alt }`.
 * Credential URLs are not supplied yet, so each Verify link renders as "Pending" (Req 18.4).
 */
import type { Certification, Placeholder } from "./types";

const logo = (issuer: string): Placeholder => ({
  placeholder: true,
  expected: `${issuer} logo`,
  width: 96,
  height: 96,
});

export const certifications = [
  {
    id: "gcp-cloud-digital-leader",
    name: "Google Cloud Certified – Cloud Digital Leader",
    issuer: "Google Cloud",
    logo: logo("Google Cloud"),
    meaning: "I can map business needs to Google Cloud data and AI services when scoping BigQuery pipelines.",
  },
  {
    id: "azure-ai-fundamentals",
    name: "Microsoft Certified – Azure AI Fundamentals",
    issuer: "Microsoft",
    logo: logo("Microsoft"),
    meaning: "I know the core Azure AI services and responsible AI principles to weigh when preparing data for AI.",
  },
  {
    id: "azure-fundamentals",
    name: "Microsoft Certified – Azure Fundamentals",
    issuer: "Microsoft",
    logo: logo("Microsoft"),
    meaning: "I understand Azure core services, pricing and governance, so I can compare cloud options for data work.",
  },
] satisfies readonly Certification[];
