import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { contentValidationPlugin } from "./build/contentValidation.ts";
import { resolveSiteEnv, siteEnvDefines } from "./build/env.ts";
import { seoPlugin } from "./build/seo.ts";
// Further build plugins (denylist, output scan) are added in task 23.7.
export default defineConfig(({ mode }) => {
  // Process env wins over .env files; both are optional (Req 2.4: overrides without source edits).
  const siteEnv = resolveSiteEnv({ ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env });
  return {
    base: siteEnv.basePath,
    define: siteEnvDefines(siteEnv),
    plugins: [
      react(),
      tailwindcss(),
      // Fails the client build on invalid content and defines __RESUME_AVAILABLE__ (Req 4.6, 9.10).
      contentValidationPlugin(),
      seoPlugin({ basePath: siteEnv.basePath }),
    ],
  };
});
