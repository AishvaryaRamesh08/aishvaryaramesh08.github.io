// Build-time server entry (design D1). Bundled by `vite build --ssr` into dist-ssr/ and
// called once by scripts/prerender.ts; it never runs in the browser or on a server at runtime.
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

/** Renders the app to the HTML string that goes inside `<div id="root">`. */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
