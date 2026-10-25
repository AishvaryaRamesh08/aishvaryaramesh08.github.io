/**
 * Background_Layer settings (Req 6). Decorative scene elements stay subtle and the SQL ticker
 * sits at 0.06 (Req 6.1, 6.7); the mobile object cap is below the desktop count (Req 6.9).
 */
import type { BackgroundConfig } from "./types";

export const background = {
  seed: 20260418,
  desktopObjectCount: 64,
  mobileObjectCap: 24,
  depthLayers: [
    { speed: 0.1, opacity: 0.04 },
    { speed: 0.2, opacity: 0.05 },
    { speed: 0.35, opacity: 0.06 },
  ],
  packetCount: 10,
  pulseIntervalMs: [3000, 8000],
  neuralNodeCount: 14,
  maxOpacity: 0.08,
  ticker: {
    snippets: [
      "SELECT * FROM raw.orders;",
      "MERGE INTO conformed.customers;",
      "DAG: ingest >> clean >> validate >> load;",
      "vector_index.upsert()",
      "SELECT customer_id, COUNT(*) FROM staging.orders GROUP BY 1 HAVING COUNT(*) > 1;",
      "ALTER TABLE conformed.orders ADD FOREIGN KEY (customer_id);",
      "INSERT INTO sanitized.customers SELECT sha256(email) FROM staging.customers;",
    ],
    opacity: 0.06,
    speedPxPerSec: 18,
  },
} satisfies BackgroundConfig;
