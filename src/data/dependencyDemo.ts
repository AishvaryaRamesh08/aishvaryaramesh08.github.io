/**
 * Dependency_Demo jobs and edges (Req 13). Every name is fictional (Req 31.3). An edge
 * `{ from, to }` means `to` runs after `from`, so a failure flows from → to.
 */
import type { DependencyDemoConfig } from "./types";

export const dependencyDemo = {
  jobs: [
    { id: "ingest_orders", label: "ingest_orders" },
    { id: "ingest_customers", label: "ingest_customers" },
    { id: "ingest_inventory", label: "ingest_inventory" },
    { id: "validate_orders", label: "validate_orders" },
    { id: "validate_customers", label: "validate_customers" },
    { id: "dedupe_customers", label: "dedupe_customers" },
    { id: "build_customer_dim", label: "build_customer_dim" },
    { id: "build_order_facts", label: "build_order_facts" },
    { id: "snapshot_inventory", label: "snapshot_inventory" },
    { id: "publish_sales_mart", label: "publish_sales_mart" },
    { id: "refresh_kpi_dashboard", label: "refresh_kpi_dashboard" },
    { id: "export_finance_feed", label: "export_finance_feed" },
  ],
  edges: [
    { from: "ingest_orders", to: "validate_orders" },
    { from: "ingest_customers", to: "validate_customers" },
    { from: "validate_customers", to: "dedupe_customers" },
    { from: "dedupe_customers", to: "build_customer_dim" },
    { from: "validate_orders", to: "build_order_facts" },
    { from: "build_customer_dim", to: "build_order_facts" },
    { from: "ingest_inventory", to: "snapshot_inventory" },
    { from: "build_order_facts", to: "publish_sales_mart" },
    { from: "snapshot_inventory", to: "publish_sales_mart" },
    { from: "publish_sales_mart", to: "refresh_kpi_dashboard" },
    { from: "publish_sales_mart", to: "export_finance_feed" },
  ],
} satisfies DependencyDemoConfig;
