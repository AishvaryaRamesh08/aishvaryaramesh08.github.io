import { describe, expect, it } from "vitest";
import { dependencyDemo } from "../data/dependencyDemo";
import type { DependencyEdge } from "../data/types";
import { dependencyReducer, downstream, initialDependencyState } from "./graph";

const e = (from: string, to: string): DependencyEdge => ({ from, to });

describe("downstream", () => {
  it("returns every transitively reachable job except the failed one", () => {
    const edges = [e("a", "b"), e("b", "c"), e("a", "d"), e("x", "a")];
    expect([...downstream(edges, "a")].sort()).toEqual(["b", "c", "d"]);
  });

  it("terminates on cycles and self-loops and never includes the failed job", () => {
    const edges = [e("a", "a"), e("a", "b"), e("b", "c"), e("c", "a")];
    expect([...downstream(edges, "a")].sort()).toEqual(["b", "c"]);
  });

  it("is empty for a sink (Req 13.7)", () => {
    expect(downstream(dependencyDemo.edges, "export_finance_feed").size).toBe(0);
  });

  it("follows the demo content downstream", () => {
    expect([...downstream(dependencyDemo.edges, "dedupe_customers")].sort()).toEqual([
      "build_customer_dim",
      "build_order_facts",
      "export_finance_feed",
      "publish_sales_mart",
      "refresh_kpi_dashboard",
    ]);
  });
});

describe("dependencyReducer", () => {
  const edges = [e("a", "b"), e("b", "c"), e("d", "c")];

  it("activating a job fails it and highlights its downstream jobs", () => {
    const s = dependencyReducer(initialDependencyState(edges), { type: "activate", node: "a" });
    expect(s.failed).toBe("a");
    expect([...s.highlighted].sort()).toEqual(["b", "c"]);
  });

  it("activating another job replaces the previous failure", () => {
    let s = dependencyReducer(initialDependencyState(edges), { type: "activate", node: "a" });
    s = dependencyReducer(s, { type: "activate", node: "d" });
    expect(s.failed).toBe("d");
    expect([...s.highlighted]).toEqual(["c"]);
  });

  it("activating the failed job or reset clears everything", () => {
    const failed = dependencyReducer(initialDependencyState(edges), { type: "activate", node: "a" });
    for (const next of [
      dependencyReducer(failed, { type: "activate", node: "a" }),
      dependencyReducer(failed, { type: "reset" }),
    ]) {
      expect(next.failed).toBeNull();
      expect(next.highlighted.size).toBe(0);
      expect(next.edges).toBe(edges);
    }
  });
});
