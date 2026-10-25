// Text alternative for a Case_Study architecture diagram (Req 12.8). Property 48 (task 12.5)
// checks that, for any diagram, the generated text names every component shown and states the
// direction of data flow between them. Pure and SSR-safe so the server and client render the
// same `alt`/description text.

/**
 * Builds the architecture diagram's text alternative from its `components` and `flow`.
 *
 * The result always contains:
 *  - every component name in `components`, in order (Req 12.8 — "names every component shown"); and
 *  - the `flow` text describing the direction of data flow between them.
 *
 * Empty or whitespace-only component entries are dropped so the alt text has no dangling commas;
 * a missing/blank `flow` simply contributes no flow sentence. The function never throws.
 */
export function architectureAltText(components: readonly string[], flow: string): string {
  const named = components.map((c) => c.trim()).filter((c) => c.length > 0);
  const flowText = flow.trim();

  const parts: string[] = [];
  if (named.length > 0) {
    const label = named.length === 1 ? "Component" : "Components";
    parts.push(`${label}: ${named.join(", ")}.`);
  }
  if (flowText.length > 0) {
    parts.push(`Data flow: ${flowText}.`);
  }
  // Even with no components and no flow, return a stable, non-empty description.
  if (parts.length === 0) return "Architecture diagram.";
  return `Architecture diagram. ${parts.join(" ")}`;
}
