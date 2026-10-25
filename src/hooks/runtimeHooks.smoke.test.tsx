// Smoke tests for the motion store and shared runtime hooks (full unit tests: task 5.5).
import { render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MotionProvider } from "./MotionProvider";
import { useMotionMode } from "./motionStore";
import { useDocumentVisible } from "./useDocumentVisible";
import { useGsapContext } from "./useGsapContext";
import { useInViewOnce } from "./useInViewOnce";
import { useMediaQuery } from "./useMediaQuery";
import { useScrollFrame } from "./useScrollFrame";

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useMotionMode();
  const mobile = useMediaQuery("(max-width: 767px)");
  const visible = useDocumentVisible();
  const inView = useInViewOnce(ref, { amount: 0.5 });
  useScrollFrame(() => {});
  useGsapContext(() => {}, [], ref);
  return (
    <div ref={ref} data-testid="probe">
      {`${mode}|${String(mobile)}|${String(visible)}|${String(inView)}`}
    </div>
  );
}

const app = (
  <MotionProvider>
    <Probe />
  </MotionProvider>
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runtime hooks", () => {
  it("prerender with renderToString uses server snapshots and full motion", () => {
    expect(renderToString(app)).toContain("full|false|true|false");
  });

  it("reflects a reduced-motion preference on the client and mirrors it to html[data-motion]", async () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string): MediaQueryList =>
        ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    render(app);
    // jsdom has no IntersectionObserver, so useInViewOnce latches true via its fallback.
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("reduced|false|true|true"));
    expect(document.documentElement.dataset.motion).toBe("reduced");
  });
});
