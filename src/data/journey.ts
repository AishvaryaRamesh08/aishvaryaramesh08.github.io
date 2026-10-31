import type { JourneyConfig } from "./types";

export const journey = [
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
] satisfies JourneyConfig;
