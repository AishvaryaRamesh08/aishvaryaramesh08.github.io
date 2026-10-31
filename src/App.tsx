// App shell (task 6.8, design "Component tree"; Req 3.1, 3.2, 3.3, 28.6, 28.7, 28.9).
// Skip link first, then the header/nav, `main#main` with one SectionShell per section in
// Requirement 3 order, and the footer outside `main`. Render stays deterministic (no Date,
// window or storage access during render) so the prerendered HTML hydrates without a mismatch.
import { Fragment } from "react";
import { BackgroundLayer } from "./background/BackgroundLayer";
import { SectionShell } from "./components/SectionShell";
import { SkipLink } from "./components/SkipLink";
import RawToReady from "./sections/raw-to-ready/RawToReady";
import { MotionProvider } from "./hooks/MotionProvider";
import { ThemeProvider } from "./hooks/ThemeProvider";
import { useHashScroll } from "./hooks/useHashScroll";
import { Footer } from "./layout/Footer";
import { Header } from "./layout/Header";
import { preloadSectionsUpTo, SECTIONS } from "./sections";

/** ID of the main landmark; the Skip link moves focus here (Req 28.7). */
export const MAIN_ID = "main";

export default function App() {
  useHashScroll({ preload: preloadSectionsUpTo });
  return (
    <MotionProvider>
      <ThemeProvider>
        <BackgroundLayer />
        <SkipLink targetId={MAIN_ID} />
        <Header />
        <main id={MAIN_ID} tabIndex={-1} className="outline-none">
          {SECTIONS.map((entry) => {
            if (entry.kind === "eager") {
              return (
                <Fragment key={entry.id}>
                  <SectionShell id={entry.id} layout={entry.layout} headingInBody={entry.headingInBody}>
                    <entry.Component />
                  </SectionShell>
                  {entry.id === "home" ? <RawToReady /> : null}
                </Fragment>
              );
            }
            return <SectionShell key={entry.id} id={entry.id} load={entry.load} layout={entry.layout} />;
          })}
        </main>
        <Footer />
      </ThemeProvider>
    </MotionProvider>
  );
}
