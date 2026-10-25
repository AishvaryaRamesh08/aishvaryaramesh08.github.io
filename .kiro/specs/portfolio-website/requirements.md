# Requirements Document

## Introduction

A single-page, 100% static personal portfolio website for Aishvarya Ramesh, positioned as "Data Engineer · Analyst · Systems Thinker — From raw data to decisions". The site shows who Aishvarya is through stories, visuals and interactive demos rather than restating the resume.

- **Audience:** recruiters, hiring managers and engineers for Data Engineer, data/analytics and TPM internships and roles. Visitors should get the core value in 60 seconds and be able to dig deeper.
- **Core message:** "I turn messy, fragmented data into trusted, governed, decision-ready systems, and I can explain the business problem and the system design behind them."
- **Emphasis, in order:** (1) data engineering, (2) data analysis and visualization, (3) business and systems analysis and design, (4) AI-assisted development. Cloud certifications support all four.
- **Tone:** confident, curious, direct. No hyperbole, no buzzword stuffing.
- **Hard constraint:** free to build, host and run. No backend, no paid APIs, no database, no server-side runtime.
- **Stack:** React + TypeScript + Vite, Tailwind CSS, Framer Motion (UI animation), GSAP + ScrollTrigger (scroll storytelling), D3.js and a lazy-loaded Plotly.js partial bundle (browser charts), custom SVG + 2D canvas for background effects (no tsparticles). Three.js / React Three Fiber only if lazy-loaded and kept off the opening screen. Web3Forms (contact form) and GoatCounter (analytics) are the only third-party services.
- **Hosting:** GitHub Pages user site at https://aishvaryaramesh08.github.io (repository `aishvaryaramesh08.github.io` under the GitHub account AishvaryaRamesh08, Vite base "/", no custom domain for now), deployed via GitHub Actions on push to main, with a build compatible with Cloudflare Pages and Netlify free tiers through a build-time base override.

Requirements are grouped by page section in the page order defined in Requirement 3, followed by cross-cutting interaction, non-functional and delivery requirements.

## Glossary

- **System**: The portfolio website as a whole, including its build output, client-side runtime and deployment workflow. Written as "THE SYSTEM" in acceptance criteria.
- **Visitor**: Any person viewing the deployed site (recruiter, hiring manager, engineer).
- **Owner**: Aishvarya Ramesh, who maintains the site content.
- **Content_Config**: The set of typed TypeScript content files under `/src/data/*.ts` that hold all editable content (copy, projects, skills, certifications, Journey_Stages, hook images, visualization stages, links).
- **Placeholder_Asset**: A clearly labeled stand-in image, text or URL used until the Owner supplies the real asset. Each Placeholder_Asset visibly displays the word "Placeholder" and the name of the expected asset.
- **Background_Layer**: The persistent, low-opacity decorative layer rendered behind all sections ("the backend made visible").
- **Data_Packet**: A small glowing dot in the Background_Layer that travels along a relationship line between two database nodes.
- **SQL_Ticker**: The faint, slowly scrolling text strip of SQL and pipeline snippets in the Background_Layer.
- **Neural_Layer**: The faint neural-network node graph in the Background_Layer that fades in near the Introduction and later sections.
- **Navbar**: The sticky glassmorphic top navigation bar.
- **Mobile_Menu**: The full-screen animated navigation menu shown on mobile viewports.
- **Hook_Screen**: Screen 1, "The Hook", the full-viewport opening section.
- **Hook_Arrow**: The decorative arrow on the Hook_Screen that points from the hookBefore panel to the hookAfter panel (rightward when the panels sit side by side, downward when they are stacked on a Mobile_Viewport).
- **hookBefore / hookAfter**: Content_Config entries for the raw CSV (before) and Plotly (after) panels shared by the Hook_Screen and the Viz_Showcase.
- **Intro_Screen**: Screen 2, the Introduction section.
- **Story_Section**: The "Why I love data" personal story section.
- **Pipeline_Diagram**: The interactive "How I think about data" diagram (Source → Raw → Staging → Sanitized → Conformed → Insights / AI).
- **Case_Study**: A featured-work entry that expands into Challenge → Approach → Architecture diagram → Outcome → Tech.
- **Dependency_Demo**: The D3 force-graph demo of fictional job dependencies inside the GenAI Autosys dependency visualizer Case_Study.
- **Viz_Showcase**: The "From basic chart to product-grade dashboard" visualization walkthrough section.
- **Viz_Stage**: One step of the Viz_Showcase (Stage 1 raw CSV, Stage 2 Plotly, Stage 3 Dash, optional Stage 4 Dash with conversational assistant).
- **Viz_Stage_Tabs**: The tab list in the Viz_Showcase with one tab per displayed Viz_Stage, present in every motion state as the keyboard- and touch-accessible way to select a Viz_Stage.
- **Live_Chart_Demo**: The client-side Plotly.js candlestick chart in the Viz_Showcase that renders a bundled synthetic OHLC (open, high, low, close) stock dataset generated with a fixed seed.
- **Plotly_Bundle**: The Plotly.js partial bundle (containing only the trace types the site uses) shared by the Live_Chart_Demo and the Journey_Chart, lazy-loaded and requested at most once per page view.
- **Analysis_Section**: The "Business and systems analysis" section.
- **Skill_Constellation**: The interactive node map of skills grouped into clusters.
- **Certification_Card**: A badge card in the Cloud certifications section.
- **Certifications section**: The "Cloud certifications" section that holds the Certification_Cards over a cloud/network background.
- **Terminal_Band**: The section band that holds the Terminal_Widget, placed between the Certifications section and the Journey_Chart.
- **Journey_Chart**: The Journey section: an interactive Plotly.js step chart of the Owner's career progression, one marker per Journey_Stage.
- **Journey_Stage**: One entry of the typed array in `/src/data/journey.ts` with the fields label, approxYear and detail.
- **Journey_Tooltip**: The glassmorphism tooltip that the Journey_Chart shows for one Journey_Stage.
- **Built_With_AI_Section**: The "Built with AI: how this site was made" section.
- **Contact section**: The closing call-to-action section containing the headline, the Contact_Form (or mailto fallback) and contact links.
- **Contact_Form**: The validated contact form in the Contact section.
- **Footer**: The minimal footer rendered as the last element of the page (copyright, "Built with Kiro", social icon links, back-to-top control).
- **Form_Provider**: Web3Forms, the free-tier third-party form endpoint that receives Contact_Form submissions, identified by a Web3Forms access key that is public by design (sent from the browser) and is not a secret.
- **Honeypot_Field**: A hidden Contact_Form field that human Visitors do not see or fill, used to detect automated spam submissions.
- **Terminal_Widget**: The interactive terminal-style widget that responds to typed commands.
- **Reduced_Motion_Mode**: The state in which the Visitor's operating system or browser reports `prefers-reduced-motion: reduce`.
- **Theme**: The active color scheme, either dark (default) or light.
- **Base_Path**: The Vite `base` URL prefix under which the built site is served; defaults to "/".
- **Site_Origin**: The deployed site origin, defaulting to https://aishvaryaramesh08.github.io (GitHub Pages user site of the GitHub account AishvaryaRamesh08).
- **Nav_Group**: The group of one or more consecutive sections covered by one Navbar link, as defined in Requirement 7.
- **Deploy_Workflow**: The GitHub Actions workflow that builds and deploys the System to GitHub Pages.
- **Initial_Page_Weight**: Total bytes transferred over the network to render the Hook_Screen before any Visitor interaction or scrolling.
- **Mobile_Viewport**: A viewport narrower than 768 px.
- **Desktop_Viewport**: A viewport 1280 px wide or wider with a fine pointer (mouse or trackpad).
- **Denylist**: An Owner-maintained, non-public list of real employer internal system names that the build checks Content_Config, bundled demo datasets and build output against.

## Requirements

### Requirement 1: Static, Free-to-Run Architecture

**User Story:** As the Owner, I want the site to be 100% static and free to build, host and run, so that it costs nothing to keep online.

#### Acceptance Criteria

1. THE SYSTEM SHALL build, via the Vite production build, to a set of static files (HTML, CSS, JavaScript, fonts, images, data) that are served by a static file host without any server-side runtime, server-side rendering, serverless function or database.
2. THE SYSTEM SHALL be implemented with React, TypeScript and Vite, styled with Tailwind CSS, animated with Framer Motion (UI animation) and GSAP + ScrollTrigger (scroll storytelling), and charted with D3.js and Plotly.js.
3. THE SYSTEM SHALL render Background_Layer effects with custom SVG and 2D canvas drawing that loads no tsparticles, Three.js or React Three Fiber code.
4. WHERE Three.js or React Three Fiber is used, THE SYSTEM SHALL lazy-load the Three.js code as a separate JavaScript chunk excluded from the Initial_Page_Weight, request that chunk only when the section containing the Three.js content comes within one viewport height of the visible area, and render the Three.js content outside the Hook_Screen.
5. THE SYSTEM SHALL operate using only free-tier third-party services (the Form_Provider and GoatCounter analytics) and no paid APIs, such that the deployed site sends no network request to any third-party origin other than the Form_Provider and GoatCounter.
6. THE SYSTEM SHALL store all images, fonts, documents and data files in the repository and serve them from the same origin as the site, so that no image, font, document or data file is requested from a third-party origin.
7. IF the Three.js chunk fails to load, THEN THE SYSTEM SHALL render the containing section without the Three.js content and keep all other sections rendered and interactive.
8. IF the Form_Provider or GoatCounter is unreachable, THEN THE SYSTEM SHALL continue to render and operate every section, with only Contact_Form submission affected.

### Requirement 2: Hosting and Deployment

**User Story:** As the Owner, I want the site to deploy automatically to GitHub Pages when I push to main, so that publishing updates takes no manual steps.

#### Acceptance Criteria

1. WHEN a commit is pushed to the main branch, THE Deploy_Workflow SHALL build the System from that commit and publish the build output to GitHub Pages without any manual step by the Owner.
2. IF the build or any check configured in the Deploy_Workflow fails, THEN THE Deploy_Workflow SHALL stop without publishing, mark the GitHub Actions run as failed with the failing step identified in the run log, and leave the previously published version of the site unchanged.
3. THE SYSTEM SHALL prefix every asset reference, route and in-page link in the build output with the Base_Path, so that loading or reloading any page URL under the Site_Origin returns no not-found responses for bundled assets.
4. WHEN a Base_Path override or Site_Origin override is supplied at build time, THE SYSTEM SHALL produce build output whose assets, routes, in-page links and absolute URLs all resolve under the overridden values, including a sub-path such as "/portfolio/" for a GitHub Pages project site or another origin for Cloudflare Pages or Netlify free tiers, without changes to any source file.
5. WHEN a Visitor requests a path that does not exist on the deployed site, THE SYSTEM SHALL serve a static not-found page that contains a link navigating to the home page under the active Base_Path.
6. WHEN a commit is pushed to any branch other than main, THE Deploy_Workflow SHALL NOT publish to GitHub Pages.
7. IF a new commit is pushed to the main branch while an earlier Deploy_Workflow run is still in progress, THEN THE Deploy_Workflow SHALL leave the build of the most recent main-branch commit as the published version.
8. THE Deploy_Workflow SHALL publish the build output, built with the default Base_Path "/", from the repository `aishvaryaramesh08.github.io` of the GitHub account AishvaryaRamesh08 to the GitHub Pages user site served at the Site_Origin https://aishvaryaramesh08.github.io, with no custom domain configured.

### Requirement 3: Page Structure and Section Order

**User Story:** As a Visitor, I want the page to follow a clear narrative order, so that I understand the Owner's value quickly and can dig deeper.

#### Acceptance Criteria

1. THE SYSTEM SHALL render all sections on a single page in this order: Navigation, Hook_Screen, Intro_Screen, Story_Section, Pipeline_Diagram, Featured work, Viz_Showcase, Analysis_Section, Skill_Constellation, Cloud certifications, Terminal_Band, Journey_Chart, Built_With_AI_Section, Contact, Footer, with the document order of the sections matching their visual top-to-bottom order at both Mobile_Viewport and Desktop_Viewport widths.
2. THE SYSTEM SHALL render Navigation inside a header landmark containing a nav landmark, render each section from Hook_Screen through Contact as a section element inside a single main landmark with an accessible name matching that section's visible heading (for the Hook_Screen, which has no heading element, its visible headline text), and render the Footer as a footer landmark outside the main landmark.
3. THE SYSTEM SHALL give each of the 15 sections an anchor ID that is unique within the page, contains only lowercase letters, digits and hyphens, is present in the initially rendered page even while that section's content is still loading, and serves as the in-page navigation target for that section.
4. WHEN the page loads with a URL fragment that matches a section anchor ID, THE SYSTEM SHALL scroll to that section after the section has rendered.
5. IF the page loads with a URL fragment that matches no section anchor ID, THEN THE SYSTEM SHALL display the page from the Hook_Screen with all sections rendered and no error shown to the Visitor.

### Requirement 4: Content Configuration

**User Story:** As the Owner, I want all content in typed config files, so that I can update projects, skills, certifications, journey stages, hook images and visualization stages without touching components.

#### Acceptance Criteria

1. THE SYSTEM SHALL read all section copy, projects, skills, certifications, Journey_Stage entries, hook images, Viz_Stage entries, links and Terminal_Widget responses from the Content_Config in `/src/data/*.ts`, with none of this Visitor-visible content hard-coded in component source files.
2. THE Content_Config SHALL define TypeScript types for every content entry, marking each field as either required or optional.
3. IF a Content_Config entry omits a required field or contains a field of the wrong type, THEN THE SYSTEM SHALL fail the build with a non-zero exit status and a type error identifying the offending file and field, and SHALL NOT deploy that build.
4. WHEN the Owner edits, adds or removes a Content_Config entry and rebuilds, THE SYSTEM SHALL display the change without any component source change, with the number of rendered projects, skills, certifications, Journey_Stage entries and Viz_Stage entries each equal to the number of corresponding entries in the Content_Config, and with no empty slot rendered when the optional Stage 4 Viz_Stage entry is omitted.
5. IF an Owner-supplied asset (image, text or URL) is marked in the Content_Config as not yet provided, THEN THE SYSTEM SHALL render a Placeholder_Asset in the same layout position as the real asset, visibly displaying the word "Placeholder" and the name of the expected asset.
6. IF a Content_Config entry references an image file that does not exist in the project, THEN THE SYSTEM SHALL fail the build with a non-zero exit status and an error naming the missing file.
7. THE Content_Config SHALL reference each image file from exactly one entry, and every section that shows the same image, including the Hook_Screen and the Viz_Showcase for hookBefore and hookAfter, SHALL reuse that entry.
8. WHEN the Owner replaces the image file referenced by the hookBefore or hookAfter entry and rebuilds, THE SYSTEM SHALL display the new image in both the Hook_Screen and the Viz_Showcase.

### Requirement 5: Visual Identity and Theming

**User Story:** As a Visitor, I want a modern techno, data-and-AI-centric look, so that the site visually reflects the Owner's field.

#### Acceptance Criteria

1. WHEN a Visitor loads the page for the first time, THE SYSTEM SHALL display the dark Theme with a near-black navy background of #0A0E1A, ignoring the browser's prefers-color-scheme value.
2. WHEN a Visitor activates the Theme toggle, THE SYSTEM SHALL switch every section, the Navbar and the Background_Layer between the dark Theme and the light Theme within 300 ms, without a page reload and without changing the scroll position or clearing Contact_Form input.
3. THE SYSTEM SHALL give the Theme toggle an accessible name that identifies the Theme the toggle will switch to.
4. WHEN a Visitor switches the Theme, THE SYSTEM SHALL store the choice in browser local storage and, on the Visitor's next visit, apply the stored Theme before the first paint so that no frame displays the other Theme.
5. IF browser local storage is unavailable or holds a value other than the dark Theme or the light Theme, THEN THE SYSTEM SHALL display the Theme defined for a first visit in criterion 1, keep the Theme toggle working for the current page session, and display no error to the Visitor.
6. THE SYSTEM SHALL use electric cyan and violet as primary accent colors and neon green as a secondary accent color in both Themes.
7. THE SYSTEM SHALL use Space Grotesk for all headings, Inter for body text, and JetBrains Mono for code and terminal accents.
8. THE SYSTEM SHALL self-host all fonts from the repository and request no font files from third-party origins.
9. IF a self-hosted font file is still loading or fails to load, THEN THE SYSTEM SHALL render the affected text visibly in a fallback system font of the same generic family (sans-serif or monospace), with no period during which the text is invisible.
10. THE SYSTEM SHALL render subtle grid and circuit lines and flowing data particles as part of the Background_Layer, and use terminal-style labels set in JetBrains Mono and database and schema iconography as visual motifs.
11. THE SYSTEM SHALL apply glows, gradients and glassmorphism cards outside the Background_Layer only to the Navbar, the Hook_Screen after panel, Case_Study cards, Certification_Cards, the Journey_Tooltip and elements in an active interactive state (hover, keyboard focus or pressed), and to no other element.
12. THE SYSTEM SHALL apply a maroon accent to the Texas A&M "current" marker of the Journey_Chart in both Themes.

### Requirement 6: Global Background Layer ("The Backend Made Visible")

**User Story:** As a Visitor, I want a subtle backend-themed background behind every section, so that the site feels like it runs on a data platform.

#### Acceptance Criteria

1. THE Background_Layer SHALL render behind all sections, including the Hook_Screen and the Intro_Screen, below all foreground content in stacking order, with every decorative element at no more than 15 percent opacity, and without intercepting pointer, touch or keyboard input meant for foreground content.
2. THE Background_Layer SHALL draw crisp SVG line icons for cylinder databases, table grids, primary and foreign key icons, schema boxes connected by crow's-foot (ERD-style) relationship lines, cloud-storage icons, and small data-warehouse/lakehouse glyphs.
3. WHILE Reduced_Motion_Mode is off, THE Background_Layer SHALL drift in 2 to 3 depth layers as the Visitor scrolls, with each depth layer moving at a different speed and every depth layer moving slower than the foreground content.
4. WHILE Reduced_Motion_Mode is off, THE Background_Layer SHALL animate Data_Packets travelling along relationship lines from one database node to another database node.
5. WHILE Reduced_Motion_Mode is off, THE Background_Layer SHALL pulse a randomly selected database node at intervals between 3 and 8 seconds to suggest a query just ran.
6. WHEN the Intro_Screen or any later section first enters the viewport, including on a page load that starts scrolled past the Hook_Screen, THE Background_Layer SHALL fade in the Neural_Layer within 1 second (instantly while Reduced_Motion_Mode is on), with neural nodes connected to the database nodes, and keep the Neural_Layer visible for the Intro_Screen and all later sections.
7. THE SQL_Ticker SHALL display SQL and pipeline snippets in JetBrains Mono at 5 to 8 percent opacity, including `SELECT * FROM raw.orders;`, `MERGE INTO conformed.customers;`, `DAG: ingest >> clean >> validate >> load;` and `vector_index.upsert()`.
8. THE SYSTEM SHALL position the SQL_Ticker only in regions free of body text, or behind a text backing surface, so that body text keeps WCAG AA contrast.
9. WHILE the viewport is a Mobile_Viewport, including after a resize or orientation change crosses the 768 px boundary, THE Background_Layer SHALL render no more decorative objects (icons, Data_Packets and neural nodes combined) than the mobile object cap, a single configurable number lower than the object count rendered on a Desktop_Viewport.
10. WHILE the browser tab is hidden, THE Background_Layer SHALL pause all animation, and WHEN the tab becomes visible again, THE Background_Layer SHALL resume animation from its paused position without replaying missed frames.
11. WHILE Reduced_Motion_Mode is on, THE Background_Layer SHALL render a static version with no drift, Data_Packet movement, pulses or ticker scrolling.
12. THE SYSTEM SHALL set Background_Layer opacity and blur so that all foreground text, measured against the composited background at the text's position, meets WCAG AA contrast (at least 4.5:1 for normal text and 3:1 for large text) in both Themes.
13. THE Background_Layer SHALL be hidden from assistive technologies and SHALL contain no focusable elements.
14. WHEN Reduced_Motion_Mode turns on or off while the page is open, THE Background_Layer SHALL switch between the animated and static versions without a page reload.
15. IF the Background_Layer fails to initialize or render, THEN THE SYSTEM SHALL still render all foreground sections fully readable and operable, with the Background_Layer area left blank and no error shown to the Visitor.

### Requirement 7: Navigation

**User Story:** As a Visitor, I want a clear sticky navigation, so that I can jump to any section and know where I am on the page.

#### Acceptance Criteria

1. THE Navbar SHALL display a logo mark styled as a small database cylinder icon.
2. THE Navbar SHALL provide exactly eight links, in this order, each covering the Nav_Group listed and targeting the first section of that Nav_Group:
   1. Story: Intro_Screen, Story_Section and Pipeline_Diagram (target Intro_Screen).
   2. Work: Featured work (Case_Study cards).
   3. Visualization: Viz_Showcase.
   4. Analysis: Analysis_Section.
   5. Skills: Skill_Constellation, Certifications section and Terminal_Band (target Skill_Constellation).
   6. Journey: Journey_Chart.
   7. Built with AI: Built_With_AI_Section.
   8. Contact: Contact section.
3. WHEN a Visitor activates a Navbar link, THE SYSTEM SHALL smooth-scroll to the target section within 1000 ms, leave the target section heading fully visible below the bottom edge of the Navbar, and move keyboard focus to the target section heading.
4. WHILE Reduced_Motion_Mode is on, WHEN a Visitor activates a Navbar link, THE SYSTEM SHALL jump to the target section without smooth scrolling, leave the target section heading fully visible below the bottom edge of the Navbar, and move keyboard focus to the target section heading.
5. THE Navbar SHALL display a scroll-progress bar whose filled length equals the vertical scroll offset divided by (total page height minus viewport height), within ±1 percentage point, showing 0% at the top of the page and 100% at the bottom, and updating within 100 ms of each scroll change.
6. THE Navbar SHALL display the dark/light Theme toggle.
7. WHILE the bottom edge of the Hook_Screen is below the bottom edge of the Navbar, THE Navbar SHALL render with a fully transparent background and no backdrop blur, while keeping the logo mark, the links or menu button, and the Theme toggle visible.
8. WHEN the bottom edge of the Hook_Screen moves above the bottom edge of the Navbar, THE Navbar SHALL render fully visible with the glassmorphic background (translucent fill with backdrop blur).
9. WHILE the viewport is a Mobile_Viewport, THE Navbar SHALL replace the inline links with a menu button that has an accessible name, exposes its expanded or collapsed state to assistive technologies, and opens the Mobile_Menu when activated.
10. WHEN the Mobile_Menu opens, THE SYSTEM SHALL cover 100% of the viewport, display all eight Navbar links with the labels and in the order given in criterion 2, play an entrance animation that completes within 400 ms (or show the Mobile_Menu with no animation while Reduced_Motion_Mode is on), and move keyboard focus to the first link.
11. WHEN the scroll position changes, THE Navbar SHALL mark as current exactly one link, the one whose Nav_Group (criterion 2) contains the section that contains the viewport's vertical midpoint, using a visual indicator that does not rely on color alone and that is exposed to assistive technologies as the current item; IF the viewport's vertical midpoint lies in the Hook_Screen, the Footer or any other area outside every Nav_Group, THEN THE Navbar SHALL mark no link as current.
12. WHILE the Mobile_Menu is open, THE SYSTEM SHALL keep keyboard focus cycling only among the Mobile_Menu's controls on Tab and Shift+Tab, and SHALL prevent the page behind the Mobile_Menu from scrolling.
13. WHEN a Visitor presses Escape, activates a Mobile_Menu close control, or activates a Mobile_Menu link, THE SYSTEM SHALL close the Mobile_Menu and set the menu button to collapsed; on Escape or close-control activation it SHALL return keyboard focus to the menu button, and on link activation it SHALL navigate and move focus as specified in criteria 3 and 4.

### Requirement 8: Screen 1 — "The Hook"

**User Story:** As a Visitor, I want the first screen to show a single question and a side-by-side before/after chart comparison, so that I immediately see the jump from raw chart to product-grade visual that the Owner delivers.

#### Acceptance Criteria

Criteria 1 and 2 are the Owner's own acceptance criteria 1 and 3, preserved verbatim; in criterion 2, "the auto-animation" refers to the Hook_Arrow animation. The Owner's original criterion 2 ("WHEN a visitor drags or taps the slider, …") was superseded on 2026-10-18, when the Owner replaced the hook slider with side-by-side panels and an animated arrow.

1. WHEN the page loads, THE SYSTEM SHALL show Screen 1 first, before any introduction text.
2. WHEN prefers-reduced-motion is set, THE SYSTEM SHALL skip the auto-animation and typed effects.
3. THE Hook_Screen SHALL render the raw CSV preview and interactive Plotly chart from their respective Content_Config entries without relying on image assets.
4. THE Hook_Screen SHALL render the raw CSV preview from the same deterministic synthetic OHLC dataset used by the Plotly chart, with eight visible rows and a footer indicating 9,992 additional rows.
5. THE raw CSV preview SHALL display a caption and literal comma-separated text with a header and columns date, ticker, open, high, low, close and volume, without rendering a table or row numbers.
6. THE Hook_Screen SHALL render with a minimum height equal to the viewport height on first render.
7. THE Hook_Screen SHALL keep both comparison panels within the available viewport width.
8. WHILE the viewport is wider than or equal to 768 px, THE Hook_Screen SHALL display the headline "Want your data to go from this…" on the left and "…to this?" on the right, with "…to this?" beginning to appear only after "Want your data to go from this…" is fully displayed, and both parts fully displayed within 3 seconds of the Hook_Screen's first render.
9. THE Hook_Screen SHALL render the headline as styled HTML text that is not a heading element (no h1 to h6 element and no heading role), leaving the Owner's name on the Intro_Screen as the page's single h1 (Requirement 9).
10. WHILE the viewport is wider than or equal to 768 px, THE Hook_Screen SHALL display the raw CSV panel on the left and the Plotly chart on the right, side by side in a single row, with the Hook_Arrow between them pointing right.
11. THE Hook_Screen SHALL display the raw CSV preview with the label chip "Before · raw CSV · messy" and the interactive Plotly chart with the label chip "After · Plotly · interactive".
12. THE raw CSV preview SHALL show messy CSV values directly, including a NULL value, a blank cell, a blank line, an exact duplicate record, mixed date formats, inconsistent ticker casing and a price stored as text.
13. WHILE Reduced_Motion_Mode is off, WHEN the Hook_Screen first renders during a page load, THE Hook_Arrow SHALL play its animation once, completing within 3 seconds of the Hook_Screen's first render, and SHALL NOT replay the animation when the Hook_Screen re-enters the viewport during the same page load.
14. THE Hook_Arrow SHALL be hidden from assistive technologies and SHALL contain no focusable element.
15. THE Hook_Screen SHALL display the subline "I'm Aishvarya. I build the pipelines and the visuals that make that jump." beneath the comparison panels.
16. WHEN a Visitor activates the primary CTA "Meet the engineer ↓" by click, tap, or the Enter key, THE SYSTEM SHALL scroll so that the top of the Intro_Screen is aligned with the bottom edge of the Navbar, using an instant (non-animated) scroll WHILE Reduced_Motion_Mode is on.
17. WHEN a Visitor activates the secondary link "See how I did it" by click, tap, or the Enter key, THE SYSTEM SHALL scroll so that the top of the Viz_Showcase is aligned with the bottom edge of the Navbar, using an instant (non-animated) scroll WHILE Reduced_Motion_Mode is on.
18. WHILE the viewport is a Mobile_Viewport, THE Hook_Screen SHALL wrap the headline onto two lines and stack the raw CSV panel above the downward-pointing Hook_Arrow and the Plotly panel. Horizontal overflow SHALL be contained within the raw CSV scroller.
19. THE Hook_Screen SHALL provide an accessible name for the raw CSV preview and the Plotly chart, and a text description of the chart controls.
20. IF Plotly fails to load or render, THEN THE Hook_Screen SHALL display an explicit error while keeping the raw CSV comparison visible.
21. WHILE Reduced_Motion_Mode is on, THE Hook_Screen SHALL render both headline parts fully displayed on first render and the Hook_Arrow as a static arrow in its final position with no animated movement.
22. THE Hook_Screen Plotly chart SHALL provide range-selector presets for one month, three months and the full dataset, plus a draggable x-axis range slider.

### Requirement 9: Screen 2 — Introduction

**User Story:** As a Visitor, I want a concise introduction with key facts, so that I know who the Owner is and what she has done within seconds.

#### Acceptance Criteria

1. THE Intro_Screen SHALL display the name "Aishvarya Ramesh" as the page's single h1 heading, rendered at a larger font size than any other text on the Intro_Screen, immediately followed by the title line "Data Engineer · MS MIS @ Texas A&M (Mays Business School) · Ex-Wells Fargo".
2. WHILE Reduced_Motion_Mode is off, THE Intro_Screen SHALL cycle a single typewriter line through "I build data pipelines." / "I turn messy data into decisions." / "I get data ready for AI." in that order, holding each fully typed line for at least 2 seconds before advancing, and returning to the first line after the third.
3. WHILE Reduced_Motion_Mode is on, THE Intro_Screen SHALL display all three typewriter lines as static text in the order listed in criterion 2, with no typing, deleting or blinking-cursor animation.
4. THE Intro_Screen SHALL display the Owner-editable intro paragraph from the Content_Config, with this initial placeholder value: "I'm a data engineer who spent four years at Wells Fargo building cloud pipelines and automating data loads at scale, and I'm now studying Management Information Systems at Texas A&M to pair that engineering depth with business and systems analysis. I care about the full chain: getting data in, making it trustworthy, showing it clearly, and preparing it for AI."
5. THE Intro_Screen SHALL display three compact chips in this order: "4 years in data engineering", "50+ tables migrated to BigQuery", "3 cloud certifications".
6. WHILE Reduced_Motion_Mode is off, WHEN a chip first has at least 50% of its area inside the viewport, THE Intro_Screen SHALL animate the chip number counting up from 0 to its final value ("4", "50+", "3") within 2 seconds, once per page load, ending on the exact final text from criterion 5; WHILE Reduced_Motion_Mode is on, THE Intro_Screen SHALL display the final value with no count-up.
7. WHEN the Visitor activates the "Explore my work" CTA or the "Let's talk" CTA by pointer, touch or keyboard, THE Intro_Screen SHALL scroll to the Featured work section or the Contact section respectively and move keyboard focus to that section, scrolling instantly instead of smoothly WHILE Reduced_Motion_Mode is on.
8. THE SYSTEM SHALL use only facts and numbers that appear in the Owner's resume for Intro_Screen chips.
9. WHEN the Visitor activates the "Download resume" CTA, THE SYSTEM SHALL start a download of the resume PDF stored in the repository and served under the Base_Path, without navigating away from the page.
10. IF the resume PDF is not present in the repository at build time, THEN THE SYSTEM SHALL complete the build and render the "Download resume" CTA as a Placeholder_Asset labeled "Placeholder" and "resume PDF" that does not link to a missing file.
11. THE Intro_Screen SHALL expose the three typewriter lines to assistive technologies as complete static text and SHALL NOT announce individual typed or deleted characters.

### Requirement 10: Why I Love Data (Personal Story)

**User Story:** As a Visitor, I want a short personal story, so that I understand why the Owner does this work.

#### Acceptance Criteria

1. THE Story_Section SHALL render a messy table, sourced from the Content_Config, containing 4 to 10 data rows that together include at least one null value, at least one duplicate row and at least one column with inconsistent value formats, together with a corresponding cleaned table in which nulls are filled or explicitly marked, duplicate rows are removed and each column uses a single format.
2. WHILE Reduced_Motion_Mode is off, WHEN the Visitor scrolls through the Story_Section, THE Story_Section SHALL animate the messy table into the cleaned table one row at a time in step with scroll position, showing row k of n in its cleaned state once scroll progress through the Story_Section reaches k/n (progress 0 = Story_Section top edge at the viewport bottom, progress 1 = Story_Section bottom edge at the viewport bottom), in both scroll directions, so that the displayed state at a given scroll position is identical whether reached by scrolling down or up.
3. WHILE Reduced_Motion_Mode is on, THE Story_Section SHALL display the messy table and the cleaned table side by side as static content with no scroll-linked or timed animation, including when Reduced_Motion_Mode turns on after page load, without requiring a page reload.
4. THE Story_Section SHALL use a rows-and-columns table visual that does not reuse the raw CSV preview or Plotly chart from the Hook_Screen.
5. THE Story_Section SHALL display the Owner-editable story text from the Content_Config verbatim, preserving its paragraphs in their original order, styled as a terminal-like pull quote rendered in a monospace typeface inside a bordered block, with this initial placeholder value:
   "Data rarely shows up clean. It arrives from five systems, three formats and a dozen assumptions nobody wrote down. I like the work between that mess and a decision: figuring out what the data is supposed to mean, building the pipeline that makes it consistent, and checking it until people can rely on it.
   At Wells Fargo I spent four years doing that at scale, moving tables from on-premise systems into the cloud, automating loads that used to be manual, and working with product owners to turn vague asks into testable requirements. Now at Texas A&M, I'm pairing that engineering background with business and systems analysis, because the best pipeline is still wasted if it answers the wrong question.
   What keeps me interested is the whole chain: sourcing, modeling, governing, visualizing, and now making data ready for AI."
6. IF the story text in the Content_Config is missing or empty, THEN THE Story_Section SHALL display a Placeholder_Asset naming the story text as the expected asset in place of the pull quote and SHALL continue to render the messy-to-clean table.
7. THE Story_Section SHALL expose the messy-to-clean table content to assistive technologies as a data table with a caption describing the cleaning step and column headers, with both the messy and cleaned values available regardless of current scroll position or animation progress.

### Requirement 11: Interactive Pipeline — "How I Think About Data"

**User Story:** As a Visitor, I want an interactive pipeline diagram, so that I can see how the Owner structures data from source to insight.

#### Acceptance Criteria

1. THE Pipeline_Diagram SHALL display the stages Source → Raw → Staging → Sanitized → Conformed → Insights / AI in that order, left to right in a single horizontal row on viewports 768 px and wider, with all stages collapsed and no stage active on initial render, without causing horizontal scrolling of the page.
2. WHILE the viewport is a Mobile_Viewport, THE Pipeline_Diagram SHALL display the stages in a single vertical column in the same order from top to bottom, without causing horizontal scrolling of the page.
3. WHEN a Visitor clicks, taps or presses Enter or Space on a collapsed stage node, THE Pipeline_Diagram SHALL expand that stage to show its explanation from the Content_Config, mark that stage as active, and collapse any previously expanded stage so that at most one stage is expanded and active at a time.
4. THE Content_Config SHALL include stage explanations such that each of deduplication, PII handling, incremental refresh, validation, referential integrity and governance is named in at least one stage explanation.
5. WHILE Reduced_Motion_Mode is off, THE Pipeline_Diagram SHALL animate particles flowing along the connectors between adjacent stages in the direction from Source to Insights / AI.
6. WHILE a stage is active, THE Pipeline_Diagram SHALL apply a glow to that stage node and to no other stage node.
7. THE Pipeline_Diagram SHALL display visible text stating that it is grounded in the layered ELT architecture the Owner built on GCP/BigQuery at Wells Fargo.
8. THE Pipeline_Diagram SHALL expose each stage node as a keyboard-focusable button, reached by Tab in stage order, with an accessible name containing the stage name and an expanded/collapsed state that matches the stage's visible state.
9. WHEN a Visitor clicks, taps or presses Enter or Space on the expanded stage node, THE Pipeline_Diagram SHALL collapse that stage and leave no stage expanded or active.
10. WHILE Reduced_Motion_Mode is on, THE Pipeline_Diagram SHALL show static directional connectors pointing from Source toward Insights / AI in place of moving particles, and expand or collapse stages without animated transitions.
11. IF a stage has no explanation in the Content_Config, THEN THE Pipeline_Diagram SHALL show a Placeholder_Asset in that stage's expanded area and continue to render all other stages normally.

### Requirement 12: Featured Work Case Studies

**User Story:** As a hiring manager, I want each project told as a case study, so that I can judge the problem, the approach and the outcome.

#### Acceptance Criteria

1. THE SYSTEM SHALL display the following Case_Study cards, sourced from the Content_Config, in this order:
   1. Migrating 50+ tables to the cloud (Wells Fargo): greenfield ELT on GCP with Python, SQL and Airflow, moving on-prem sources including PII data into BigQuery through raw, staging, sanitized and conformed layers with deduplication and incremental refresh.
   2. GenAI Autosys dependency visualizer (Wells Fargo, Spotlight Award): interactive graph of job dependencies and failure impact.
   3. Automated ETL at scale (Wells Fargo): UNIX shell + PySpark loading time-critical files into SQL Server across 200+ subject areas, cutting development time by about 75% for a four-person team.
   4. GenAI test-data generation: Microsoft Copilot producing 100+ records across 200 tables from DDLs within hours.
   5. Enterprise Data Lakehouse & RAG Pipeline (AWS, in progress): messy multi-source ERP data into a normalized 3NF schema with validated referential integrity, audit triggers, generated columns and role-based security views, feeding a vector database for natural-language retrieval.
   6. Stock Market Analysis and Conversational AI Assistant: Plotly/Dash candlestick platform, Random Forest classifier (97.36% accuracy on engulfing patterns), Rasa voice/text assistant.
   7. Power BI incident dashboard (Kimberly-Clark): replaced manual reporting with automated daily refreshes, recognized by the Global CIO.
2. WHEN a Visitor activates a Case_Study card by click, tap, Enter or Space, THE SYSTEM SHALL expand the Case_Study into a modal or inline section showing exactly five headed subsections in this order: Challenge, Approach, Architecture diagram, Outcome and Tech, and SHALL collapse any other expanded Case_Study so that at most one Case_Study is expanded at a time.
3. WHEN a Case_Study expands and Reduced_Motion_Mode is off, THE SYSTEM SHALL animate its tech chips into view, with the animation completing within 600 ms of expansion.
4. WHILE Reduced_Motion_Mode is on, WHEN a Case_Study expands, THE SYSTEM SHALL display its tech chips in their final position with no animation.
5. WHEN a Case_Study opens as a modal, THE SYSTEM SHALL move keyboard focus into the modal, trap keyboard focus inside the modal, close the modal on Escape or on the close button, and return focus to the originating card.
6. WHEN a Visitor activates the card or collapse control of a Case_Study expanded inline, THE SYSTEM SHALL collapse that Case_Study and keep keyboard focus on its card.
7. THE SYSTEM SHALL display a "work in progress" badge on the Enterprise Data Lakehouse & RAG Pipeline Case_Study, both on its card and in its expanded view.
8. THE SYSTEM SHALL render each Case_Study architecture diagram as an SVG with a text alternative that names every component shown in the diagram and the direction of data flow between them.
9. WHERE the Owner has not yet supplied a Case_Study architecture diagram, THE SYSTEM SHALL render a Placeholder_Asset in that Case_Study's Architecture diagram subsection and still render the other four subsections.
10. THE SYSTEM SHALL display in Case_Study content only numeric figures, employers, awards and outcomes that appear in the Owner's resume.

### Requirement 13: Autosys Dependency Demo

**User Story:** As an engineer, I want to try a small version of the dependency visualizer, so that I can see the idea without exposing internal systems.

#### Acceptance Criteria

1. THE Dependency_Demo SHALL render a D3 force-directed graph of 5 to 30 job nodes connected by directed dependency edges, using only fictional job names from the Content_Config, with each node showing its job name as a visible label and reachable by keyboard Tab focus.
2. IF a Content_Config dependency edge references a job name that is not defined in the Dependency_Demo job list, THEN THE SYSTEM SHALL fail the build with an error identifying the invalid edge.
3. WHEN a Visitor clicks, taps, or presses Enter or Space on a job node that is not currently failed, THE Dependency_Demo SHALL, within 300 ms, clear any previously failed node and its highlights, mark the selected node as "failed" with a styling different from the downstream highlight styling, and highlight every downstream job reachable from that node, so that at most one node is failed at any time.
4. FOR ALL dependency graphs, including graphs that contain dependency cycles, and all selected failed nodes, THE Dependency_Demo SHALL highlight exactly the set of nodes other than the failed node that are reachable from the failed node by following dependency edges downstream, with each such node highlighted once (reachability property).
5. WHEN a Visitor clicks, taps, or presses Enter or Space on the failed node, or activates the keyboard-operable reset control, THE Dependency_Demo SHALL clear the failure state and all highlights and return every node to its initial unhighlighted styling.
6. THE Dependency_Demo SHALL provide a text list naming each currently highlighted downstream job, and SHALL announce changes to that list to assistive technologies within 1 second of each failure or reset action.
7. IF the failed node has no downstream jobs, THEN THE Dependency_Demo SHALL highlight no other nodes and SHALL show a text list entry stating that zero downstream jobs are affected.
8. THE Dependency_Demo SHALL exclude D3 code from the Initial_Page_Weight and SHALL load D3 code only when the Dependency_Demo container comes within 200 px of the viewport or the Case_Study is expanded, whichever happens first.
9. IF the D3 code fails to load, THEN THE Dependency_Demo SHALL show a message saying the interactive demo is unavailable, followed by a static text list of the fictional jobs and their dependencies, and the rest of the Case_Study SHALL stay readable and operable.

### Requirement 14: Visualization Showcase — "From Basic Chart to Product-Grade Dashboard"

**User Story:** As a Visitor, I want a step-by-step walkthrough from a basic chart to a full dashboard, so that I can see how the Owner thinks about visualization design.

#### Acceptance Criteria

1. THE Viz_Showcase SHALL present Viz_Stages in order: Stage 1 raw CSV (the messy source data), Stage 2 Plotly (the same data made interactive with hover, zoom and candlestick traces), Stage 3 Dash (the full dashboard UI with layout, controls, linked charts and styling), and optional Stage 4 (the dashboard with the conversational assistant on top).
2. THE Viz_Showcase SHALL use the hookBefore Content_Config entry for Stage 1 and the hookAfter Content_Config entry for Stage 2, without duplicate image files.
3. THE SYSTEM SHALL load Viz_Stage images from `/src/assets/viz/` as referenced in the Content_Config, with fixed width and height attributes so that switching Viz_Stages causes no layout shift.
4. WHERE the Owner has supplied the Stage 4 screenshot in the Content_Config, THE Viz_Showcase SHALL display Stage 4 as the fourth Viz_Stage; otherwise THE Viz_Showcase SHALL display Stages 1 to 3 only, with no empty slot, tab or indicator position for Stage 4.
5. WHILE Reduced_Motion_Mode is off, WHEN the Visitor scrolls through the Viz_Showcase, THE Viz_Showcase SHALL pin the stage panel in the viewport and wipe or crossfade between adjacent Viz_Stages in step with scroll position, making Viz_Stage k of n current once scroll progress through the pinned range reaches (k − 1)/n, so that the current Viz_Stage at a given scroll position is identical whether reached by scrolling down or up, and SHALL release the pin after the last displayed Viz_Stage.
6. THE Viz_Showcase SHALL display Viz_Stage_Tabs in every motion state, with one tab per displayed Viz_Stage, following the WAI-ARIA tabs pattern: a tablist containing tab elements that each control one tabpanel, aria-selected set to true only on the current Viz_Stage's tab, and only the current tab included in the Tab order.
7. WHILE Reduced_Motion_Mode is off, WHEN a Visitor activates a Viz_Stage_Tabs tab by click, tap, Enter or Space, THE Viz_Showcase SHALL scroll the page to the scroll position at which that Viz_Stage is current under criterion 5 and complete the wipe or crossfade to that Viz_Stage within 600 ms.
8. WHILE Reduced_Motion_Mode is on, THE Viz_Showcase SHALL render the stage panel without pinning or scroll-linked transitions, and WHEN a Visitor activates a Viz_Stage_Tabs tab, THE Viz_Showcase SHALL switch to the selected Viz_Stage instantly with no wipe, crossfade or other animated transition.
9. THE Viz_Showcase SHALL display at least one annotation callout at each Viz_Stage, read from the Content_Config, describing what changed and why (interactivity, layout, color, hierarchy, usability).
10. THE Viz_Showcase SHALL display a "What I changed" panel for each Viz_Stage with 2 to 3 short bullets from the Content_Config.
11. WHEN a Viz_Stage_Tabs tab has keyboard focus and the Visitor presses the Right Arrow, Left Arrow, Home or End key, THE Viz_Showcase SHALL move keyboard focus to and select the next, previous, first or last tab respectively, making its Viz_Stage current as defined in criterion 7 or 8, and SHALL leave the current Viz_Stage unchanged when Right Arrow is pressed on the last displayed Viz_Stage's tab or Left Arrow is pressed on Stage 1's tab.
12. WHERE a Dash demo URL is set in the Content_Config, THE Viz_Showcase SHALL display a link to the separately hosted Dash demo that opens in a new browser tab; WHERE no Dash demo URL is set, THE Viz_Showcase SHALL display no Dash demo link.
13. THE Viz_Showcase SHALL use pre-rendered images, Plotly.js figures exported as JSON, and embedded screenshots or short screen recordings in place of a running Dash app, and SHALL send no request to a Dash server when rendering any Viz_Stage.
14. THE Viz_Showcase SHALL display the current Viz_Stage number and name together with the total number of displayed Viz_Stages, and SHALL announce the new Viz_Stage to assistive technologies each time the current Viz_Stage changes.
15. IF a Viz_Stage image fails to load at runtime, THEN THE Viz_Showcase SHALL display that image's alt text and a message indicating the image is unavailable within the image's fixed-size area, while keeping that Viz_Stage's annotation callouts, "What I changed" panel and Viz_Stage_Tabs operable.
16. IF a Viz_Stage Content_Config entry has fewer than 2 or more than 3 "What I changed" bullets, or any bullet longer than 120 characters, THEN THE SYSTEM SHALL fail the build with an error naming the offending Viz_Stage.

### Requirement 15: Live Plotly.js Demo

**User Story:** As a Visitor, I want to interact with a real chart, so that I can experience the interactivity the showcase describes.

#### Acceptance Criteria

1. THE Live_Chart_Demo SHALL render a Plotly.js candlestick (OHLC) trace client-side from a synthetic (made-up) OHLC stock sample dataset that is generated from a fixed seed and bundled with the site as a static JSON file, without requesting chart data from any source other than the site's own static files.
2. WHEN the Visitor hovers over a data point (or taps it on a touch device), THE Live_Chart_Demo SHALL display a tooltip showing that point's date and its open, high, low and close values.
3. WHEN the Visitor drag-selects a region of the plot area, THE Live_Chart_Demo SHALL zoom the axes to the selected region, and WHEN the Visitor double-clicks or double-taps the plot area, THE Live_Chart_Demo SHALL restore the full dataset range.
4. WHEN the Visitor activates a range selector option, THE Live_Chart_Demo SHALL set the visible x-axis range to that option's interval, where the range selector offers at least 2 preset intervals plus an option that restores the full dataset range.
5. WHEN the Live_Chart_Demo container first comes within 200 px of the viewport during a page view, THE SYSTEM SHALL request the sample dataset and, unless the Journey_Chart has already requested it, the Plotly_Bundle, both of which SHALL be excluded from the Initial_Page_Weight and requested at most once per page view.
6. WHILE the Plotly_Bundle or the sample dataset is loading, THE Live_Chart_Demo SHALL display a placeholder with a loading indicator at the same width and height as the rendered chart, so that replacing the placeholder with the chart moves no surrounding content.
7. IF the Plotly_Bundle or the sample dataset fails to load, fails to parse, or has not finished loading within 15 seconds of the request, THEN THE Live_Chart_Demo SHALL replace the placeholder with the hookAfter image and a message stating that the live chart is unavailable, at the same fixed dimensions, while all other sections remain functional.
8. THE Live_Chart_Demo SHALL expose an accessible name and a text description stating what the chart shows and its full x-axis range to assistive technologies.
9. FOR ALL valid sample datasets, serializing the dataset to the bundled JSON format and parsing the JSON back SHALL produce an equivalent dataset (round-trip property).
10. THE Live_Chart_Demo SHALL display a visible "sample data" label adjacent to the chart, and SHALL include in its text description (criterion 8) that the dataset is synthetic sample data.
11. FOR ALL seed values, generating the sample dataset twice with the same seed SHALL produce identical datasets, and generating it with the fixed seed SHALL reproduce the bundled dataset exactly (determinism property).
12. FOR ALL generated sample dataset rows, THE SYSTEM SHALL produce values where the low value is less than or equal to each of the open and close values, and the high value is greater than or equal to each of the open and close values (OHLC invariant).

### Requirement 16: Business and Systems Analysis

**User Story:** As a TPM or analytics hiring manager, I want to see the Owner's analysis and design work beyond code, so that I can evaluate her requirements and systems skills.

#### Acceptance Criteria

1. THE Analysis_Section SHALL display, as either cards or a flow diagram, exactly five labeled items, one for each of: gathering and translating business requirements into specs, writing user stories with acceptance criteria, sprint planning input, stakeholder communication, and technical documentation, with each item showing a title and a description of at least one sentence.
2. THE Analysis_Section SHALL display a gallery of exactly four analysis and design artifacts drawn as SVGs: a sample data flow diagram, an ERD, a use-case diagram and a user story card, with each artifact showing a visible caption.
3. THE Analysis_Section SHALL label each artifact as illustrative and identify its source as either the Owner's coursework or the Product@TAMU case work, and every artifact SHALL contain only fictional or sample data.
4. THE Analysis_Section SHALL display as visible text the Texas A&M courses Advanced Data Management, Advanced Systems Analysis & Design, and Project Management.
5. THE Analysis_Section SHALL display as visible text the Product@TAMU Mobile Productivity Leap team case challenge, identified as a team case challenge.
6. WHEN a Visitor activates a gallery artifact by click, tap, Enter or Space, THE Analysis_Section SHALL display that artifact enlarged beyond its gallery size, scaled to fit within the viewport width and height without page scrolling, together with its caption.
7. THE Analysis_Section SHALL provide for each SVG artifact a text alternative that names the artifact type and lists the main elements it depicts (for example, the entities in the ERD or the actors in the use-case diagram).
8. THE Analysis_Section SHALL expose each gallery artifact as a keyboard-focusable button whose accessible name includes the artifact's caption.
9. WHILE an artifact is displayed enlarged, THE Analysis_Section SHALL trap keyboard focus inside the enlarged view, close the enlarged view when the Visitor presses Escape or activates the close button, and return keyboard focus to the originating gallery artifact on close.

### Requirement 17: Skills Tech Constellation

**User Story:** As a Visitor, I want to explore skills as an interactive map, so that I can see how skills relate to each other and to real projects.

#### Acceptance Criteria

1. THE Skill_Constellation SHALL render skills as an interactive node map in which each cluster is visually grouped and labeled with its cluster name, and SHALL NOT use progress bars, percentage ratings or a plain list as the primary presentation.
2. THE Skill_Constellation SHALL include these clusters and skills:
   - Data engineering: Python, SQL, PySpark/Apache Spark, Airflow, ETL/ELT, SSIS, UNIX, data pipelines, data warehousing, data transformation
   - Cloud: AWS, GCP, BigQuery, Azure
   - Databases: SQL Server, Oracle, BigQuery
   - Analysis and visualization: Power BI, Plotly, Dash, Excel
   - AI/ML: Generative AI, LLMs, Microsoft Copilot, machine learning, Rasa NLU, RAG
   - Systems and delivery: Agile, Jira, Git, requirements gathering, stakeholder communication, technical documentation
3. THE Skill_Constellation SHALL render exactly one node per distinct skill in the Content_Config, and a skill that belongs to more than one cluster (BigQuery in Cloud and Databases) SHALL be a single node visually connected to every cluster it belongs to.
4. WHEN a Visitor hovers (on a Desktop_Viewport), taps or focuses a skill node, THE Skill_Constellation SHALL, within 200 ms, highlight the selected node, its related skills (every other skill that shares at least one cluster with the selected skill) and the Case_Study projects that used that skill, and SHALL visually de-emphasize all other nodes.
5. WHEN the pointer leaves the selected node, focus moves off it, the Visitor presses Escape, or the Visitor taps outside any skill node, THE Skill_Constellation SHALL remove the highlight and return all nodes to their default state within 200 ms.
6. FOR ALL skills in the Content_Config, THE Skill_Constellation SHALL highlight exactly the projects whose Content_Config tech list contains that skill, with no projects missing and no extra projects, whichever cluster the node is reached from (consistency property).
7. IF the selected skill is not in any Case_Study tech list in the Content_Config, THEN THE Skill_Constellation SHALL highlight its related skills, highlight no projects, and show a text note that no featured project currently uses that skill, without raising a runtime error.
8. THE Skill_Constellation SHALL provide a text listing that screen readers can reach and that does not depend on pointer interaction, naming every cluster, listing each skill under every cluster it belongs to, and for each skill either naming the related Case_Study projects or stating that there are none.
9. THE Skill_Constellation SHALL make every skill node reachable with Tab and Shift+Tab, give each node an accessible name containing the skill name and all of its cluster names, and show a visible focus indicator on the focused node.

### Requirement 18: Cloud Certifications

**User Story:** As a recruiter, I want to see and verify the Owner's cloud certifications, so that I can trust the credentials.

#### Acceptance Criteria

1. THE SYSTEM SHALL display a certifications section with a visible heading and exactly three Certification_Cards, read from the Content_Config, in this order: Google Cloud Certified – Cloud Digital Leader; Microsoft Certified – Azure AI Fundamentals; Microsoft Certified – Azure Fundamentals; the cards SHALL appear in a single row on a Desktop_Viewport and stacked in a single column on a Mobile_Viewport.
2. THE Certification_Card SHALL display the issuer logo with alternative text naming the issuer, the certification name, a "what this means for my work" statement of at most 120 characters, and a "Verify" link whose accessible name includes the certification name.
3. WHEN a Visitor activates an enabled "Verify" link by pointer or keyboard, THE SYSTEM SHALL open the credential URL from the Content_Config in a new browser tab with rel="noopener noreferrer", leaving the original tab on the site at its current scroll position.
4. IF a Certification_Card's credential URL in the Content_Config is missing, empty, or not an absolute https:// URL, THEN THE SYSTEM SHALL render that card's "Verify" link as disabled: visibly marked as pending, exposed as disabled to assistive technologies, and performing no navigation on click or keyboard activation, while the rest of the card renders normally.
5. WHEN a Visitor hovers over or keyboard-focuses a Certification_Card and Reduced_Motion_Mode is off, THE Certification_Card SHALL play a hover animation that completes within 300 ms and reverses within 300 ms after hover or focus ends.
6. THE certifications section SHALL display a cloud/network background at no more than 20% opacity behind the cards that does not intercept pointer events and keeps all card text at a contrast ratio of at least 4.5:1.
7. IF a Certification_Card's issuer logo or badge image is missing from the Content_Config or fails to load, THEN THE SYSTEM SHALL render a Placeholder_Asset at the same dimensions in its place without changing the card's layout.
8. WHILE Reduced_Motion_Mode is on, THE Certification_Card SHALL omit the hover animation and SHALL still display a visible focus indicator when it receives keyboard focus.

### Requirement 19: Journey Chart

**User Story:** As a Visitor, I want an interactive step chart of the Owner's career progression, so that I understand her path at a glance and see the Plotly skill shown elsewhere on the site applied to her own story.

#### Acceptance Criteria

Criteria 1 to 3 are the Owner's own acceptance criteria, preserved verbatim. Criterion 4 restates the Owner's fourth criterion in EARS form, with the original quoted. In criteria 1 to 3, "THE SYSTEM" refers to the Journey_Chart, a "marker" is a Journey_Stage marker, a stage's "title" is its label value, and the "styled tooltip" is the Journey_Tooltip.

1. WHEN a visitor hovers or taps a marker, THE SYSTEM SHALL display that stage's title and hover detail in a styled tooltip.
2. WHEN the chart is viewed on a touch device, THE SYSTEM SHALL support tap-to-reveal for all four tooltips without requiring hover.
3. WHEN prefers-reduced-motion is set, THE SYSTEM SHALL render the chart without entrance animation while keeping tooltip interactivity.
4. THE Journey_Chart SHALL read its data from `/src/data/journey.ts` in the Content_Config as a typed array of Journey_Stage entries with the required fields label, approxYear and detail, so that editing that file and rebuilding changes the chart text with no change to the Journey_Chart component source. (Owner criterion, verbatim: "Chart data lives in the content config (/src/data/journey.ts) as a typed array of {label, approxYear, detail}, so text can be updated without touching the chart component.")
5. THE Content_Config SHALL hold these four Journey_Stage entries in this order, with these initial values (approximate years only):
   1. label "Undergraduate"; approxYear "~2018-2022"; detail "M S Ramaiah Institute of Technology, Bengaluru. B.E. in Electronics & Telecommunication Engineering. Event Coordinator for "Empyreal" tech fest, 50+ volunteers; coursework in Data Structures & Algorithms, OOP, Machine Learning, IoT."
   2. label "Kimberly-Clark"; approxYear "~2022"; detail "Graduate Engineer Trainee Intern, Application Operations. Built an org-wide Power BI incident-management dashboard with automated daily refreshes, recognized by the Global CIO."
   3. label "Wells Fargo"; approxYear "~2022-2026"; detail "Senior Software Engineer, Data Engineering (Senior AVP). Led the GenAI Autosys dependency visualizer (Spotlight Award), architected the GCP ELT pipeline migrating 50+ tables, GenAI cohort member running webinars."
   4. label "Texas A&M"; approxYear "~2026-2028 (in progress)"; detail "MS in Management Information Systems, Mays Business School. 4.0 GPA; Advanced Data Management, Advanced Systems Analysis & Design, Project Management; Product@TAMU, Mobile Productivity Leap case challenge."
6. THE Journey_Chart SHALL render exactly one Plotly.js scatter trace with line shape "hv", drawing sharp right-angle steps that ascend from left to right, with no bar trace, no secondary axis and no legend.
7. THE Journey_Chart SHALL place Journey_Stage k (k = 1 to n, in Content_Config order) at x position k and at a y level higher than that of Journey_Stage k − 1, using evenly spaced positions (1, 2, 3, 4 for the initial entries) rather than a date axis.
8. THE Journey_Chart SHALL hide the tick labels, axis titles and gridlines of both axes, SHALL show no month values, date ranges or date-scaled spacing on the chart, SHALL draw each Journey_Stage as a single point, and SHALL show each approxYear exactly as written in the Content_Config inside that Journey_Stage's Journey_Tooltip.
9. FOR ALL Journey_Stage arrays of length n ≥ 1, the trace data generated for the Journey_Chart SHALL contain exactly n points whose x values are 1 to n in order, whose y values are strictly increasing, and whose label and tooltip texts equal the corresponding Journey_Stage label, approxYear and detail values (mapping property).
10. IF the Journey_Stage array in `/src/data/journey.ts` is empty, or any Journey_Stage has a label, approxYear or detail value that is empty or contains only whitespace, THEN THE SYSTEM SHALL fail the build with a non-zero exit status and an error identifying the empty array or the offending Journey_Stage, and SHALL NOT deploy that build.
11. THE Journey_Chart SHALL display, above or beside each marker, a visible text label set in JetBrains Mono showing that Journey_Stage's label value (initially Undergraduate · Kimberly-Clark · Wells Fargo · Texas A&M), with every label shown in full, overlapping no other label or marker, and meeting the contrast ratios in Requirement 28 criterion 1 against the active Theme's section background, at viewport widths from 320 px to 1920 px and after the Theme changes without a page reload.
12. THE Journey_Chart SHALL render each marker with a diameter of at least 16 CSS px and a pointer and touch hit area of at least 44 × 44 CSS px.
13. THE Journey_Chart SHALL render the step line in cyan-to-violet, every marker except the last in cyan, and the last Journey_Stage marker (Texas A&M) as a distinct "current" marker in maroon/violet, on a transparent plot background that shows the active Theme's section background (#0A0E1A in the dark Theme).
14. WHILE Reduced_Motion_Mode is off, THE Journey_Chart SHALL animate a subtle pulse on the current marker, expanding a ring to no more than 1.5 times the marker diameter while fading it out, repeating at an interval between 2 and 3 seconds.
15. WHILE Reduced_Motion_Mode is on, THE Journey_Chart SHALL render the current marker with its maroon/violet styling and no pulse, including when Reduced_Motion_Mode turns on after the chart has rendered.
16. WHILE Reduced_Motion_Mode is off, WHEN the Journey_Chart first renders during a page load, THE Journey_Chart SHALL play an entrance animation that draws the step line from left to right and completes within 1200 ms, once per page load.
17. WHEN a Journey_Tooltip opens in response to hover, tap, keyboard focus, Enter or Space on its marker, THE Journey_Chart SHALL, within 200 ms of that input, display a glassmorphism card with a fill opacity below 100% and a non-zero backdrop blur, showing the Journey_Stage label as its title, the approxYear text and the full detail text with no truncation, positioned entirely within the visible viewport at viewport widths of 320 px and above, with all tooltip text meeting the contrast ratios in Requirement 28 criterion 1, and SHALL close any other open Journey_Tooltip so that at most one is open at a time.
18. THE Journey_Chart SHALL expose each marker as a keyboard-focusable control, reached by Tab and Shift+Tab in Journey_Stage order, with an accessible name containing the Journey_Stage label and approxYear.
19. WHEN a marker receives keyboard focus, or a Visitor presses Enter or Space on a focused marker, THE Journey_Chart SHALL open that marker's Journey_Tooltip.
20. WHEN a Journey_Tooltip is open and the Visitor presses Escape, taps or clicks outside the Journey_Tooltip and its marker, moves keyboard focus off the marker, or moves a fine pointer off the marker, THE Journey_Chart SHALL close the Journey_Tooltip, keeping keyboard focus on the marker when Escape is pressed.
21. WHEN a Visitor taps, on a touch device, a marker whose Journey_Tooltip is already open, THE Journey_Chart SHALL close that Journey_Tooltip.
22. THE Journey_Chart SHALL provide a text alternative, programmatically associated with the chart and reachable by screen readers without pointer interaction, that lists every Journey_Stage in order with its label, approxYear and detail.
23. WHEN the Journey_Chart container first comes within 200 px of the viewport during a page view, THE SYSTEM SHALL request the Plotly_Bundle unless the Live_Chart_Demo has already requested it, with the Plotly_Bundle excluded from the Initial_Page_Weight and requested at most once per page view.
24. WHILE the Plotly_Bundle is loading, THE Journey_Chart SHALL display a placeholder with a loading indicator at the same width and height the chart renders at for the current viewport width, so that replacing the placeholder with the chart moves no surrounding content.
25. IF the Plotly_Bundle fails to load, fails to initialize, or has not finished loading within 15 seconds of the request, THEN THE Journey_Chart SHALL replace the placeholder with a static, accessible ordered list of all Journey_Stages showing each label, approxYear and detail, while all other sections remain functional.

### Requirement 20: Built with AI — How This Site Was Made

**User Story:** As an engineer, I want to see how the Owner built and deployed this site with AI, so that I can evaluate how she uses AI tools in engineering work.

#### Acceptance Criteria

1. THE Built_With_AI_Section SHALL display a step-by-step timeline of exactly these seven steps in this order: Idea → Requirements (spec-driven in Kiro) → Design → Task execution → Review and refinement → CI/CD to GitHub Pages → Live.
2. THE Built_With_AI_Section SHALL display, for each timeline step, three labeled entries: what the AI did, what the Owner decided or reviewed, and what the Owner learned.
3. THE Built_With_AI_Section SHALL display Owner-supplied artifacts from the Content_Config, each with a caption naming the artifact: excerpts of requirements.md and tasks.md, a prompt example, a Kiro workflow screenshot, and a GitHub Actions run screenshot.
4. WHERE an artifact or a per-step entry has not yet been supplied in the Content_Config, THE Built_With_AI_Section SHALL render a Placeholder_Asset in its position.
5. THE Built_With_AI_Section SHALL display a "What AI did well / where I had to step in" reflection with two labeled parts, "What AI did well" and "Where I had to step in", that together name each of these topics at least once: debugging, accessibility checks, performance tuning, and keeping design consistent.
6. THE Built_With_AI_Section SHALL display, above the timeline, an introductory statement that the AI work was guided by specs and that the Owner reviewed and verified the AI output.
7. THE Built_With_AI_Section SHALL render text excerpts of requirements.md and tasks.md in JetBrains Mono with code formatting, preserving the source line breaks and indentation.
8. WHEN a timeline step scrolls into the viewport and Reduced_Motion_Mode is off, THE Built_With_AI_Section SHALL animate that step into view; WHILE Reduced_Motion_Mode is on, THE Built_With_AI_Section SHALL display every step in its final state with no animation.
9. WHEN a Visitor activates the Kiro workflow screenshot or the GitHub Actions run screenshot, THE Built_With_AI_Section SHALL display the screenshot enlarged with its caption, trap keyboard focus inside the enlarged view, close it on Escape or on a close button, and return focus to the activated screenshot.
10. WHILE the viewport is a Mobile_Viewport, THE Built_With_AI_Section SHALL scroll the requirements.md and tasks.md excerpts horizontally within their own blocks so that the page itself does not scroll horizontally.

### Requirement 21: Contact

**User Story:** As a recruiter, I want a simple way to contact the Owner, so that I can start a conversation.

#### Acceptance Criteria

1. THE Contact section SHALL display the headline "Got messy data? Let's make it useful."
2. THE Contact_Form SHALL collect name (required, 1 to 100 characters), email address (required, 1 to 254 characters) and message (required, 1 to 5,000 characters), each with a visible label, and SHALL prevent entry beyond each field's maximum length.
3. IF the Visitor submits the Contact_Form with a required field that is empty or contains only whitespace, or with an email address that does not contain exactly one "@" with at least one non-whitespace character before it and a domain containing at least one "." after it, THEN THE Contact_Form SHALL block submission, display an inline error next to each invalid field, announce each error to assistive technologies, and move keyboard focus to the first invalid field.
4. WHEN the Visitor corrects a field that has an inline error so that it passes validation, THE Contact_Form SHALL remove that field's inline error.
5. WHEN the Visitor submits a valid Contact_Form, THE Contact_Form SHALL send exactly one submission to the Form_Provider, disable the submit button, show a visible sending indicator, and ignore further submit actions until a response is received or the request times out.
6. WHEN the Form_Provider confirms receipt, THE Contact_Form SHALL clear all fields, re-enable the submit button, and display a success message announced to assistive technologies, accompanied by a success animation of at most 2 seconds, or by no animation while Reduced_Motion_Mode is on.
7. IF the Form_Provider returns an error, the request fails, or no response is received within 15 seconds, THEN THE Contact_Form SHALL keep the Visitor's input, re-enable the submit button, display an error message announced to assistive technologies, and offer a mailto link to the Owner's email as a fallback.
8. IF no Web3Forms access key is present in the Content_Config or build-time environment configuration, THEN THE Contact section SHALL display the mailto link to the Owner's email in place of the Contact_Form, and THE SYSTEM SHALL make no network request to the Form_Provider.
9. THE Contact section SHALL display links to email (mailto:Aishvarya.ramesh@tamu.edu), LinkedIn (https://www.linkedin.com/in/aishvarya-ramesh), GitHub (https://github.com/AishvaryaRamesh08) and the resume PDF, with the LinkedIn, GitHub and resume PDF links opening in a new browser tab, and SHALL show a Placeholder_Asset for any link the Owner has not yet supplied.
10. THE SYSTEM SHALL omit the Owner's phone number from all page content, metadata and structured data.
11. THE SYSTEM SHALL read the Web3Forms access key and contact links from the Content_Config or build-time environment configuration, so changing them requires no edits to component source code.
12. THE SYSTEM SHALL treat the Web3Forms access key as a public client-side value that is included in the build output, since Web3Forms access keys are public by design, and SHALL NOT treat it as a secret or require it to be stored as a GitHub Actions secret.
13. THE Contact_Form SHALL include a Honeypot_Field that is hidden from sighted Visitors, hidden from assistive technologies, excluded from the Tab order and excluded from browser autofill.
14. IF a Visitor submits a valid Contact_Form whose Honeypot_Field is non-empty, THEN THE Contact_Form SHALL send no request to the Form_Provider, silently drop the submission, and display the same success state defined in criterion 6.

### Requirement 22: Footer

**User Story:** As a Visitor, I want a minimal footer, so that I can find social links and return to the top.

#### Acceptance Criteria

1. THE SYSTEM SHALL render a footer as the last element of the page containing, in a single block, a copyright notice in the form "© <current year> Aishvarya Ramesh", the text "Built with Kiro", social icon links, and a back-to-top control.
2. THE SYSTEM SHALL render one social icon link for each of LinkedIn and GitHub in the footer, read from the same Content_Config contact links used by the Contact section, each with an accessible name naming the destination (for example "LinkedIn profile") and each opening the destination URL in a new browser tab.
3. IF a social link URL is absent from the Content_Config, THEN THE SYSTEM SHALL render that icon as a Placeholder_Asset link and SHALL NOT render an icon pointing to an empty or "#" URL.
4. THE SYSTEM SHALL render the back-to-top control as a native button with an accessible name indicating "Back to top", operable by mouse, touch, and the Enter and Space keys.
5. WHEN a Visitor activates the back-to-top control, THE SYSTEM SHALL smooth-scroll to the Hook_Screen so that the top edge of the Hook_Screen aligns with the top edge of the viewport, and move keyboard focus to the first focusable element at the top of the page.
6. WHILE Reduced_Motion_Mode is on, WHEN a Visitor activates the back-to-top control, THE SYSTEM SHALL jump to the Hook_Screen without smooth scrolling and move keyboard focus to the first focusable element at the top of the page.

### Requirement 23: Interactive and Delight Features

**User Story:** As a Visitor, I want small, purposeful interactive touches, so that exploring the site feels engaging.

#### Acceptance Criteria

1. WHILE the viewport is a Desktop_Viewport and Reduced_Motion_Mode is off, THE SYSTEM SHALL render a custom glowing cursor trail that follows the pointer, with each trail segment fully faded within 500 ms after the pointer moves past it.
2. WHILE the viewport is not a Desktop_Viewport, the primary pointer is coarse or touch, or Reduced_Motion_Mode is on, THE SYSTEM SHALL render the default system cursor with no trail.
3. WHILE the cursor trail is rendered, THE SYSTEM SHALL keep the system cursor visible at the actual pointer position and SHALL pass all clicks, hovers and text selection through the trail to the elements beneath it.
4. WHILE Reduced_Motion_Mode is off, WHEN a section content element first enters the viewport by at least 15% of its height, THE SYSTEM SHALL play its scroll-triggered reveal once per page load, complete it within 800 ms, and limit any parallax displacement of that element to at most 40 px from its resting position.
5. WHILE the viewport is a Desktop_Viewport and Reduced_Motion_Mode is off, WHEN the pointer comes within 60 px of a primary button's edge, THE SYSTEM SHALL move the button toward the pointer by at most 8 px and SHALL return it to its resting position within 300 ms after the pointer leaves that 60 px zone.
6. IF scroll-triggered reveals are disabled by Reduced_Motion_Mode or fail to initialize, THEN THE SYSTEM SHALL display all section content at full opacity in its final position and keep it operable by pointer and keyboard.
7. IF a section content element whose reveal has not yet played receives keyboard focus, THEN THE SYSTEM SHALL show that element at full opacity in its final position immediately.
8. WHEN Reduced_Motion_Mode changes during a session, THE SYSTEM SHALL apply the cursor, reveal, parallax and magnetic behavior for the new state within 1 s, without a page reload.

### Requirement 24: Terminal Widget

**User Story:** As an engineer, I want a terminal widget, so that I can explore the Owner's profile the way I use my own tools.

#### Acceptance Criteria

1. THE Terminal_Widget SHALL accept typed commands in a single-line text input with a visible label, styled in JetBrains Mono, and SHALL submit the entered text when the Visitor presses Enter.
2. WHEN a Visitor submits `whoami`, `skills`, `projects`, `certs` or `contact`, THE Terminal_Widget SHALL append the submitted command after a prompt symbol, followed by that command's response generated from the Content_Config, to an output history that retains the 50 most recent command entries and removes the oldest entry first.
3. WHEN a Visitor submits a supported command, THE Terminal_Widget SHALL print the following: for `whoami`, the Owner's name and role; for `skills`, every skill cluster with its skills; for `projects`, the title of every Case_Study; for `certs`, the name of every Certification_Card; and for `contact`, the email, LinkedIn, GitHub and resume PDF links.
4. IF a Visitor submits an unrecognized command, THEN THE Terminal_Widget SHALL print a message that names the trimmed command as entered and lists all supported commands (`whoami`, `skills`, `projects`, `certs`, `contact`, `help`, `clear`), and SHALL leave earlier output unchanged.
5. FOR ALL input strings, THE Terminal_Widget SHALL produce the same output for the string as for the string converted to lowercase with leading and trailing whitespace removed (normalization property).
6. WHEN the Terminal_Widget prints a command response, THE Terminal_Widget SHALL announce only that new response to assistive technologies through a polite live region, without announcing earlier output again.
7. THE Terminal_Widget SHALL omit the Owner's phone number from the output of every command.
8. IF a Visitor submits empty or whitespace-only input, THEN THE Terminal_Widget SHALL add no entry to the output history and SHALL keep keyboard focus in the input.
9. WHEN a Visitor submits `help`, THE Terminal_Widget SHALL print every supported command, each with a one-line description.
10. WHEN a Visitor submits `clear`, THE Terminal_Widget SHALL remove all entries from the output history and SHALL clear and keep keyboard focus in the input.
11. THE SYSTEM SHALL render the Terminal_Widget only inside the Terminal_Band, a section band with a visible heading read from the Content_Config, placed between the Certifications section and the Journey_Chart (Requirement 3), with no floating launcher button or other Terminal_Widget instance elsewhere on the page.

### Requirement 25: Analytics

**User Story:** As the Owner, I want privacy-friendly analytics, so that I can see visits without tracking visitors.

#### Acceptance Criteria

1. THE SYSTEM SHALL use GoatCounter as its only analytics provider, loading exactly one analytics script (the GoatCounter script) configured with a GoatCounter site code read from the Content_Config or build-time environment configuration.
2. THE SYSTEM SHALL request the analytics script only after the Hook_Screen has first rendered, load it without blocking rendering, and exclude it from the Initial_Page_Weight.
3. THE SYSTEM SHALL set no cookies, write no analytics data to browser storage, and display no cookie-consent banner.
4. THE SYSTEM SHALL send GoatCounter page-view data only, and SHALL NOT send Contact_Form field values or Terminal_Widget input.
5. IF the analytics script is blocked (for example, by an ad blocker) or fails to load, THEN THE SYSTEM SHALL render and operate all sections unchanged, show no error to the Visitor, throw no uncaught console errors, and not retry the request during that page load.
6. IF no GoatCounter site code is present in the Content_Config or build-time environment configuration, THEN THE SYSTEM SHALL include no analytics code in the build output, make no network request to GoatCounter, and render and operate all sections unchanged.

### Requirement 26: Motion and Reduced-Motion Behavior

**User Story:** As a Visitor sensitive to motion, I want the site to respect my reduced-motion preference, so that I can browse comfortably.

#### Acceptance Criteria

1. WHILE Reduced_Motion_Mode is on, THE SYSTEM SHALL disable auto-animations, typed effects, parallax, particle flows, Data_Packet movement, SQL_Ticker scrolling, cursor trail, magnetic effects, count-up animations and scroll-driven morphs, and SHALL render each affected element in its final state (full text, final numeric value, final position and full intended opacity) so that no content or control stays hidden behind an animation that does not run.
2. WHILE Reduced_Motion_Mode is on, THE SYSTEM SHALL replace every remaining transition that translates, scales or rotates an element with either an instant change or an opacity crossfade of 300 ms or less, unless a section requirement specifies a different reduced-motion behavior for that element.
3. WHILE Reduced_Motion_Mode is on, THE SYSTEM SHALL perform in-page anchor navigation as an instant jump to the target section instead of an animated smooth scroll.
4. WHEN the Visitor's reduced-motion preference changes while the page is open, THE SYSTEM SHALL apply the new preference within 1 second without a page reload, SHALL preserve the current scroll position, active Theme and any text entered in the Contact_Form, and SHALL not hide already-visible content in order to replay entrance animations.
5. WHEN Reduced_Motion_Mode turns on while an animation is in progress, THE SYSTEM SHALL stop that animation and display its final state within 1 second.
6. THE SYSTEM SHALL ensure that no animation, Theme switch or visual effect, whether or not Reduced_Motion_Mode is on, produces more than 3 flashes in any 1-second period, as measured against the WCAG 2.2 Success Criterion 2.3.1 general flash and red flash thresholds.

### Requirement 27: Responsive Layout

**User Story:** As a Visitor on any device, I want the layout to adapt to my screen, so that every section is readable and usable.

#### Acceptance Criteria

1. THE SYSTEM SHALL render every section at viewport widths of 360, 768, 1280 and 1920 px, and at every width between 360 and 1920 px, with a page scroll width no greater than the viewport width and with no text or interactive control clipped or overlapped by another element.
2. WHILE the viewport is a Mobile_Viewport, THE SYSTEM SHALL give every interactive control (buttons, links, form fields, Viz_Stage_Tabs tabs, Journey_Chart markers, menu toggles) a hit area of at least 44 × 44 CSS px, except links that sit inline within a sentence of body text.
3. WHILE the viewport is a Mobile_Viewport or the primary pointer is coarse, THE SYSTEM SHALL reveal any content or action that a hover reveals on a Desktop_Viewport with a single tap, and SHALL dismiss it on a second tap on the same element or a tap outside it.
4. WHILE the viewport is a Mobile_Viewport, IF the natural width of the Pipeline_Diagram, a Case_Study architecture diagram, the Dependency_Demo, the Live_Chart_Demo or the Journey_Chart is greater than the viewport width, THEN THE SYSTEM SHALL either scale that element to fit its container width or keep horizontal scrolling inside that element's own container, without making the page scroll horizontally.
5. WHEN the Visitor sets browser zoom to 200% on a 1280 px wide viewport, THE SYSTEM SHALL reflow content so that criterion 1 still holds and every navigation destination stays reachable through the Navbar or the Mobile_Menu.
6. WHEN the device orientation changes between portrait and landscape, THE SYSTEM SHALL complete the re-layout within 500 ms so that criterion 1 holds at the new width, keep the section that was at the top of the viewport before rotation in view, and keep any values already entered in the Contact_Form.

### Requirement 28: Accessibility

**User Story:** As a Visitor using assistive technology or a keyboard, I want the site to be fully accessible, so that I can access all content and interactions.

#### Acceptance Criteria

1. THE SYSTEM SHALL render, in both Themes, normal text at a contrast ratio of at least 4.5:1 and large text (at least 24 CSS px, or at least 18.66 CSS px bold) at a contrast ratio of at least 3:1 against its adjacent background, including where the Background_Layer sits behind the text.
2. THE SYSTEM SHALL render, in both Themes, the boundaries and state indicators of interactive elements at a contrast ratio of at least 3:1 against adjacent colors.
3. THE SYSTEM SHALL make every interactive element reachable with Tab and Shift+Tab in an order that matches the visual reading order, and operable with Enter (links) or Enter and Space (buttons and other controls).
4. THE SYSTEM SHALL not trap keyboard focus in any element, except that the Mobile_Menu, Case_Study modals, the enlarged Analysis_Section artifact view and the enlarged Built_With_AI_Section screenshot view trap focus while open and release it on close, as defined in Requirements 7, 12, 16 and 20.
5. WHEN an interactive element receives keyboard focus, THE SYSTEM SHALL display a focus indicator at least 2 CSS px thick with a contrast ratio of at least 3:1 against adjacent colors in both Themes, and the sticky Navbar SHALL not fully cover the focused element.
6. THE SYSTEM SHALL provide a "Skip to content" link as the first focusable element, hidden until it receives keyboard focus and visible while focused.
7. WHEN a Visitor activates the "Skip to content" link, THE SYSTEM SHALL move keyboard focus to the main content region.
8. THE SYSTEM SHALL give every informative image a non-empty text alternative describing its content, give every Placeholder_Asset image a text alternative that names the expected asset, and hide decorative images, the Hook_Arrow and the entire Background_Layer (including Data_Packets, the SQL_Ticker and the Neural_Layer) from assistive technologies.
9. THE SYSTEM SHALL use exactly one header, one nav for the Navbar, one main and one footer landmark, render each content section as a section element labeled by its heading (the Hook_Screen labeled by its headline text), contain exactly one h1, which is the Owner's name on the Intro_Screen (Requirement 9), render the Hook_Screen headline as styled text rather than a heading element (Requirement 8), and never skip a heading level when descending (for example, h2 followed directly by h4).
10. THE SYSTEM SHALL declare the page language as English on the root html element and set a non-empty document title.
11. THE SYSTEM SHALL provide, for every chart, diagram and interactive visualization (including the Live_Chart_Demo, Journey_Chart, Pipeline_Diagram, Dependency_Demo, Skill_Constellation and Case_Study architecture diagrams), a text alternative programmatically associated with it that conveys the same data points, stages or relationships shown visually.
12. WHEN the Deploy_Workflow runs, THE Deploy_Workflow SHALL run an automated axe accessibility scan of the built site at a Mobile_Viewport and a Desktop_Viewport in both Themes, and treat any reported violation of WCAG 2.1 Level A or AA rules as a failed check under Requirement 2.

### Requirement 29: SEO and Sharing

**User Story:** As the Owner, I want the site to be discoverable and to preview well when shared, so that recruiters find and click it.

#### Acceptance Criteria

1. THE SYSTEM SHALL include in the document head a page title of 1 to 60 characters that contains the Owner's name and a meta description of 50 to 160 characters, with both values taken from the Content_Config.
2. THE SYSTEM SHALL include a canonical link, Open Graph meta tags (og:title, og:description, og:type, og:url, og:image, og:image:alt) and Twitter card meta tags with card type summary_large_image, and the canonical URL, og:url and og:image values SHALL be absolute URLs made of the Site_Origin followed by the Base_Path (by default, a canonical URL and og:url of https://aishvaryaramesh08.github.io/), following any Site_Origin or Base_Path override supplied at build time (Requirement 2).
3. THE SYSTEM SHALL serve the Open Graph image from a file in the repository in PNG or JPEG format, exactly 1200 × 630 px in size and no larger than 1 MB.
4. THE SYSTEM SHALL publish a sitemap.xml at the site root under the Base_Path that is valid against the sitemaps.org protocol and lists the canonical URL (by default, https://aishvaryaramesh08.github.io/) as an absolute URL.
5. THE SYSTEM SHALL publish a robots.txt at the site root under the Base_Path that allows crawling of all paths under the Base_Path and references the sitemap.xml by its absolute URL.
6. THE SYSTEM SHALL include exactly one JSON-LD script block that parses as valid JSON and declares a schema.org Person with name, jobTitle, alumniOf and sameAs entries holding the LinkedIn and GitHub URLs from the Content_Config, and that block SHALL contain no telephone property and no phone number.
7. THE SYSTEM SHALL render the Hook_Screen and Intro_Screen text as HTML text elements (not images, canvas or SVG paths), with the Hook_Screen headline as non-heading text and the Owner's name on the Intro_Screen as the page's h1, and that text SHALL appear at full opacity without waiting for an animation to start or finish when Reduced_Motion_Mode is active or the animation scripts do not run.

### Requirement 30: Performance

**User Story:** As a Visitor on a mobile connection, I want the site to load fast, so that I see the Owner's value without waiting.

#### Acceptance Criteria

1. THE SYSTEM SHALL keep the Initial_Page_Weight under 3 MB (3,000,000 bytes), measured as compressed bytes transferred when the production build is loaded on a Mobile_Viewport with an empty browser cache.
2. THE SYSTEM SHALL code-split section components and lazy-load D3, the Plotly_Bundle, Three.js and every image outside the initial viewport so that none of their bytes count toward the Initial_Page_Weight, and SHALL start loading each lazy item when it comes within the distance set by its section requirement (200 px for the Dependency_Demo, the Live_Chart_Demo and the Journey_Chart) or, where no distance is set, within one viewport height of the visible viewport.
3. THE SYSTEM SHALL serve every raster image except the favicon and the Open Graph image, Placeholder_Assets included, in WebP or AVIF format with explicit width and height attributes whose ratio matches the image's intrinsic aspect ratio.
4. THE SYSTEM SHALL achieve a Largest Contentful Paint under 2.5 s, measured as the median of 3 Lighthouse runs with default mobile settings against the production build's Hook_Screen URL.
5. THE SYSTEM SHALL achieve Lighthouse scores of 90 or higher for each of Performance, Accessibility, Best Practices and SEO, using the median of the same 3-run measurement as criterion 4.
6. IF a production build in the Deploy_Workflow exceeds the Initial_Page_Weight budget, THEN THE SYSTEM SHALL fail the build check, block deployment to GitHub Pages and report the total Initial_Page_Weight along with the file names and compressed sizes of the 5 largest initial assets.
7. THE SYSTEM SHALL achieve a Cumulative Layout Shift of 0.1 or lower, using the median of the same 3-run measurement as criterion 4.
8. IF any metric in criteria 4, 5 or 7 misses its threshold in the Deploy_Workflow's Lighthouse check, THEN THE SYSTEM SHALL fail the build check, block deployment to GitHub Pages and report each failing metric with its measured value and threshold.
9. IF a lazy-loaded section component or library fails to load, THEN THE SYSTEM SHALL show an error message in that section's place indicating the content could not be loaded, plus a retry control, and all other sections SHALL stay rendered and interactive.
10. THE SYSTEM SHALL load the Plotly_Bundle, shared by the Live_Chart_Demo and the Journey_Chart, at most once per page view, so that whichever of the two first requests the Plotly_Bundle triggers the only network request for it and the other reuses the loaded Plotly_Bundle.

### Requirement 31: Content Integrity and Tone

**User Story:** As the Owner, I want the site content to be accurate and on-tone, so that it reflects me honestly and protects confidential employer information.

#### Acceptance Criteria

1. THE SYSTEM SHALL display only metrics, numeric values, job titles, role names and award names that appear in the Owner's resume, with each number shown at the same value and each title or award name worded as in the resume (no rounding up, inflation or rewording).
2. IF a metric, role or award referenced by a section has not been supplied in Content_Config, THEN THE SYSTEM SHALL display a Placeholder_Asset in its place instead of an estimated or invented value.
3. THE SYSTEM SHALL use only fictional names for every system, job, table, server, team and dataset shown in the Dependency_Demo, the Pipeline_Diagram, Case_Study architecture diagrams and any other demo or diagram that depicts an employer system.
4. IF, when the System is built locally or by the Deploy_Workflow, the Owner-maintained Denylist of real employer internal system names is unavailable or empty, or any Denylist term appears (case-insensitive, whole-word match) in Content_Config, bundled demo datasets or the build output, THEN THE SYSTEM SHALL fail the build, produce no deployable output, and report the file and line of each match without printing the matched term.
5. THE SYSTEM SHALL keep the Denylist contents out of the public source repository and the deployed build output.
6. THE SYSTEM SHALL publish only copy that the Owner has approved in a pre-release tone review as confident, curious and direct, with no hyperbole (such as superlatives like "best-ever" or "world-class") and no buzzword stuffing; tone is verified by Owner review, not by automated checks.
7. THE SYSTEM SHALL present the four emphasis areas in this priority: data engineering, data analysis and visualization, business and systems analysis and design, AI-assisted development, wherever two or more of these areas are listed, summarized or ordered as sections on the site.

### Requirement 32: Code Structure and Documentation

**User Story:** As the Owner, I want a clean codebase and clear documentation, so that I can maintain and redeploy the site myself.

#### Acceptance Criteria

1. THE SYSTEM SHALL organize source code into separate directories for section components, shared UI components and hooks, and SHALL place every Content_Config file under `/src/data/`.
2. THE SYSTEM SHALL source all Owner-editable copy, links and asset references rendered by section components from the Content_Config, with no such content hard-coded in component files.
3. THE SYSTEM SHALL include a README with one distinct heading for each of the following topics: (a) local setup, covering prerequisites, install, local development, build and test commands; (b) the Content_Config, listing each `/src/data/*.ts` file, what content it controls and how to edit it; (c) Owner-supplied assets, covering where to place them and how to replace each Placeholder_Asset; (d) the Base_Path setting, covering where it is configured and how to change it; (e) deployment to GitHub Pages via the Deploy_Workflow; (f) alternate deployment to Cloudflare Pages or Netlify, covering the build command, output directory and required Base_Path value.
4. THE SYSTEM SHALL provide a single documented command that runs TypeScript type checking, linting, and the complete unit and property-based test suites once (not in watch mode) and exits with a non-zero status if any check fails.
5. WHEN the Deploy_Workflow runs, THE SYSTEM SHALL execute TypeScript type checking, linting, and the complete unit and property-based test suites before building and deploying the site.
6. IF TypeScript type checking, linting or any unit or property-based test fails during the Deploy_Workflow, THEN THE SYSTEM SHALL mark the workflow run as failed, skip the deploy step, and leave the previously deployed site unchanged.

## Out of Scope

The following are explicitly excluded:

- Backend services
- User accounts
- Blog CMS
- Paid APIs
- An "Ask my portfolio" chatbot (it would need a paid or rate-limited API)
- Running Plotly Dash apps on the site (Dash needs a Python server; a separately hosted Dash demo may be linked only)
- Konami code data-rain easter egg (deferred to phase 2)
