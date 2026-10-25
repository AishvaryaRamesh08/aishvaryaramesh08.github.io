/**
 * Journey_Chart data (Req 19.4, 19.5): a typed array of { label, approxYear, detail }. Edit the
 * text here and rebuild; the chart component needs no change. Years are approximate only.
 */
import type { JourneyConfig } from "./types";

export const journey = [
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
] satisfies JourneyConfig;
