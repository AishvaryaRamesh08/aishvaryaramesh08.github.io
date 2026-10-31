/** Hero copy and portrait settings, kept editable outside the component. */
import type { IntroConfig } from "./types";

export const intro = {
  name: "Aishvarya Ramesh",
  availability: "Open to internships",
  titleLine: "Data Engineer · MS MIS, Texas A&M (Mays Business School)",
  focusAreas: [
    { label: "Data engineering", icon: "data" },
    { label: "AI", icon: "ai" },
    { label: "Analytics", icon: "analytics" },
    { label: "Visualization", icon: "visualization" },
  ],
  paragraph:
    "I'm a data engineer with four years at Wells Fargo building cloud data pipelines, now pursuing an MS in Management Information Systems at Texas A&M. I work on the path from raw source data to governed, analysis-ready tables, and on the systems analysis that decides what to build.",
  chips: [
    { finalText: "4", label: "years at Wells Fargo" },
    { finalText: "4.0", label: "GPA, MS MIS at Texas A&M" },
    { finalText: "3", label: "cloud certifications" },
  ],
  ctas: { work: "View my work", contact: "Contact", resume: "Download resume" },
  resumeUrl: "/resume.pdf",
  photoPath: "profile/headshot.jpg",
  photoAlt: "Portrait of Aishvarya Ramesh",
  useMonogramFallback: true,
} satisfies IntroConfig;
