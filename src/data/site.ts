/**
 * Site-wide meta, section headings, Navbar groups and analytics (Req 3, 7.2, 25, 29).
 */
import { contact } from "./contact";
import { terminal } from "./terminal";
import type { SiteConfig } from "./types";

const ownerName = "Aishvarya Ramesh";

export const site = {
  ownerName,
  pageTitle: "Aishvarya Ramesh · Data Engineer", // 1–60 chars, contains ownerName (Req 29.1)
  metaDescription:
    "Aishvarya Ramesh, data engineer and MS MIS student at Texas A&M. Pipelines, visualization and systems analysis, from raw data to decisions.",
  jobTitle: "Data Engineer",
  alumniOf: ["Texas A&M University", "M S Ramaiah Institute of Technology"],
  // public/og-image.png is a plain 1200×630 stand-in so the build-time asset checks pass; task 24.1
  // replaces it with the labelled placeholder.
  ogImage: {
    src: "og-image.png",
    width: 1200,
    height: 630,
    alt: "Aishvarya Ramesh: Data Engineer · Analyst · Systems Thinker. From raw data to decisions.",
  },
  sections: {
    // The Intro_Screen heading is the page's single h1, the Owner's name (Req 9.1).
    intro: { heading: ownerName },
    work: { heading: "Featured work" },
    skills: { heading: "Tech constellation" },
    certifications: { heading: "Cloud certifications" },
    terminal: { heading: terminal.heading },
    journey: { heading: "Journey" },
    "built-with-ai": { heading: "Built with AI: how this site was made" },
    analysis: { heading: "Business and systems analysis" },
    story: { heading: "Why I love data" },
    contact: { heading: contact.headline },
  },
  // Each rendered section is covered once; Story includes the introduction and the final story section.
  navGroups: [
    { id: "story", label: "Story", sections: ["intro", "story"] },
    { id: "work", label: "Work", sections: ["work"] },
    { id: "skills", label: "Skills", sections: ["skills", "certifications", "terminal"] },
    { id: "journey", label: "Journey", sections: ["journey"] },
    { id: "built-with-ai", label: "Built with AI", sections: ["built-with-ai"] },
    { id: "analysis", label: "Analysis", sections: ["analysis"] },
    { id: "contact", label: "Contact", sections: ["contact"] },
  ],
  footer: {
    builtWith: "Built with Kiro, Claude and Copilot",
    linkedinName: "LinkedIn profile",
    githubName: "GitHub profile",
    linkedinExpected: "LinkedIn URL",
    githubExpected: "GitHub URL",
    backToTop: "Back to top",
  },
  // No GoatCounter site code yet: no analytics code ships (Req 25.6). VITE_GOATCOUNTER_CODE overrides.
  analytics: {},
} satisfies SiteConfig;
