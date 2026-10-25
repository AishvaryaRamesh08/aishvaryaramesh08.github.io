import { act, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { render } from "./entry-server";

vi.mock("./sections/hook/HookPlotlyChart", () => ({ HookPlotlyChart: () => null }));

describe("entry-server render", () => {
  it("prerenders the main landmark as HTML text", () => {
    const html = render();
    expect(html).toMatch(/<main id="main"[ >]/);
  });

  it("produces markup that hydrates on the client without a mismatch", async () => {
    const container = document.createElement("div");
    container.innerHTML = render();
    document.body.appendChild(container);
    const prerenderedMain = container.querySelector("main");

    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(
        container,
        <StrictMode>
          <App />
        </StrictMode>,
        { onRecoverableError },
      );
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    // Hydration reuses the prerendered DOM node instead of replacing it.
    expect(container.querySelector("main")).toBe(prerenderedMain);

    act(() => root?.unmount());
    consoleError.mockRestore();
    container.remove();
  });
});
