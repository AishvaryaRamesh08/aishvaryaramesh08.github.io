/**
 * `dependencyEdges` (Req 13.1, 13.2): the Dependency_Demo has 5–30 uniquely named jobs, and every
 * edge endpoint is a defined job. `checkEdgeEndpoints` is the edge rule on its own (Property 3).
 */
import { CONTENT_FILES, validationError, type Content, type ValidationError } from "./types";
import type { DependencyEdge } from "../../data/types";

export const JOB_COUNT = { min: 5, max: 30 } as const;

const file = CONTENT_FILES.dependencyDemo;

/** One error per edge whose `from` or `to` is not in `jobIds`; the error names the index and both endpoints. */
export function checkEdgeEndpoints(jobIds: ReadonlySet<string>, edges: readonly DependencyEdge[]): ValidationError[] {
  const errors: ValidationError[] = [];
  edges.forEach((edge, i) => {
    const unknown = [...new Set([edge.from, edge.to])].filter((id) => !jobIds.has(id));
    if (unknown.length === 0) return;
    const names = unknown.map((id) => `"${id}"`).join(", ");
    errors.push(
      validationError(
        file,
        `edges[${i}]`,
        // The index is repeated in the message so the message alone identifies the edge (Property 3).
        `"${edge.from}" → "${edge.to}" (edge ${i}): unknown job${unknown.length > 1 ? "s" : ""} ${names}`,
      ),
    );
  });
  return errors;
}

/** Job count within 5–30 and no repeated job id. */
export function checkJobs(jobs: readonly { id: string }[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (jobs.length < JOB_COUNT.min || jobs.length > JOB_COUNT.max) {
    errors.push(validationError(file, "jobs", `${jobs.length} jobs (allowed ${JOB_COUNT.min}–${JOB_COUNT.max})`));
  }
  const seen = new Set<string>();
  jobs.forEach((job, i) => {
    if (seen.has(job.id)) errors.push(validationError(file, `jobs[${i}].id`, `duplicate job id "${job.id}"`));
    seen.add(job.id);
  });
  return errors;
}

export function dependencyEdges(content: Pick<Content, "dependencyDemo">): ValidationError[] {
  const { jobs, edges } = content.dependencyDemo;
  return [...checkJobs(jobs), ...checkEdgeEndpoints(new Set(jobs.map((j) => j.id)), edges)];
}
