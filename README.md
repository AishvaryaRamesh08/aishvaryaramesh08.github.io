# aishvaryaramesh08.github.io

My portfolio: **https://aishvaryaramesh08.github.io/**

Every dot on the page is a record. 6,000 dots draw my name, pack into a database, and then redraw themselves as each section while you scroll: Texas A&M, Wells Fargo, projects, skills, certifications and contact. One swipe moves one section.

## How it is built

- **[`site/index.html`](site/index.html)** is the whole page: HTML, CSS and a canvas script in one file, with no framework. The dots are drawn by sampling text and logo images into a grid of points and easing each point between shapes as you scroll.
- **[`scripts/use-static-site.ts`](scripts/use-static-site.ts)** is the last build step. It copies `site/index.html` over the built home page, so the deploy publishes it.
- **`public/`** holds the files served beside the page: the resume PDF, project screenshots and the favicon.
- The React app under `src/` is the earlier version of the site. It still builds and its tests still run, but it is no longer the page visitors see.

## Editing and publishing

1. Edit `site/index.html`.
2. Run the checks and build: `npm run check && npm run build`.
3. Push to `main`. The GitHub Actions workflow in `.github/workflows/deploy.yml` runs the checks, builds the site and publishes it to GitHub Pages.

Requires Node 24 (see `.nvmrc`).

Designed and built with Claude and Kiro.
