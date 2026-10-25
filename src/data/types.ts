/**
 * Content_Config types (Req 4.1, 4.2, 4.3).
 *
 * Every `/src/data/*.ts` content file exports a constant checked with `satisfies <Type>`, so a
 * missing required field or a wrong-typed field fails `tsc --noEmit` with the offending file and
 * property. Optional fields are marked with `?`; everything else is required.
 *
 * Owner-supplied assets that may not exist yet use `Slot<T>`: either the real value or a
 * `Placeholder` that renders as a labelled Placeholder_Asset (Req 4.5).
 */

// ---------- shared ----------

/**
 * Marks an Owner-supplied asset (image, text or URL) as not yet provided (Req 4.5).
 * Image placeholders may declare the box the real asset will occupy, so the layout does not
 * shift when it arrives; slots that already carry a declared box (e.g. `SizedSlot`) omit them.
 */
export type Placeholder = {
  readonly placeholder: true;
  readonly expected: string;
  readonly width?: number;
  readonly height?: number;
};

/** Either the real asset or a Placeholder for it. */
export type Slot<T> = T | Placeholder;

/** Narrows a Slot to its Placeholder branch. Strings, numbers, arrays and real objects are not placeholders. */
export const isPlaceholder = <T,>(s: Slot<T>): s is Placeholder =>
  typeof s === "object" && s !== null && (s as Placeholder).placeholder === true;

/** Path relative to `/src/assets/`; the extension is checked at compile time (Req 30.3). */
export type RasterPath = `${string}.webp` | `${string}.avif`;
export type VectorPath = `${string}.svg`;
export type AssetPath = RasterPath | VectorPath;
/** Short video path relative to `/src/assets/` (Viz_Stage screen recordings). */
export type VideoPath = `${string}.webm` | `${string}.mp4`;
export type HttpsUrl = `https://${string}`;

export interface ImageAsset {
  /** Resolved to a hashed URL by `assets.ts` (import.meta.glob ?url). */
  src: AssetPath;
  /** Declared intrinsic px; the `intrinsicSize` validator checks it against the file header. */
  width: number;
  height: number;
  /** Non-empty text alternative. */
  alt: string;
}

/** Declared box is required even while the image is a placeholder (Req 8.4). */
export interface SizedSlot {
  width: number;
  height: number;
  alt: string;
  image: Slot<{ src: AssetPath }>;
}

export type SectionId =
  | "site-nav"
  | "hook"
  | "intro"
  | "story"
  | "work"
  | "analysis"
  | "skills"
  | "certifications"
  | "terminal"
  | "journey"
  | "built-with-ai"
  | "contact"
  | "site-footer";

export type NavGroupId =
  | "story"
  | "work"
  | "analysis"
  | "skills"
  | "journey"
  | "built-with-ai"
  | "contact";

/** Sections that render an h2 heading from `site.sections` (Hook is labelled by its headline). */
export type HeadedSectionId = Exclude<SectionId, "site-nav" | "site-footer" | "hook">;

// ---------- site.ts (meta, sections, nav, links, analytics) ----------

export interface NavGroup {
  id: NavGroupId;
  label: string;
  /** Sections covered by this link; the first one is the scroll target (Req 7.2). */
  sections: readonly SectionId[];
}

export interface SiteConfig {
  /** "Aishvarya Ramesh" */
  ownerName: string;
  /** 1–60 chars, contains ownerName (validated, Req 29.1). */
  pageTitle: string;
  /** 50–160 chars (validated, Req 29.1). */
  metaDescription: string;
  /** JSON-LD jobTitle. */
  jobTitle: string;
  /** JSON-LD alumniOf. */
  alumniOf: readonly string[];
  /** Served from /public; validated as exactly 1200 × 630 and ≤ 1 MB (Req 29.3). */
  ogImage: { src: "og-image.png"; width: 1200; height: 630; alt: string };
  sections: Record<HeadedSectionId, { heading: string; minHeight?: string }>;
  /** Every rendered content section belongs to one navigation group. */
  navGroups: readonly NavGroup[];
  /** Footer microcopy (Req 22): the colophon, social-link names and back-to-top label. */
  footer: {
    /** Footer technology credit. */
    builtWith: string;
    /** Accessible names for the social icon links, e.g. "LinkedIn profile" (Req 22.2). */
    linkedinName: string;
    githubName: string;
    /** Expected-asset labels for placeholder social links when a URL is absent (Req 22.3). */
    linkedinExpected: string;
    githubExpected: string;
    /** Back-to-top control label, indicating "Back to top" (Req 22.4). */
    backToTop: string;
  };
  /** env VITE_GOATCOUNTER_CODE overrides (Req 25.1, 25.6). */
  analytics: { goatcounterCode?: string };
}

export interface ContactLinks {
  /** mailto:Aishvarya.ramesh@tamu.edu */
  email: `mailto:${string}`;
  linkedin: Slot<HttpsUrl>;
  github: Slot<HttpsUrl>;
  /** Path under /public; availability checked at build (Req 9.10). */
  resumePdf: Slot<`${string}.pdf`>;
}

// ---------- hook.ts ----------

export interface HookConfig {
  /** Two visually paired parts of the hook headline. */
  headline: { before: string; after: string };
  subline: string;
  /** "Meet the engineer ↓" */
  primaryCta: { label: string; target: "intro" };
  /** A second route into the featured work. */
  secondaryCta: { label: string; target: "work" };
  /** The Hook_Arrow is decorative only (Req 8.14). */
  arrowLabel?: never;
}

export interface HookImages {
  /** Raw CSV preview panel metadata. */
  hookBefore: SizedSlot;
  /** Interactive Plotly panel metadata; the placeholder image slot carries its fixed dimensions. */
  hookAfter: SizedSlot;
}

// ---------- intro.ts ----------

export interface StatChip {
  /** "4", "50+", "3" — the exact final text after count-up (Req 9.6). */
  finalText: string;
  /** e.g. "tables migrated to BigQuery" */
  label: string;
}

export interface IntroConfig {
  name: string;
  titleLine: string;
  typewriterLines: readonly [string, string, string];
  paragraph: Slot<string>;
  chips: readonly [StatChip, StatChip, StatChip];
  ctas: { explore: string; talk: string; resume: string };
}

// ---------- story.ts ----------

export interface StoryConfig {
  /** Paragraphs, rendered verbatim in order. */
  quote: Slot<readonly string[]>;
}

// ---------- pipeline.ts ----------

export type PipelineStageName = "Source" | "Raw" | "Staging" | "Sanitized" | "Conformed" | "Insights / AI";

export interface PipelineStage {
  id: string;
  name: PipelineStageName;
  explanation: Slot<string>;
}

export interface PipelineConfig {
  stages: readonly [PipelineStage, PipelineStage, PipelineStage, PipelineStage, PipelineStage, PipelineStage];
  groundingNote: string;
}

// ---------- skills.ts ----------

/** Every distinct skill in Req 17.2; BigQuery appears once and belongs to two clusters. */
export const skillIds = [
  // Data engineering
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
  // Cloud
  "aws",
  "gcp",
  "bigquery",
  "azure",
  // Databases (BigQuery shared with Cloud)
  "sql-server",
  "oracle",
  // Analysis and visualization
  "power-bi",
  "plotly",
  "dash",
  "excel",
  // AI/ML
  "generative-ai",
  "llms",
  "microsoft-copilot",
  "machine-learning",
  "rasa-nlu",
  "rag",
  // Systems and delivery
  "agile",
  "jira",
  "git",
  "requirements-gathering",
  "stakeholder-communication",
  "technical-documentation",
] as const;
export type SkillId = (typeof skillIds)[number];

export interface Skill {
  id: SkillId;
  name: string;
}

export interface SkillCluster {
  id: string;
  name: string;
  skills: readonly SkillId[];
}

export interface SkillsConfig {
  /** Each skill once. */
  skills: readonly Skill[];
  /** BigQuery is listed in two clusters (Req 17.3). */
  clusters: readonly SkillCluster[];
}

// ---------- projects.ts ----------

export type ProjectId = string;

export interface ArchitectureDiagram {
  src: VectorPath;
  width: number;
  height: number;
  /** Every component shown, for the text alternative (Req 12.8). */
  components: readonly string[];
  /** Direction of data flow between the components. */
  flow: string;
}

export interface CaseStudy {
  id: ProjectId;
  title: string;
  org?: string;
  /** Resume wording only (Req 31.1). */
  award?: string;
  summary: string;
  /** Lakehouse & RAG (Req 12.7). */
  workInProgress?: boolean;
  challenge: Slot<string>;
  approach: Slot<string>;
  architecture: Slot<ArchitectureDiagram>;
  outcome: Slot<string>;
  /** Must reference skills.ts ids (type-checked). */
  tech: readonly SkillId[];
  demo?: "dependency-demo";
}

// ---------- dependencyDemo.ts ----------

export type JobId = string;

/** `to` runs after `from`; failure flows from → to. */
export interface DependencyEdge {
  from: JobId;
  to: JobId;
}

export interface DependencyDemoConfig {
  /** 5–30, fictional names only (Req 13.1, 31.3). */
  jobs: readonly { id: JobId; label: string }[];
  /** Validated against jobs (Req 13.2). */
  edges: readonly DependencyEdge[];
}

// ---------- viz.ts ----------

export type VizMedia =
  /** Reuse of the hook entries, no duplicate file (Req 4.7, 14.2). */
  | { kind: "hook"; key: "hookBefore" | "hookAfter" }
  /** Image under src/assets/viz/. */
  | { kind: "image"; asset: Slot<ImageAsset> }
  | { kind: "video"; src: VideoPath; poster: ImageAsset; width: number; height: number };

export interface VizStage {
  number: 1 | 2 | 3 | 4;
  /** "Raw CSV", "Plotly", "Dash", "Dash + assistant" */
  name: string;
  media: VizMedia;
  /** ≥ 1 annotation callout (Req 14.9). */
  callouts: readonly [string, ...string[]];
  /** 2–3 bullets, each ≤ 120 chars (validated, Req 14.16). */
  changes: readonly string[];
}

export interface VizConfig {
  /** Stage 4 is optional; when absent no slot is rendered (Req 14.4). */
  stages: readonly [VizStage, VizStage, VizStage] | readonly [VizStage, VizStage, VizStage, VizStage];
  dashDemoUrl?: HttpsUrl;
}

// ---------- liveDemo.ts ----------

export interface RangeButton {
  label: string;
  count?: number;
  step?: "month";
  all?: true;
}

export interface LiveDemoConfig {
  /** Fixed seed, e.g. 20260418 (Req 15.11). */
  seed: number;
  /** "SAMPLE" */
  symbol: string;
  startDate: `${number}-${number}-${number}`;
  /** e.g. 180 */
  tradingDays: number;
  startPrice: number;
  drift: number;
  volatility: number;
  datasetPath: "data/ohlc-sample.json";
  /** ≥ 2 presets plus an "all" option (Req 15.4). */
  rangeButtons: readonly RangeButton[];
  /** Includes "synthetic sample data" (Req 15.8, 15.10). */
  description: string;
}

/** Columnar dataset matching Plotly's input shape; all columns have equal length. */
export interface OhlcDataset {
  version: 1;
  seed: number;
  symbol: string;
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
}

// ---------- analysis.ts ----------

export interface AnalysisItem {
  title: string;
  /** At least one sentence (Req 16.1). */
  description: string;
}

export interface Artifact {
  kind: "data-flow" | "erd" | "use-case" | "user-story";
  caption: string;
  source: "coursework" | "product-tamu";
  svg: Slot<{ src: VectorPath; width: number; height: number }>;
  /** Artifact type and main elements depicted (Req 16.7). */
  textAlternative: { type: string; elements: readonly string[] };
}

export interface AnalysisConfig {
  items: readonly [AnalysisItem, AnalysisItem, AnalysisItem, AnalysisItem, AnalysisItem];
  artifacts: readonly [Artifact, Artifact, Artifact, Artifact];
  courses: readonly [string, string, string];
  /** "Product@TAMU Mobile Productivity Leap (team case challenge)" */
  caseChallenge: string;
}

// ---------- certifications.ts ----------

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  logo: Slot<ImageAsset>;
  /** ≤ 120 chars (validated, Req 18.2). */
  meaning: string;
  /** Verify is enabled only for an absolute https:// URL (runtime check, Req 18.4). */
  credentialUrl?: string;
}

// ---------- journey.ts (exact Owner shape, Req 19.4) ----------

export interface JourneyStage {
  label: string;
  approxYear: string;
  detail: string;
}

/** Non-empty, no blank fields (validated, Req 19.10). */
export type JourneyConfig = readonly JourneyStage[];

// ---------- builtWithAi.ts ----------

export interface TimelineStep {
  title: string;
  aiDid: Slot<string>;
  ownerDecided: Slot<string>;
  ownerLearned: Slot<string>;
}

export interface BuiltWithAiConfig {
  intro: string;
  /** Exactly 7, fixed order (validated by title list, Req 20.1). */
  steps: readonly TimelineStep[];
  artifacts: {
    requirementsExcerpt: Slot<string>;
    tasksExcerpt: Slot<string>;
    promptExample: Slot<string>;
    kiroScreenshot: Slot<ImageAsset>;
    actionsScreenshot: Slot<ImageAsset>;
    captions: Record<"requirements" | "tasks" | "prompt" | "kiro" | "actions", string>;
  };
  reflection: { didWell: readonly string[]; steppedIn: readonly string[] };
}

// ---------- contact.ts ----------

export interface ContactConfig {
  /** Contact section headline. */
  headline: string;
  /** Public by design (Req 21.12); env VITE_WEB3FORMS_KEY overrides. */
  web3formsAccessKey?: string;
  subject: string;
  limits: { name: 100; email: 254; message: 5000 };
  messages: { sending: string; success: string; error: string; mailtoLabel: string };
  /** Shared with the Footer and the Terminal_Widget. */
  links: ContactLinks;
}

// ---------- terminal.ts ----------

export type TerminalCommand = "whoami" | "skills" | "projects" | "certs" | "contact" | "help" | "clear";

export interface TerminalConfig {
  heading: string;
  inputLabel: string;
  /** "visitor@aishvarya:~$" */
  prompt: string;
  /** One-line descriptions (Req 24.9). */
  help: Record<TerminalCommand, string>;
  /** Message for an unrecognized (normalized) command (Req 24.4). */
  unknown: (cmd: string, supported: readonly TerminalCommand[]) => string;
  maxHistory: 50;
}

export interface TerminalEntry {
  id: number;
  command: string;
  output: readonly string[];
}

// ---------- background.ts ----------

/** 0 < speed < 1, distinct across layers (Req 6.3). */
export interface DepthLayer {
  speed: number;
  opacity: number;
}

export interface BackgroundConfig {
  seed: number;
  /** e.g. 64 */
  desktopObjectCount: number;
  /** e.g. 24, must be < desktopObjectCount (Req 6.9). */
  mobileObjectCap: number;
  depthLayers: readonly [DepthLayer, DepthLayer] | readonly [DepthLayer, DepthLayer, DepthLayer];
  packetCount: number;
  pulseIntervalMs: readonly [3000, 8000];
  neuralNodeCount: number;
  /** ≤ 0.15 (Req 6.1). */
  maxOpacity: number;
  /** opacity 0.05–0.08 (Req 6.7). */
  ticker: { snippets: readonly string[]; opacity: number; speedPxPerSec: number };
}
