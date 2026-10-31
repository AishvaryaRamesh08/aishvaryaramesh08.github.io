/**
 * Site-wide meta, section headings, Navbar groups and analytics (Req 3, 7.2, 25, 29).
 */
import { contact } from "./contact";
import type { SiteConfig } from "./types";

const ownerName = "Aishvarya Ramesh";

export const site = {
  ownerName,
  pageTitle: "Aishvarya Ramesh · Data Engineer", // 1–60 chars, contains ownerName (Req 29.1)
  metaDescription:
    "Aishvarya Ramesh is a Data Engineer and MS MIS student at Texas A&M, building cloud data pipelines and analysis-ready data systems.",
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
    home: { heading: ownerName, eyebrow: "00 / About" },
    work: { heading: "Selected work", eyebrow: "01 / Work" },
    skills: { heading: "Skills", eyebrow: "02 / Skills" },
    journey: { heading: "Journey", eyebrow: "03 / Journey" },
    contact: { heading: contact.headline, eyebrow: "04 / Contact" },
  },
  navGroups: [
    { id: "about", label: "About", sections: ["home"] },
    { id: "work", label: "Work", sections: ["work"] },
    { id: "skills", label: "Skills", sections: ["skills"] },
    { id: "journey", label: "Journey", sections: ["journey"] },
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
