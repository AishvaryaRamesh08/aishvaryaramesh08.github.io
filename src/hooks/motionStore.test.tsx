// Unit tests: the reduced-motion store follows a live OS preference change without a reload
// (Req 6.14, 26.4), mirroring it to html[data-motion] and leaving Theme, scroll and form input alone.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A matchMedia mock whose reduced-motion query can be flipped and dispatches `change`. */
function createMotionMediaMock(initiallyReduced: boolean) {
  let reduced = initiallyReduced;
  const lists: (EventTarget & { media: string; matches: boolean })[] = [];
  const matchMedia = vi.fn((query: string) => {
    // `matches` must stay a live getter (Object.assign would copy a snapshot of its value).
    const list = Object.defineProperties(new EventTarget(), {
      media: { value: query },
      matches: { get: () => query === "(prefers-reduced-motion: reduce)" && reduced },
    }) as EventTarget & { media: string; matches: boolean };
    lists.push(list);
    return list as unknown as MediaQueryList;
  });
  return {
    matchMedia,
    /** Changes the OS preference and fires `change` on every live MediaQueryList, like a browser. */
    setReduced(next: boolean) {
      reduced = next;
      for (const list of lists) {
        if (list.media === "(prefers-reduced-motion: reduce)") list.dispatchEvent(new Event("change"));
      }
    },
  };
}

/** Fresh store modules per test: the stores keep module-level state. */
async function loadMotionStore() {
  return import("./motionStore");
}

const root = document.documentElement;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  root.className = "";
  root.removeAttribute("data-motion");
});

describe("motion store", () => {
  it("switches useMotionMode and html[data-motion] live, preserving Theme, scroll and form input", async () => {
    const media = createMotionMediaMock(false);
    vi.stubGlobal("matchMedia", media.matchMedia);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    root.classList.add("light");
    const { useMotionMode } = await loadMotionStore();

    function Probe() {
      const mode = useMotionMode();
      return (
        <>
          <p data-testid="mode">{mode}</p>
          <label>
            Message
            <textarea />
          </label>
        </>
      );
    }
    render(<Probe />);
    expect(screen.getByTestId("mode")).toHaveTextContent("full");
    expect(root.dataset.motion).toBe("full");

    const field = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(field, "draft");

    act(() => media.setReduced(true));
    expect(screen.getByTestId("mode")).toHaveTextContent("reduced");
    expect(root.dataset.motion).toBe("reduced");

    act(() => media.setReduced(false));
    expect(screen.getByTestId("mode")).toHaveTextContent("full");
    expect(root.dataset.motion).toBe("full");

    expect(screen.getByRole("textbox", { name: "Message" })).toBe(field);
    expect(field).toHaveValue("draft");
    expect(root).toHaveClass("light");
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("notifies non-React subscribers and stops after the last unsubscribe", async () => {
    const media = createMotionMediaMock(true);
    vi.stubGlobal("matchMedia", media.matchMedia);
    const { getMotionMode, subscribeMotionMode } = await loadMotionStore();

    const seen: string[] = [];
    const unsubscribe = subscribeMotionMode(() => seen.push(getMotionMode()));
    // Subscribing syncs the attribute from the current preference.
    expect(getMotionMode()).toBe("reduced");
    expect(root.dataset.motion).toBe("reduced");

    media.setReduced(false);
    media.setReduced(true);
    expect(seen).toEqual(["full", "reduced"]);

    unsubscribe();
    media.setReduced(false);
    expect(seen).toEqual(["full", "reduced"]);
    // The snapshot still reads the live preference after unsubscribing.
    expect(getMotionMode()).toBe("full");
  });

  it('reports "full" when matchMedia is unavailable', async () => {
    vi.stubGlobal("matchMedia", undefined);
    const { getMotionMode } = await loadMotionStore();
    expect(getMotionMode()).toBe("full");
  });
});
