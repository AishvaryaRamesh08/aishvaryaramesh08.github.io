/**
 * Business and systems analysis (Req 16). Artifacts are illustrative and contain only fictional
 * or sample data (Req 16.3). The SVGs are not supplied yet; add each under src/assets/artifacts/,
 * replace the placeholder with `{ src, width, height }` and update `textAlternative` so it lists
 * the elements the final drawing shows (Req 16.7).
 */
import type { AnalysisConfig, Placeholder } from "./types";

const artifactSvg = (name: string): Placeholder => ({
  placeholder: true,
  expected: `${name} (SVG)`,
  width: 800,
  height: 600,
});

export const analysis = {
  items: [
    {
      title: "Requirements into specs",
      description: "I gather business requirements and translate them into specs that engineers can build and test against.",
    },
    {
      title: "User stories with acceptance criteria",
      description: "I write user stories with acceptance criteria, so everyone agrees on what done means before work starts.",
    },
    {
      title: "Sprint planning input",
      description: "I bring scope, dependencies and effort estimates into sprint planning.",
    },
    {
      title: "Stakeholder communication",
      description: "I keep product owners and stakeholders aligned on progress, trade-offs and open questions.",
    },
    {
      title: "Technical documentation",
      description: "I document pipelines, data models and decisions so the next person can run and change them.",
    },
  ],
  artifacts: [
    {
      kind: "data-flow",
      caption: "Sample data flow diagram",
      source: "coursework",
      svg: artifactSvg("data flow diagram"),
      textAlternative: {
        type: "Data flow diagram",
        elements: ["Customer", "Order entry process", "Payment process", "Orders data store", "Warehouse"],
      },
    },
    {
      kind: "erd",
      caption: "Entity relationship diagram",
      source: "coursework",
      svg: artifactSvg("ERD"),
      textAlternative: {
        type: "Entity relationship diagram",
        elements: ["Customer", "Order", "Order line", "Product"],
      },
    },
    {
      kind: "use-case",
      caption: "Use-case diagram",
      source: "coursework",
      svg: artifactSvg("use-case diagram"),
      textAlternative: {
        type: "Use-case diagram",
        elements: ["Student", "Advisor", "Register for course", "Approve schedule", "View degree plan"],
      },
    },
    {
      kind: "user-story",
      caption: "User story card",
      source: "product-tamu",
      svg: artifactSvg("user story card"),
      textAlternative: {
        type: "User story card",
        elements: ["Role", "Goal", "Benefit", "Acceptance criteria"],
      },
    },
  ],
  courses: ["Advanced Data Management", "Advanced Systems Analysis & Design", "Project Management"],
  caseChallenge: "Product@TAMU Mobile Productivity Leap (team case challenge)",
} satisfies AnalysisConfig;
