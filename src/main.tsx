import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

/** Sets `window.__hydrated` once React has committed on the client (read by the head fail-safe). */
function HydrationFlag({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.__hydrated = true;
  }, []);
  return children;
}

const app = (
  <StrictMode>
    <HydrationFlag>
      <App />
    </HydrationFlag>
  </StrictMode>
);

// Production builds ship prerendered markup in #root (scripts/prerender.ts), so we hydrate it.
// `vite dev` serves the unrendered index.html, where an empty #root is client-rendered instead.
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
