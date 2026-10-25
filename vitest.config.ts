import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { resolveSiteEnv, siteEnvDefines } from "./build/env.ts";

const siteEnv = resolveSiteEnv(process.env);

export default defineConfig({
  base: siteEnv.basePath,
  // Tests see the resume as not yet supplied (the current Content_Config), independent of /public.
  define: { ...siteEnvDefines(siteEnv), __RESUME_AVAILABLE__: "false" },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "build/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
    css: false,
  },
});
