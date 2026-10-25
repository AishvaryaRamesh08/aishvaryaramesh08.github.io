/**
 * Screen 2, Introduction (Req 9). Chip values come from the Owner's resume only (Req 9.8).
 */
import type { IntroConfig } from "./types";

export const intro = {
  name: "Aishvarya Ramesh",
  titleLine: "Data Engineer · MS MIS @ Texas A&M (Mays Business School) · Ex-Wells Fargo",
  typewriterLines: ["I build data pipelines.", "I turn messy data into decisions.", "I get data ready for AI."],
  // Owner-editable; initial value from Req 9.4.
  paragraph:
    "I'm a data engineer who spent four years at Wells Fargo building cloud pipelines and automating data loads at scale, and I'm now studying Management Information Systems at Texas A&M to pair that engineering depth with business and systems analysis. I care about the full chain: getting data in, making it trustworthy, showing it clearly, and preparing it for AI.",
  chips: [
    { finalText: "4", label: "years in data engineering" },
    { finalText: "50+", label: "tables migrated to BigQuery" },
    { finalText: "3", label: "cloud certifications" },
  ],
  ctas: { explore: "Explore my work", talk: "Let's talk", resume: "Download resume" },
} satisfies IntroConfig;
