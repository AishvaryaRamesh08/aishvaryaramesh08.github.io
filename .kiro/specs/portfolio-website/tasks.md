# Implementation Plan: portfolio-website

## Overview

Incremental build of the static React + TypeScript + Vite portfolio, in the Owner's order: setup → CI/CD to GitHub Pages → Content_Config and validators → design system, app shell and Background_Layer → Hook → Intro → remaining sections → Viz_Showcase → interactions → accessibility and performance gates → SEO → polish and README. Every task builds on earlier ones and is wired into the running app as it lands. Pure logic lives in `src/lib` and is covered by fast-check property tests (Properties 1–49 in design.md) placed right after the code they test. Owner-supplied assets use `Slot<T>` placeholders until supplied.

## Tasks

- [x] 1. Project setup and tooling
  - [x] 1.1 Scaffold the Vite + React + TypeScript project with pinned tooling
    - Create `package.json` with exact versions (no `^`/`~`) for every package in the design's Key dependencies table (React 19, Vite 8, `@vitejs/plugin-react`, TypeScript 6, Tailwind v4 + `@tailwindcss/vite`, Framer Motion 12, GSAP 3, `d3-force`, `d3-drag`, Vitest 4, `@vitest/coverage-v8`, RTL 16, user-event 14, jest-dom 6, jsdom, fast-check 4, ESLint 9, typescript-eslint, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, `tsx`, `image-size`, `yaml`); commit `package-lock.json`; add `.nvmrc` with Node 24 and `"engines"`
    - Create `index.html` (`<html lang="en">`, non-empty `<title>`, `#root`), `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `vitest.config.ts` (jsdom, setup file registering jest-dom and `fc.configureGlobal({ numRuns: 100 })`), `src/main.tsx`, `src/App.tsx`
    - Create the folder structure from the design: `build/`, `scripts/`, `e2e/`, `public/{fonts,data,resume}`, `src/{layout,sections,components,hooks,background,charts,lib,lib/validators,data,assets,vendor,styles}`
    - Add npm scripts `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `lint`, `test` (`vitest run`) and `check` (`tsc --noEmit && eslint . && vitest run`, non-zero on any failure)
    - Add `.gitignore` entries for `node_modules`, `dist`, `.denylist`, Lighthouse output
    - _Requirements: 1.1, 1.2, 28.10, 32.1, 32.4_

  - [x] 1.2 Configure Base_Path and Site_Origin build-time overrides
    - In `vite.config.ts`, resolve `base` from `VITE_BASE_PATH ?? "/"` (normalized to leading and trailing `/`) and `SITE_ORIGIN` from `VITE_SITE_ORIGIN ?? "https://aishvaryaramesh08.github.io"`; inject both via `define`
    - Create `src/lib/url.ts` with `normalizeBase`, `withBase(path, base?)` and `absoluteUrl(origin, base, path?)`
    - _Requirements: 2.3, 2.4, 2.8_

  - [x] 1.3 Write property test for URL helpers
    - **Property 33: URLs follow Base_Path and Site_Origin** (`withBase` and `absoluteUrl` part; extended to `buildHeadTags` in task 24.2)
    - **Validates: Requirements 2.3, 2.4**

  - [x] 1.4 Set up build-time prerender and hydration
    - Create `src/entry-server.tsx` (`renderToString(<App />)`) and `scripts/prerender.ts` that injects the rendered HTML into `dist/index.html`
    - Change `src/main.tsx` to `hydrateRoot` and set `window.__hydrated = true` after hydration
    - Update the `build` script to run the client build, the SSR build and the prerender script in sequence
    - _Requirements: 1.1, 29.7_

  - [x] 1.5 Decide the Plotly_Bundle option by gzip size
    - Create `src/charts/plotly-bundle.ts` variant A (`plotly.js/lib/core` + `plotly.js/lib/candlestick`, `Plotly.register`) and variant B (`plotly.js-finance-dist-min`), each in its own dynamic-import chunk
    - Write `scripts/compare-plotly-bundles.ts` that builds both and prints each chunk's gzip size; keep the smaller variant that builds cleanly under Vite 8, remove the other package, pin the chosen package exactly and record the measured sizes in a comment at the top of `plotly-bundle.ts`
    - _Requirements: 1.2, 15.5, 30.2, 30.10_

- [x] 2. CI/CD to GitHub Pages with a minimal live page
  - [x] 2.1 Build a minimal deployable page and a static 404 page
    - Render a minimal `App` with `header`, `main#main` and `footer` landmarks and the Owner's name, so the Pages URL serves real HTML
    - Create `build/seo.ts` as a Vite plugin whose `generateBundle` emits `404.html` (static, inline-styled, link to the active Base_Path); register it in `vite.config.ts`
    - _Requirements: 1.1, 2.3, 2.5, 2.8_

  - [x] 2.2 Create the Deploy_Workflow
    - Write `.github/workflows/deploy.yml`: trigger `push` on `main` only; permissions `contents: read, pages: write, id-token: write`; `concurrency: { group: pages, cancel-in-progress: true }`
    - Build job: checkout, setup-node 24 with npm cache, `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `configure-pages`, `upload-pages-artifact` with `path: dist`, each as a separate named step
    - Deploy job: `needs: build`, `environment: github-pages`, `deploy-pages`; pin every action to a full commit SHA; no CNAME
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.8, 32.5, 32.6_

  - [x] 2.3 Write unit tests for the workflow and 404 output
    - Parse `deploy.yml` with `yaml`: only `main` triggers, concurrency with cancel-in-progress, typecheck/lint/test run before build, deploy `needs: build`, actions pinned to SHAs
    - Run a fixture build and assert `404.html` exists and links to the base (default and `/portfolio/`)
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 32.5_

- [x] 3. Checkpoint - CI/CD pipeline in place
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Content_Config types and build-time validators
  - [x] 4.1 Define Content_Config types and asset resolution
    - Create `src/data/types.ts` with every type in the design's Data Models section (`Placeholder`, `Slot<T>`, `isPlaceholder`, `ImageAsset`, `SizedSlot`, `SectionId`, `NavGroupId`, `SiteConfig`, `HookConfig`, `HookImages`, `IntroConfig`, `StoryConfig`, `PipelineConfig`, `CaseStudy`, `DependencyDemoConfig`, `VizConfig`, `LiveDemoConfig`, `OhlcDataset`, `AnalysisConfig`, `SkillsConfig`, `Certification`, `JourneyStage`, `BuiltWithAiConfig`, `ContactConfig`, `TerminalConfig`, `BackgroundConfig`), marking each field required or optional
    - Create `src/data/assets.ts` resolving `AssetPath` strings via `import.meta.glob(..., { eager: true, query: "?url", import: "default" })`
    - _Requirements: 4.1, 4.2, 4.3, 30.3_

  - [x] 4.2 Author the Content_Config files with initial content and placeholders
    - Create `site.ts`, `hook.ts`, `intro.ts`, `story.ts`, `pipeline.ts`, `projects.ts`, `dependencyDemo.ts`, `viz.ts`, `liveDemo.ts`, `analysis.ts`, `skills.ts`, `certifications.ts`, `journey.ts`, `builtWithAi.ts`, `contact.ts`, `terminal.ts`, `background.ts` under `src/data/`, each exporting a constant with `satisfies`
    - Use the exact copy from the requirements (hook headline/subline/chips, intro name/title/typewriter lines/paragraph/chips, story quote and messy/clean table, six pipeline stages covering the six topics, seven Case_Studies in order, fictional dependency jobs, three Viz_Stages reusing `hookBefore`/`hookAfter`, three certifications in order, four Journey_Stages, seven Built-with-AI steps, contact headline and links, terminal responses, background snippets)
    - Mark every Owner-supplied asset not yet provided (hook images, architecture SVGs, artifact SVGs, cert logos, screenshots, resume PDF, missing links) as `{ placeholder: true, expected }` with declared dimensions; omit Stage 4; no phone number anywhere
    - _Requirements: 4.1, 4.4, 4.5, 4.7, 8.4, 8.11, 8.15, 9.1, 9.4, 9.5, 10.1, 10.5, 11.4, 12.1, 13.1, 17.2, 18.1, 19.4, 19.5, 20.1, 21.1, 21.9, 21.10, 31.1, 31.2, 31.3, 31.7_

  - [x] 4.3 Implement the pure content validators
    - Create `src/lib/validators/` with `(content, fsFacts) => ValidationError[]` functions returning `{ file, path, message }`: `assetsExist`, `assetsUnique`, `intrinsicSize`, `hookAspect`, `dependencyEdges`, `vizBullets`, `journey`, `storyTable`, `pipelineTopics`, `certMeaning`, `seoCopy`, `backgroundConfig`, `reflectionTopics`, matching the rules and error formats in the design's validator table
    - _Requirements: 4.6, 4.7, 6.1, 6.7, 6.9, 8.5, 10.1, 11.4, 13.1, 13.2, 14.9, 14.16, 18.1, 18.2, 19.10, 20.5, 29.1, 29.3, 30.3_

  - [x] 4.4 Write property test for dependency edge validation
    - **Property 3: Dependency edge validation**
    - **Validates: Requirements 13.2**

  - [x] 4.5 Write property test for journey content validation
    - **Property 12: Journey content validation**
    - **Validates: Requirements 19.10**

  - [x] 4.6 Write property test for the hook aspect-ratio check
    - **Property 28: Hook aspect-ratio check**
    - **Validates: Requirements 8.5**

  - [x] 4.7 Write property test for the Viz bullet check
    - **Property 29: Viz bullet check**
    - **Validates: Requirements 14.16**

  - [x] 4.8 Write property test for asset reference checks
    - **Property 30: Asset reference check**
    - **Validates: Requirements 4.6, 4.7**

  - [x] 4.9 Wire validators into the build via a Vite plugin
    - Create `build/contentValidation.ts` (`buildStart`): load the Content_Config, collect fs facts (file existence, intrinsic sizes via `image-size`, resume PDF presence), run every validator, aggregate errors and call `this.error()` so `vite build` exits non-zero
    - Define `__RESUME_AVAILABLE__` from resume presence (missing resume is not an error); register the plugin in `vite.config.ts`
    - _Requirements: 4.3, 4.6, 8.5, 9.10, 13.2, 14.16, 19.10_

  - [x] 4.10 Write unit tests for content integrity
    - Real Content_Config passes all validators; section IDs unique and match `^[a-z0-9-]+$`; exactly eight Nav_Groups in the required order; Case_Study, certification and Journey_Stage order and values; pipeline and reflection topics; emphasis order; no phone pattern
    - _Requirements: 3.3, 7.2, 10.1, 11.4, 12.1, 18.1, 19.5, 20.5, 21.10, 31.7_

- [x] 5. Design system, theming and motion foundation
  - [x] 5.1 Create design tokens, Tailwind mapping and self-hosted fonts
    - Write `src/styles/tokens.css` (dark/light token tables, spacing, radii, glow, glass, z-index), `src/styles/globals.css` (Tailwind v4 `@import`, `@custom-variant dark`, `@theme inline`, `glass` and `glow-border` utilities, 2 px focus ring with offset, `scroll-padding-top: var(--nav-h)`, reduced-motion rules under `html[data-motion=reduced]`, pre-animation hiding only under `html.js:not([data-motion=reduced])`)
    - Add Latin-subset variable WOFF2 files for Space Grotesk, Inter and JetBrains Mono to `public/fonts/`, declare them in `src/styles/fonts.css` with `font-display: swap` and metric-adjusted fallback faces; preload Space Grotesk and Inter in `index.html`
    - _Requirements: 5.1, 5.6, 5.7, 5.8, 5.9, 26.2, 28.2, 28.5, 30.7_

  - [x] 5.2 Implement the Theme with a pre-paint script and toggle
    - Add the inline head script from the design as the first `<head>` element (theme class, `js` class, `data-motion`, 4 s fail-safe), never reading `prefers-color-scheme`
    - Create `src/lib/theme.ts` (`resolveInitialTheme(stored)`), `ThemeProvider`/`useTheme` (class toggle, `localStorage` in `try/catch` with in-memory fallback, 200 ms themed transitions) and `ThemeToggle` with a "Switch to light theme" / "Switch to dark theme" accessible name
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.3 Write property test for initial Theme resolution
    - **Property 34: Initial Theme resolution**
    - **Validates: Requirements 5.1, 5.5**

  - [x] 5.4 Implement the motion store and shared runtime hooks
    - Create `src/hooks/motionStore.ts` (`useMotionMode` via `useSyncExternalStore` on `matchMedia`, writes `html[data-motion]`), `MotionProvider` (`MotionConfig reducedMotion`), `useMediaQuery`, `useDocumentVisible`, `useInViewOnce`, `useScrollFrame` (one shared rAF-throttled listener) and `useGsapContext` (reverts on mode change, restores `scrollY`)
    - _Requirements: 6.14, 23.8, 26.1, 26.3, 26.4, 26.5_

  - [x] 5.5 Write unit tests for theme, motion and token rules
    - Execute the inline script in jsdom: dark on first visit with `prefers-color-scheme: light`, stored light honored, throwing storage handled; toggle name and preserved form input on switch
    - Motion store switches live with a mocked `matchMedia`; token contrast pairs meet 4.5:1 and 3:1 in both Themes; `glass`/`glow-border` appear only in `GlassCard` and allowlisted state styles
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.11, 6.14, 26.4, 28.1, 28.2_

  - [x] 5.6 Build the shared UI components
    - Create in `src/components/`: `SectionShell` (`<section id aria-labelledby>`, `h2 tabIndex={-1}` from `site.sections`, reserved min-height, `Suspense` + `ChunkErrorBoundary` with Retry, ticker seam slot), `PlaceholderAsset`, `FixedImage` (explicit size, lazy unless `priority`, `onError` alt-text fallback), `Chip`, `Badge`, `Button`, `LinkButton`, `ExternalLink`, `VisuallyHidden`, `SkipLink`, `LiveRegion`, `GlassCard`, `LoadingPlaceholder`, `LazyVisibleChunk`, `CodeBlock`
    - _Requirements: 3.2, 3.3, 4.5, 8.3, 8.20, 14.15, 28.6, 28.8, 30.3, 30.9_

  - [x] 5.7 Write property test for placeholder labeling
    - **Property 47: Placeholder labeling**
    - **Validates: Requirements 4.5, 28.8**

  - [x] 5.8 Implement the Disclosure component and disclosure-group reducer
    - `Disclosure` button with `aria-expanded`/`aria-controls`; `disclosureGroupReducer` in `src/lib/disclosure.ts` keeping at most one item expanded
    - _Requirements: 11.3, 11.8, 11.9, 12.2, 12.6_

  - [x] 5.9 Write property test for the disclosure group
    - **Property 27: At most one expanded disclosure**
    - **Validates: Requirements 11.3, 11.9, 12.2**

  - [x] 5.10 Implement Lightbox, focus trap and scroll lock
    - `useFocusTrap` (Tab/Shift+Tab cycling, `inert` siblings, focus return), `useScrollLock`, `useEscapeKey`, `useOutsideTap`; `Lightbox` (`role="dialog" aria-modal`, close button, Escape, caption) sized by `fitToViewport(intrinsic, viewport, padding)` in `src/lib/layout.ts`
    - _Requirements: 16.6, 16.9, 20.9, 28.4_

  - [x] 5.11 Write property test for enlarged artifact sizing
    - **Property 49: Enlarged artifact fits the viewport**
    - **Validates: Requirements 16.6**

- [x] 6. Scroll helpers, app shell and navigation
  - [x] 6.1 Implement pure scroll and tab mappings
    - Create `src/lib/scroll.ts` with `scrollProgress`, `resolveActiveNavGroup`, `stageAtProgress`, `progressForStage`, `rowsCleanedAtProgress` and `nextTabIndex` as specified in the design
    - _Requirements: 7.5, 7.11, 10.2, 14.5, 14.7, 14.11_

  - [x] 6.2 Write property test for the active Nav_Group
    - **Property 22: Active Nav_Group**
    - **Validates: Requirements 7.11**

  - [x] 6.3 Write property test for scroll progress
    - **Property 23: Scroll progress**
    - **Validates: Requirements 7.5**

  - [x] 6.4 Write property test for Viz stage mapping
    - **Property 24: Viz stage mapping and tab target round trip**
    - **Validates: Requirements 14.5, 14.7**

  - [x] 6.5 Write property test for tab keyboard navigation
    - **Property 25: Tab keyboard navigation**
    - **Validates: Requirements 14.11**

  - [x] 6.6 Write property test for the Story row morph mapping
    - **Property 26: Story row morph is a function of scroll position**
    - **Validates: Requirements 10.2**

  - [x] 6.7 Implement programmatic scrolling and navigation hooks
    - `src/lib/scrollToSection.ts`: GSAP `ScrollToPlugin` with 0.8 s duration and `--nav-h` offset when motion is full, `window.scrollTo({ behavior: "instant" })` when reduced, then focus the heading with `preventScroll`
    - `useHashScroll` (known fragment → wait for sections, capped at 3 s, then scroll; unknown fragment ignored) and `useActiveNavGroup` (rAF scroll → `resolveActiveNavGroup`)
    - _Requirements: 3.4, 3.5, 7.3, 7.4, 7.11, 26.3, 28.5_

  - [x] 6.8 Build the app shell with landmarks and all section slots
    - Compose `App.tsx`: providers (`MotionProvider`, `ThemeProvider`), `SkipLink` first, `layout/Header.tsx` (header + nav), `main#main tabIndex={-1}` with one `SectionShell` per section in Requirement 3 order, `layout/Footer.tsx` stub
    - Create `src/sections/index.ts` registry and one stub component per section folder so every anchor ID and heading is in the prerendered HTML; the Hook section is labelled by its headline `<p id="hook-headline">`
    - _Requirements: 3.1, 3.2, 3.3, 28.6, 28.7, 28.9, 32.1_

  - [x] 6.9 Implement the Navbar and Mobile_Menu
    - Navbar: database-cylinder logo, eight links from `site.navGroups` targeting `${BASE_URL}#id` and intercepted by `scrollToSection`, `aria-current` + underline/bold for the active group, `transform: scaleX()` scroll-progress bar, `ThemeToggle`, transparent vs glass via an IntersectionObserver on the Hook_Screen
    - Mobile_Menu below 768 px: menu button with name and `aria-expanded`, full-viewport `role="dialog" aria-modal` panel with the same eight links, 300 ms entrance (instant when reduced), focus to first link, focus trap, `inert` background, scroll lock, Escape/close returns focus, link closes then navigates
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 27.2, 27.5_

  - [x] 6.10 Write unit tests for the shell and navigation
    - Landmarks (one header/nav/main/footer), section order and IDs, Skip link first and moves focus to `main`, eight links in order, `aria-current` on one link, Mobile_Menu focus trap, Escape and focus return, toggle accessible name
    - _Requirements: 3.1, 3.2, 3.3, 7.2, 7.9, 7.10, 7.12, 7.13, 28.6, 28.7, 28.9_

- [x] 7. Background_Layer ("the backend made visible")
  - [x] 7.1 Implement pure scene, parallax and clock logic
    - `src/background/scene.ts`: seeded `buildScene(seed, viewportClass, config)` placing icons, crow's-foot relationship polylines, packets and neural nodes across depth layers with the mobile object cap; `layerOffsets(scrollY, layers)`; `packetPosition(line, t)`; `nextPulseDelay(rng, range)`
    - `src/background/clock.ts`: `advanceClock(clock, now, visible, maxDt = 50)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.9, 6.10_

  - [x] 7.2 Write property test for scene bounds
    - **Property 35: Scene bounds**
    - **Validates: Requirements 6.1, 6.7, 6.9**

  - [x] 7.3 Write property test for depth-layer parallax
    - **Property 36: Depth-layer parallax**
    - **Validates: Requirements 6.3**

  - [x] 7.4 Write property test for packets on relationship lines
    - **Property 37: Packets stay on relationship lines**
    - **Validates: Requirements 6.4**

  - [x] 7.5 Write property test for the pulse interval
    - **Property 38: Pulse interval**
    - **Validates: Requirements 6.5**

  - [x] 7.6 Write property test for the visible-only clock
    - **Property 39: Visible-only animation clock**
    - **Validates: Requirements 6.10**

  - [x] 7.7 Build the BackgroundLayer component and canvas engine
    - `BackgroundLayer` (fixed, `z-bg`, `pointer-events: none`, `aria-hidden`, no focusables, `ErrorBoundary` with `null` fallback): SVG `<symbol>` icon set (cylinders, table grids, PK/FK keys, schema boxes, cloud storage, warehouse/lakehouse glyphs), L0 grid/circuit pattern, 2–3 parallax layers via `useScrollFrame`
    - Canvas engine as a dynamic import after first paint (`requestIdleCallback`): packets, pulses, neural edges at `min(dpr, 2)`; pauses when hidden; static frame under reduced motion with live switching; palette re-read on Theme change; scene rebuilt when crossing 768 px
    - Neural_Layer fade (800 ms, instant when reduced) on first intersection of `#intro` or later; SQL_Ticker in `SectionShell` seams and ≥ 1440 px side gutters at opacity 0.06; mount in `App.tsx`
    - _Requirements: 1.3, 5.2, 5.10, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 6.15, 28.8_

  - [x] 7.8 Write unit tests for the Background_Layer
    - `aria-hidden`, no focusable descendants, pointer-events none, required ticker snippets rendered, reduced mode renders a static frame, engine import failure leaves the layer blank and sections intact
    - _Requirements: 6.1, 6.7, 6.11, 6.13, 6.14, 6.15_

- [x] 8. Screen 1 — The Hook
  - [x] 8.1 Implement the HookScreen section
    - `min-height: 100svh`; headline `<p id="hook-headline">` with "Want your data to go from this…" then "…to this?" (Framer sequence, part 2 starts after part 1, all done ≤ 3 s, module-level `hookPlayed` flag, final state under reduced motion); two lines on mobile
    - Two equal-size panels from `hookBefore`/`hookAfter` via `FixedImage priority` (WebP, declared width/height, placeholders when not supplied, `onError` keeps box with alt + chip); before panel `saturate(0.65)` plain border, after panel `GlassCard` with cyan→violet glow; label chips
    - `HookArrow`: right-pointing SVG ≥ 768 px, down-pointing below, `aria-hidden`, `pathLength` draw once, static when reduced
    - Subline and CTAs "Meet the engineer ↓" → `intro` and "See how I did it" → `visualization` via `scrollToSection`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15, 8.16, 8.17, 8.18, 8.19, 8.20, 8.21, 29.7_

  - [x] 8.2 Write unit tests for the HookScreen
    - Headline is not a heading and labels the section; arrow hidden and unfocusable; no replay on remount; reduced mode shows final state; placeholders keep chips and arrow; image error keeps declared box; equal panel dimensions; alt text names library and role; CTAs call `scrollToSection` with the right IDs
    - _Requirements: 8.4, 8.7, 8.9, 8.13, 8.14, 8.16, 8.17, 8.19, 8.20, 8.21_

- [x] 9. Screen 2 — Introduction
  - [x] 9.1 Implement typewriter and count-up helpers
    - `src/lib/motion.ts`: `typewriterFrame(elapsedMs, lines, timing)` (45 ms/char type, 2400 ms hold, 25 ms/char delete, cyclic) and `countUpText(progress, finalText)` preserving suffix
    - _Requirements: 9.2, 9.6_

  - [x] 9.2 Write property test for typewriter frames
    - **Property 40: Typewriter frames**
    - **Validates: Requirements 9.2**

  - [x] 9.3 Write property test for count-up text
    - **Property 41: Count-up ends on the exact final text**
    - **Validates: Requirements 9.6**

  - [x] 9.4 Implement the IntroScreen section
    - `h1` Owner name (largest text) followed by the title line; `useTypewriter` visual span `aria-hidden` plus `sr-only` static lines, three static lines when reduced, paused when hidden
    - Paragraph from `intro.ts` (placeholder supported); three StatChips with `useCountUp` triggered by `useInViewOnce({ amount: 0.5 })`, 1.5 s, once
    - CTAs: "Explore my work" → `work`, "Let's talk" → `contact` with focus move; "Download resume" as `<a download href={withBase(pdf)}>` or a `PlaceholderAsset` when `__RESUME_AVAILABLE__` is false
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 29.7_

  - [x] 9.5 Write unit tests for the IntroScreen
    - Single h1, title line, reduced mode shows three static lines and final chip values, screen readers get full lines only, CTA targets, resume placeholder without `href` when the PDF is absent
    - _Requirements: 9.1, 9.3, 9.5, 9.6, 9.7, 9.10, 9.11_

- [x] 10. Checkpoint - Hook and Intro complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Story and Pipeline sections
  - [x] 11.1 Implement the StorySection
    - `MessyCleanTable`: one `<table>` with `<caption>` and messy/cleaned columns so both values stay in the accessibility tree; GSAP scrub `onUpdate(p)` → `rowsCleanedAtProgress(p, n)` sets `data-clean` per row; side-by-side static tables when reduced (live switch via `useGsapContext`)
    - `TerminalQuote`: story paragraphs verbatim in a bordered JetBrains Mono block, or a `PlaceholderAsset` when empty; no reuse of hook images
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 11.2 Write property test for verbatim text rendering
    - **Property 45: Verbatim text rendering** (`TerminalQuote` and `CodeBlock`)
    - **Validates: Requirements 10.5, 20.7**

  - [x] 11.3 Write unit tests for the StorySection
    - Caption and headers present, messy and clean values in the DOM at any progress, reduced mode renders static side-by-side tables, empty quote shows placeholder while table renders
    - _Requirements: 10.3, 10.6, 10.7_

  - [x] 11.4 Implement the PipelineDiagram section
    - Six `Disclosure` stage nodes in order (row ≥ 768 px, column on mobile, no page overflow) driven by `disclosureGroupReducer`; glow only on the active node; per-stage placeholder for missing explanations
    - SVG connectors with CSS-animated particles Source → Insights / AI, static arrowheads and no transitions when reduced; grounding note text; visually hidden text alternative listing stages and flow
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 27.4, 28.11_

  - [x] 11.5 Write unit tests for the PipelineDiagram
    - All collapsed initially, Tab order and names, Enter/Space expand and collapse, single glow, placeholder stage, reduced mode static connectors
    - _Requirements: 11.1, 11.3, 11.6, 11.8, 11.9, 11.10, 11.11_

- [x] 12. Featured work and Dependency_Demo
  - [x] 12.1 Implement downstream reachability and the demo reducer
    - `src/lib/graph.ts`: `downstream(edges, failed)` (BFS with visited set) and `dependencyReducer` for `activate(node)` and `reset`
    - _Requirements: 13.3, 13.4, 13.5, 13.7_

  - [x] 12.2 Write property test for downstream reachability
    - **Property 1: Downstream reachability**
    - **Validates: Requirements 13.4, 13.7**

  - [x] 12.3 Write property test for the single failure state
    - **Property 2: Single failure state**
    - **Validates: Requirements 13.3, 13.5**

  - [x] 12.4 Implement the FeaturedWork section
    - Responsive grid of `CaseStudyCard` (`GlassCard` + `Disclosure`, disclosure group so one is expanded) in `projects.ts` order; inline `CaseStudyPanel` spanning the row with h4 Challenge / Approach / Architecture diagram / Outcome / Tech; focus stays on the card on collapse
    - Tech chips with Framer stagger ≤ 600 ms (final state when reduced); "work in progress" badge on card and panel; architecture SVG with `architectureAltText(components, flow)` text alternative, or `PlaceholderAsset` while still rendering the other four subsections
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7, 12.8, 12.9, 12.10, 27.4, 28.11_

  - [x] 12.5 Write property test for the architecture text alternative
    - **Property 48: Architecture text alternative**
    - **Validates: Requirements 12.8**

  - [x] 12.6 Implement the Dependency_Demo inside the GenAI Autosys Case_Study
    - `src/charts/d3Loader.ts` memoizing `d3-force` + `d3-drag`; load on `LazyVisibleChunk` 200 px or panel expansion, whichever first
    - React-rendered nodes `<g role="button" tabIndex={0} aria-pressed>` with visible labels; failed vs downstream styles; reset control; `aria-live="polite"` list of highlighted jobs or "0 downstream jobs affected"; simulation ≤ 1.5 s or synchronous when reduced; fits container on mobile
    - Load failure: "interactive demo unavailable" message, static job/dependency list, Retry
    - _Requirements: 13.1, 13.3, 13.5, 13.6, 13.7, 13.8, 13.9, 27.4, 28.11, 30.2, 30.9_

  - [x] 12.7 Write unit tests for FeaturedWork and the Dependency_Demo
    - Seven cards in order, five subsections in order, one expanded at a time, WIP badge in both places, placeholder diagram; with D3 mocked: Enter/Space fail and reset, live list text, zero-downstream entry, rejected import fallback
    - _Requirements: 12.1, 12.2, 12.6, 12.7, 12.9, 13.3, 13.5, 13.6, 13.7, 13.9_

- [x] 13. Business and systems analysis
  - [x] 13.1 Implement the AnalysisSection
    - Five titled item cards; gallery of four artifact buttons (data-flow, ERD, use-case, user-story) with caption, "illustrative" label, source, text alternative (type + elements), SVG or `PlaceholderAsset`; opening `Lightbox` with caption; courses and Product@TAMU team case challenge as visible text
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 28.11_

  - [x] 13.2 Write unit tests for the AnalysisSection
    - Exactly five items and four artifacts, button names include captions, Lightbox focus trap, Escape and focus return, course and case-challenge text present
    - _Requirements: 16.1, 16.2, 16.4, 16.5, 16.8, 16.9_

- [x] 14. Skill_Constellation
  - [x] 14.1 Implement skills highlight, layout and listing logic
    - `src/lib/skills.ts`: `computeHighlight(skill, cfg, projects)`, `buildConstellationLayout(cfg, viewportClass)` (one node per skill id, one edge per cluster membership), `buildSkillTextListing(cfg, projects)` and `skillAccessibleName(skill, cfg)`
    - _Requirements: 17.3, 17.4, 17.6, 17.7, 17.8, 17.9_

  - [x] 14.2 Write property test for highlight consistency
    - **Property 4: Highlight consistency**
    - **Validates: Requirements 17.4, 17.6, 17.7**

  - [x] 14.3 Write property test for one node per skill
    - **Property 5: One node per skill**
    - **Validates: Requirements 17.3**

  - [x] 14.4 Write property test for the text listing and names
    - **Property 6: Text listing and names are complete**
    - **Validates: Requirements 17.8, 17.9**

  - [x] 14.5 Implement the SkillConstellation section
    - Desktop/tablet SVG radial map with labelled cluster hubs, shared BigQuery node linked to both hubs; mobile stacked lanes with 44 px chips; nodes as buttons with names from `skillAccessibleName`
    - Highlight within 200 ms on hover (Desktop_Viewport), tap or focus; clear on leave, blur, Escape or outside tap; `ProjectRail` highlighting Case_Study titles; "no featured project" note; `VisuallyHidden` nested listing
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.7, 17.8, 17.9, 27.2, 27.3, 28.11_

  - [x] 14.6 Write unit tests for the SkillConstellation
    - Cluster labels rendered, no progress bars, Escape and outside tap clear highlight, no-project note, Tab reaches every node with a visible focus class
    - _Requirements: 17.1, 17.5, 17.7, 17.9_

- [x] 15. Cloud certifications
  - [x] 15.1 Implement the Certifications section
    - Add `isHttpsUrl` to `src/lib/url.ts`; three `CertificationCard`s (`GlassCard`) in a row on desktop and a column on mobile: issuer logo (`FixedImage` or `PlaceholderAsset` at the same size, error fallback), name, meaning, Verify `ExternalLink` named with the cert name, or disabled "Pending" (`aria-disabled`, no `href`)
    - Framer hover/focus animation ≤ 300 ms each way (none when reduced, focus ring kept); cloud/network SVG background ≤ 0.2 opacity with `pointer-events: none`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

  - [x] 15.2 Write property test for Verify link enablement
    - **Property 44: Verify link enablement**
    - **Validates: Requirements 18.4**

  - [x] 15.3 Write unit tests for the Certifications section
    - Three cards in order, Verify `target="_blank" rel="noopener noreferrer"`, disabled Pending link performs no navigation, logo placeholder keeps dimensions
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.7_

- [x] 16. Terminal_Band
  - [x] 16.1 Implement terminal command logic
    - `src/lib/terminal.ts`: `normalizeCommand` (trim + lowercase), `runCommand(input, ctx)` producing `append | clear | noop` from the Content_Config (`whoami`, `skills`, `projects`, `certs`, `contact`, `help`, `clear`; unknown echoes the normalized command and lists all seven), `historyReducer(h, a, max = 50)`
    - _Requirements: 24.2, 24.3, 24.4, 24.5, 24.7, 24.8, 24.9, 24.10_

  - [x] 16.2 Write property test for command normalization
    - **Property 16: Command normalization**
    - **Validates: Requirements 24.5**

  - [x] 16.3 Write property test for unknown commands
    - **Property 17: Unknown commands**
    - **Validates: Requirements 24.4**

  - [x] 16.4 Write property test for output completeness and phone safety
    - **Property 18: Command output completeness and phone safety**
    - **Validates: Requirements 24.3, 24.7**

  - [x] 16.5 Write property test for the history model
    - **Property 19: History model**
    - **Validates: Requirements 24.2, 24.8, 24.10**

  - [x] 16.6 Implement the TerminalBand and TerminalWidget
    - Heading from `terminal.ts`; labelled JetBrains Mono `<input>` in a `<form onSubmit>`, `<ol>` history with prompt symbol, polite live region receiving only the latest response, focus kept in the input on blank input and `clear`; rendered only in this section
    - _Requirements: 24.1, 24.2, 24.6, 24.8, 24.10, 24.11_

  - [x] 16.7 Write unit tests for the TerminalWidget
    - Enter submits, live region contains only the newest response, blank input adds nothing and keeps focus, `clear` empties history and keeps focus, single instance on the page
    - _Requirements: 24.1, 24.6, 24.8, 24.10, 24.11_

- [x] 17. Journey_Chart
  - [x] 17.1 Implement the shared Plotly loader
    - `src/charts/plotlyLoader.ts`: memoized `loadPlotly()` importing the bundle chosen in task 1.5 and `withTimeout(p, 15_000)` that rejects only the caller's wait
    - _Requirements: 15.5, 19.23, 30.10_

  - [x] 17.2 Write property test for single Plotly request
    - **Property 10: Plotly_Bundle requested at most once**
    - **Validates: Requirements 15.5, 19.23, 30.10**

  - [x] 17.3 Implement journey mapping, layout and tooltip logic
    - `src/lib/journey.ts`: `buildJourneyTrace`, `markerPositions`, `layoutJourneyLabels`, `positionTooltip`, `journeyTooltipReducer` as specified in the design
    - _Requirements: 19.1, 19.2, 19.6, 19.7, 19.9, 19.11, 19.17, 19.19, 19.20, 19.21_

  - [x] 17.4 Write property test for the journey trace mapping
    - **Property 11: Journey trace mapping**
    - **Validates: Requirements 19.6, 19.7, 19.9**

  - [x] 17.5 Write property test for the tooltip state machine
    - **Property 13: Tooltip state machine**
    - **Validates: Requirements 19.1, 19.2, 19.17, 19.19, 19.20, 19.21**

  - [x] 17.6 Write property test for tooltip positioning
    - **Property 14: Tooltip stays in the viewport**
    - **Validates: Requirements 19.17**

  - [x] 17.7 Write property test for label layout
    - **Property 15: Journey labels do not overlap**
    - **Validates: Requirements 19.11**

  - [x] 17.8 Implement the JourneyChart section
    - `LazyVisibleChunk` at 200 px → `withTimeout(loadPlotly())`; `LoadingPlaceholder` at the chart's size; `Plotly.newPlot` with the trace, hidden axes, no legend, transparent backgrounds, `staticPlot: true`; cyan→violet gradient injected into the line path (solid cyan on failure); last marker maroon with violet ring
    - `MarkerOverlay` 44 × 44 buttons named "label, approxYear"; JetBrains Mono labels from `layoutJourneyLabels` re-run on resize and Theme change; `JourneyTooltip` (`GlassCard`, positioned by `positionTooltip`) driven by the reducer; CSS pulse on the current marker (off when reduced); GSAP stroke-dash entrance ≤ 1.2 s once (off when reduced)
    - Visually hidden `<ol>` linked via `aria-describedby`, shown visibly as the fallback on load/init failure or timeout
    - _Requirements: 5.11, 5.12, 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8, 19.11, 19.12, 19.13, 19.14, 19.15, 19.16, 19.17, 19.18, 19.19, 19.20, 19.21, 19.22, 19.23, 19.24, 19.25, 27.4, 28.11_

  - [x] 17.9 Write unit tests for the JourneyChart
    - With Plotly mocked: layout hides axes/legend and uses `staticPlot`, last marker maroon, placeholder keeps size, rejected and timed-out loads show the ordered list, markers in order with names, reduced mode has no pulse or entrance
    - _Requirements: 19.3, 19.8, 19.13, 19.15, 19.18, 19.22, 19.24, 19.25_

- [x] 18. Built with AI
  - [x] 18.1 Implement the BuiltWithAi section
    - Intro statement above a seven-step timeline, each step with three labelled entries (placeholders where missing); artifacts: requirements.md and tasks.md excerpts in `CodeBlock` (scrolling horizontally inside their block on mobile), prompt example, Kiro and GitHub Actions screenshots as buttons opening `Lightbox`, each with a caption; reflection with "What AI did well" and "Where I had to step in"
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.9, 20.10_

  - [x] 18.2 Write unit tests for the BuiltWithAi section
    - Seven steps in order with three labelled entries, artifact captions, placeholders for missing artifacts, screenshot Lightbox focus return, reflection labels
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.9_

- [x] 19. Contact and Footer
  - [x] 19.1 Implement contact validation and the submission controller
    - `src/lib/contact.ts`: `validateContact`, `contactReducer` (`idle → sending → success | error`), and `createSubmitter` with an in-flight guard, honeypot short-circuit to success, Web3Forms `fetch` with `AbortSignal.timeout(15_000)` and success iff `res.ok && json.success === true`
    - _Requirements: 21.3, 21.5, 21.6, 21.7, 21.14_

  - [x] 19.2 Write property test for contact validation
    - **Property 20: Validation matches the specification**
    - **Validates: Requirements 21.3**

  - [x] 19.3 Write property test for single-flight submission and honeypot
    - **Property 21: Single-flight submission and honeypot**
    - **Validates: Requirements 21.5, 21.14**

  - [x] 19.4 Implement the Contact section
    - Headline; `ContactForm` with labelled fields and `maxLength` 100/254/5000, inline errors with `aria-invalid`/`aria-describedby`, polite announcements, focus to the first invalid field, errors cleared on correction, disabled button + sending indicator, success message and ≤ 2 s animation (none when reduced), error alert with prefilled `mailto:` fallback
    - Off-screen `aria-hidden` honeypot `hp_company_site` with `tabIndex={-1}` and `autoComplete="off"`; key from `VITE_WEB3FORMS_KEY ?? contact.web3formsAccessKey`, `MailtoFallback` when absent; `ContactLinks` (email, LinkedIn, GitHub, resume) via `ExternalLink` or placeholders
    - _Requirements: 1.8, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.10, 21.11, 21.12, 21.13, 21.14_

  - [x] 19.5 Write unit tests for the Contact section
    - `maxLength` and honeypot attributes, success clears fields, error keeps input and shows mailto, no key renders only mailto with `fetch` never called, focus moves to the first invalid field
    - _Requirements: 21.2, 21.3, 21.6, 21.7, 21.8, 21.13_

  - [x] 19.6 Implement the Footer
    - `layout/Footer.tsx`: "© {year} Aishvarya Ramesh" (`suppressHydrationWarning`), "Built with Kiro", LinkedIn/GitHub icon links from `contact.links` with destination names opening in new tabs or `PlaceholderAsset` links, native "Back to top" button scrolling to `hook` (instant when reduced) and focusing the Skip link
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

  - [x] 19.7 Write unit tests for the Footer
    - Single block content, icon link names and targets, placeholder instead of empty/`#` URLs, back-to-top focuses the Skip link
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [x] 20. Checkpoint - All remaining sections complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Visualization showcase
  - [x] 21.1 Implement the seeded OHLC generator and bundled dataset
    - `src/lib/ohlc.ts`: `mulberry32`, `generateOhlc(cfg)` (business-day geometric walk rounded to cents), `serializeOhlc`, `parseOhlcDataset` (throws `OhlcParseError`)
    - `scripts/generate-ohlc.ts` writing `public/data/ohlc-sample.json` from `liveDemo.ts`; add it as a `prebuild` npm script and commit the generated file
    - _Requirements: 15.1, 15.9, 15.11, 15.12_

  - [x] 21.2 Write property test for the OHLC JSON round trip
    - **Property 7: OHLC dataset JSON round trip**
    - **Validates: Requirements 15.9**

  - [x] 21.3 Write property test for generator determinism
    - **Property 8: Seeded generator determinism** (includes the example check that the fixed seed reproduces `public/data/ohlc-sample.json`)
    - **Validates: Requirements 15.11**

  - [x] 21.4 Write property test for the OHLC row invariant
    - **Property 9: OHLC row invariant**
    - **Validates: Requirements 15.12**

  - [x] 21.5 Implement the Tabs component and VizShowcase section
    - `components/Tabs.tsx`: WAI-ARIA tablist/tab/tabpanel, roving tabindex, `nextTabIndex` for Arrow/Home/End without wrap
    - `VizShowcase`: tabs for the stages present in `viz.ts` (no Stage 4 slot when absent), `VizStagePanel` with a fixed media box (hook entries reused for Stages 1–2, `src/assets/viz/` images, video with poster), callouts, "What I changed", "Stage k of n: name" indicator and live announcement, optional Dash link via `ExternalLink`, image error fallback
    - Motion full: GSAP pin over `n × 100vh` with `stageAtProgress` and scrubbed `clip-path` wipe, tabs call `scrollToStage(k)` (0.5 s); reduced: no pin, instant switching; live switch via `useGsapContext`
    - _Requirements: 4.4, 4.7, 4.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 14.12, 14.13, 14.14, 14.15_

  - [x] 21.6 Write unit tests for the VizShowcase
    - ARIA tabs attributes, only current tab in Tab order, Arrow/Home/End behaviour, live announcement, three tabs when Stage 4 is absent, Dash link presence follows config, reduced mode switches instantly, image error keeps tabs and panels operable
    - _Requirements: 14.4, 14.6, 14.8, 14.11, 14.12, 14.14, 14.15_

  - [x] 21.7 Implement the Live_Chart_Demo
    - `LazyVisibleChunk` at 200 px → fetch `withBase("data/ohlc-sample.json")` in parallel with `withTimeout(loadPlotly())`; `LoadingPlaceholder` with the chart's fixed aspect box
    - One candlestick trace, `hovermode: "x unified"`, `dragmode: "zoom"`, `doubleClick: "reset"`, range selector (1M, 3M, All), no rangeslider, `displaylogo: false`, responsive; React-rendered accessible name, `aria-describedby` description (synthetic data, full date range) and visible "sample data" chip
    - Failure, parse error or 15 s timeout → hookAfter image + "live chart unavailable" at the same size; mount inside VizShowcase
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.10, 27.4, 28.11, 30.2_

  - [x] 21.8 Write unit tests for the Live_Chart_Demo
    - With Plotly and `fetch` mocked: candlestick trace and range-selector config, placeholder size equals chart size, rejection and timeout render the hookAfter fallback, description mentions synthetic sample data
    - _Requirements: 15.1, 15.4, 15.6, 15.7, 15.8, 15.10_

  - [x] 21.9 Write property test for rendered counts
    - **Property 46: Rendered counts match the Content_Config** (projects, skills, certifications, Journey_Stages, Viz_Stages with and without Stage 4)
    - **Validates: Requirements 4.4, 14.4**

- [x] 22. Interactions and analytics
  - [x] 22.1 Implement cursor-trail and magnetic helpers
    - Add `trailOpacity(ageMs, fadeMs = 400)` and `magneticOffset(pointer, rect, zone = 60, max = 8)` to `src/lib/motion.ts`
    - _Requirements: 23.1, 23.5_

  - [x] 22.2 Write property test for the cursor trail fade
    - **Property 42: Cursor trail fade**
    - **Validates: Requirements 23.1**

  - [x] 22.3 Write property test for magnetic offset bounds
    - **Property 43: Magnetic offset bounds**
    - **Validates: Requirements 23.5**

  - [x] 22.4 Implement the CursorTrail
    - 2D canvas with timestamped points faded by `trailOpacity`, `pointer-events: none`, system cursor untouched; mounted in `App.tsx` only when `(min-width: 1280px) and (pointer: fine)` and motion is full, unmounting live on change
    - _Requirements: 23.1, 23.2, 23.3, 23.8, 26.1_

  - [x] 22.5 Implement MagneticButton and apply it to primary CTAs
    - `useMagnetic` with Framer `useSpring` (settles < 300 ms), active only on Desktop_Viewport with motion full; use `MagneticButton` for the Hook, Intro and Contact primary buttons
    - _Requirements: 23.5, 23.8, 26.1_

  - [x] 22.6 Implement scroll reveals across sections
    - `Reveal` (`whileInView`, `once`, `amount: 0.15`, 600 ms, translateY ≤ 24 px, `onFocusCapture` forces final state, final state when reduced or when IntersectionObserver is missing); wrap section content blocks and the Built-with-AI timeline steps
    - _Requirements: 20.8, 23.4, 23.6, 23.7, 23.8, 26.1_

  - [x] 22.7 Integrate GoatCounter analytics
    - Vendor `src/vendor/goatcounter-count.js`; resolve `VITE_GOATCOUNTER_CODE ?? site.analytics.goatcounterCode` into `__GOATCOUNTER_CODE__` in `vite.config.ts`; in `main.tsx`, `if (__GOATCOUNTER_CODE__) scheduleAnalytics()` appending the script after `load` + `requestIdleCallback`, `onerror` no-op without retry; page views only
    - _Requirements: 1.5, 1.8, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6_

  - [x] 22.8 Write unit tests for interactions, analytics and flash safety
    - CursorTrail not mounted on coarse pointer, narrow viewport or reduced motion; Reveal shows final state on focus and when reduced; build without a GoatCounter code contains no `goatcounter` string; every configured animation period ≥ 334 ms
    - _Requirements: 23.2, 23.6, 23.7, 25.6, 26.6_

- [x] 23. Accessibility and performance gates
  - [x] 23.1 Add Playwright and the axe accessibility check
    - `playwright.config.ts` serving `dist` via `vite preview`; `e2e/a11y.spec.ts` running `@axe-core/playwright` with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` at 390 × 844 and 1280 × 800 in dark and light after scrolling every section into view, failing on any violation; `check:a11y` npm script
    - _Requirements: 6.12, 28.1, 28.2, 28.12_

  - [x] 23.2 Implement the Initial_Page_Weight check
    - `src/lib/pageWeight.ts` `evaluatePageWeight(entries)` (fail at ≥ 3,000,000 B, report total and top 5); `scripts/check-page-weight.ts` loading `vite preview` at 390 × 844 with empty cache until load + network idle, mapping requests to `dist/` files and summing gzip-9 sizes; `check:weight` npm script
    - _Requirements: 30.1, 30.6_

  - [~] 23.3 Write property test for page-weight evaluation
    - **Property 32: Page-weight evaluation**
    - **Validates: Requirements 30.1, 30.6**

  - [~] 23.4 Configure Lighthouse CI
    - `lighthouserc.json`: `serve dist -l 4173`, 3 mobile runs, `median-run` assertions (each category ≥ 0.9, LCP ≤ 2500 ms, CLS ≤ 0.1), filesystem upload target; `check:lighthouse` npm script
    - _Requirements: 30.4, 30.5, 30.7, 30.8_

  - [x] 23.5 Code-split sections and tune LCP/CLS
    - Convert sections below the Intro to `React.lazy` chunks preloaded within one viewport height; make `useHashScroll` preload chunks up to the target; confirm images outside the first viewport use `loading="lazy"` and hook images use `fetchpriority="high"`; set `SectionShell` min-heights from `site.ts` to limit layout shift
    - _Requirements: 3.4, 30.2, 30.3, 30.4, 30.7, 30.9_

  - [~] 23.6 Write lazy-loading verification tests
    - Build-manifest test: initial chunks contain no D3, Plotly or OHLC data; `e2e/network-origins.spec.ts`: request origins limited to self, `api.web3forms.com` and `*.goatcounter.com`, fonts/images/data same-origin, Plotly chunk requested once, D3/Plotly/OHLC not requested before their containers approach the viewport, no cookies
    - _Requirements: 1.5, 1.6, 13.8, 14.13, 15.5, 25.1, 25.3, 30.2, 30.10_

  - [x] 23.7 Implement the Denylist and output scans
    - `build/denylist.ts` with pure `scanForDenylist(text, terms)` (case-insensitive whole-word, reports `file:line` only); load terms from `DENYLIST` env or git-ignored `.denylist` (missing/empty fails `vite build`, warns in dev); scan `src/data/**`, `public/data/**`, text assets in `buildStart` and `dist/**` in `closeBundle`, deleting `dist` on failure
    - `build/outputScan.ts`: reject third-party origins other than the Form_Provider and GoatCounter, `"telephone"` and phone patterns; register both plugins and supply a test `DENYLIST` to fixture builds
    - In the same change, update `deploy.yml` to pass `DENYLIST: ${{ secrets.PORTFOLIO_DENYLIST }}` to the build step only (no `VITE_` prefix), and extend the `.github/workflows` unit test from 2.3 to assert the secret reaches only the build step under that name
    - _Requirements: 1.5, 1.6, 2.2, 21.10, 29.6, 31.3, 31.4, 31.5_

  - [x] 23.8 Write property test for the Denylist scan
    - **Property 31: Denylist scan**
    - **Validates: Requirements 31.4**

  - [~] 23.9 Extend the Deploy_Workflow with the quality gates
    - In `deploy.yml`, pass `VITE_GOATCOUNTER_CODE` and `VITE_WEB3FORMS_KEY` from repository variables to the build step; add Playwright install, `check:weight`, `check:lighthouse` and `check:a11y` as separate steps before `upload-pages-artifact`; upload Lighthouse reports as a workflow artifact
    - _Requirements: 2.2, 21.12, 28.12, 30.6, 30.8, 31.4, 31.5_

  - [~] 23.10 Write end-to-end behaviour specs
    - `resilience.spec` (abort Web3Forms, GoatCounter, Plotly and D3 routes; no `pageerror`), `navigation.spec` (links ≤ 1 s, heading focused below Navbar, reduced jump, fragments, CTAs, back-to-top), `layout.spec` (360/768/1280/1920 and 200% zoom, no horizontal scroll, Hook layouts, 44 px targets, rotation keeps form values), `motion.spec` (live reduced-motion toggle keeps scroll, Theme and input; Viz pin only with motion), `no-js.spec` (Hook/Intro visible, all IDs present)
    - _Requirements: 1.8, 3.4, 3.5, 7.3, 7.4, 8.10, 8.18, 9.7, 22.5, 26.4, 27.1, 27.2, 27.5, 27.6, 29.7_

  - [~] 23.11 Extend the workflow unit test for quality gates
    - Assert the weight, Lighthouse and axe steps run after the build and before the Pages upload (the denylist secret assertion lives in 23.7)
    - _Requirements: 2.2, 28.12, 30.6, 31.5_

- [x] 24. SEO and sharing
  - [x] 24.1 Extend the SEO plugin with head tags, sitemap and robots
    - `buildHeadTags(site, origin, base)` and `transformIndexHtml` in `build/seo.ts`: title, meta description, canonical, Open Graph and Twitter `summary_large_image` tags, one Person JSON-LD block (no telephone field in its type); `generateBundle` emits `sitemap.xml` and `robots.txt` with absolute URLs
    - Add a labelled placeholder `public/og-image.png` (1200 × 630, ≤ 1 MB) checked by the `intrinsicSize` validator; add `public/favicon.svg`
    - _Requirements: 2.4, 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_

  - [~] 24.2 Extend the URL property test to head tags
    - **Property 33: URLs follow Base_Path and Site_Origin** (canonical, `og:url`, `og:image`, sitemap and robots URLs from `buildHeadTags`)
    - **Validates: Requirements 2.3, 2.4, 29.2**

  - [~] 24.3 Write build-output tests for SEO
    - On fixture builds (default and overridden base/origin): sitemap and robots content, JSON-LD parses with Person fields and no `telephone`, `<html lang="en">`, title and description lengths, OG image dimensions and size
    - _Requirements: 28.10, 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_

- [x] 25. Checkpoint - Quality gates and SEO in place
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. Polish and documentation
  - [~] 26.1 Responsive and accessibility polish pass
    - Fix any horizontal overflow from 360 to 1920 px and at 200% zoom, enforce 44 px mobile hit areas, single-tap reveal/dismiss for hover content on touch, keep the top section in view after orientation change, verify heading levels never skip and tab order follows reading order
    - _Requirements: 27.1, 27.2, 27.3, 27.5, 27.6, 28.3, 28.5, 28.9_

  - [x] 26.2 Write the README
    - Distinct headings for local setup (prerequisites, install, dev, build, `npm run check`), the Content_Config (each `/src/data/*.ts` file and what it controls), Owner-supplied assets and replacing placeholders, the Base_Path setting, GitHub Pages deployment (including the `PORTFOLIO_DENYLIST` secret and repository variables), and Cloudflare Pages / Netlify deployment (build command, `dist`, `VITE_BASE_PATH=/`, `VITE_SITE_ORIGIN`, `DENYLIST`)
    - _Requirements: 32.3, 32.4_

  - [~] 26.3 Write a README structure test
    - Assert the README contains the six required headings
    - _Requirements: 32.3_

- [x] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; core implementation tasks are never optional
- Each task references specific requirement clauses for traceability; Owner tone review and resume-fact checks (9.8, 12.10, 31.1, 31.6) and screen-reader passes are manual and not tasks
- Property tests use fast-check with at least 100 runs and are tagged `// Feature: portfolio-website, Property N: ...`
- The design's interpretation notes apply: the terminal echoes the normalized command, there is no in-page Plotly retry, and Case_Studies expand inline (12.5 modal handling does not apply)
- Before task 23.7 is pushed to main, the Owner must create the `PORTFOLIO_DENYLIST` repository secret (and the repository variables for the Web3Forms key and GoatCounter code) in GitHub settings; until then the denylist check fails the deploy by design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.5"] },
    { "id": 2, "tasks": ["1.3", "1.4"] },
    { "id": 3, "tasks": ["2.1", "4.1"] },
    { "id": 4, "tasks": ["2.2", "4.2"] },
    { "id": 5, "tasks": ["2.3", "4.3"] },
    { "id": 6, "tasks": ["4.4", "4.5", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 7, "tasks": ["4.10", "5.1", "5.4", "6.1"] },
    { "id": 8, "tasks": ["5.2", "5.6", "6.2", "6.3", "6.4", "6.5", "6.6", "7.1", "9.1"] },
    { "id": 9, "tasks": ["5.3", "5.7", "5.8", "5.10", "7.2", "7.3", "7.4", "7.5", "7.6", "9.2", "9.3", "12.1", "14.1", "16.1", "17.3", "19.1", "21.1"] },
    { "id": 10, "tasks": ["5.5", "5.9", "5.11", "6.7", "12.2", "12.3", "14.2", "14.3", "14.4", "16.2", "16.3", "16.4", "16.5", "17.1", "17.4", "17.5", "17.6", "17.7", "19.2", "19.3", "21.2", "21.3", "21.4"] },
    { "id": 11, "tasks": ["6.8", "17.2"] },
    { "id": 12, "tasks": ["6.9", "7.7"] },
    { "id": 13, "tasks": ["6.10", "7.8", "8.1"] },
    { "id": 14, "tasks": ["8.2", "9.4"] },
    { "id": 15, "tasks": ["9.5", "11.1", "11.4", "12.4", "13.1", "14.5", "15.1", "16.6", "17.8", "18.1", "19.4", "19.6"] },
    { "id": 16, "tasks": ["11.2", "11.3", "11.5", "12.5", "12.6", "13.2", "14.6", "15.2", "15.3", "16.7", "17.9", "18.2", "19.5", "19.7"] },
    { "id": 17, "tasks": ["12.7", "21.5"] },
    { "id": 18, "tasks": ["21.6", "21.7"] },
    { "id": 19, "tasks": ["21.8", "21.9", "22.1"] },
    { "id": 20, "tasks": ["22.2", "22.3", "22.4", "22.7"] },
    { "id": 21, "tasks": ["22.5"] },
    { "id": 22, "tasks": ["22.6"] },
    { "id": 23, "tasks": ["22.8", "23.1", "23.7"] },
    { "id": 24, "tasks": ["23.2", "23.5", "23.8"] },
    { "id": 25, "tasks": ["23.3", "23.4", "23.6"] },
    { "id": 26, "tasks": ["23.9", "23.10", "24.1"] },
    { "id": 27, "tasks": ["23.11", "24.2", "24.3"] },
    { "id": 28, "tasks": ["26.1", "26.2"] },
    { "id": 29, "tasks": ["26.3"] }
  ]
}
```
