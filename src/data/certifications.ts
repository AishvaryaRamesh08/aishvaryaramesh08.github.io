import type { Certification } from "./types";

export const certifications = [
  {
    id: "gcp-cloud-digital-leader",
    issuer: "Google Cloud Certified",
    name: "Cloud Digital Leader",
    description: "Cloud fundamentals and the business value of Google Cloud.",
  },
  {
    id: "azure-ai-fundamentals",
    issuer: "Microsoft Certified",
    name: "Azure AI Fundamentals",
    description: "AI and machine learning concepts and Azure AI services.",
  },
  {
    id: "azure-fundamentals",
    issuer: "Microsoft Certified",
    name: "Azure Fundamentals",
    description: "Core Azure services, pricing and governance.",
  },
] satisfies readonly Certification[];
