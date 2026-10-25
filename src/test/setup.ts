// Global test setup: jest-dom matchers for Vitest and fast-check defaults.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import fc from "fast-check";
import { afterEach } from "vitest";

// Every property test runs at least 100 iterations (design: Testing Strategy).
fc.configureGlobal({ numRuns: 100 });

afterEach(() => {
  cleanup();
});
