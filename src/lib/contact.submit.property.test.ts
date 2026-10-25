// Feature: portfolio-website, Property 21: Single-flight submission and honeypot —
// for any valid form values and any sequence of submit events fired before the (mocked) response
// arrives, the submission controller sends exactly one request when the Honeypot_Field is empty and
// zero requests when it is non-empty; both end in the same success state on a confirmed (or
// dropped) submission.
// **Validates: Requirements 21.5, 21.14**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type ContactEvent,
  type ContactState,
  type ContactValues,
  type FetchLike,
  type SubmitFailureReason,
  type SubmitResult,
  WEB3FORMS_ENDPOINT,
  contactReducer,
  createSubmitter,
  initialContactState,
} from "./contact";

// ---------- generators ----------

const arbNonBlank = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() !== "");
const arbBlank = fc.constantFrom("", " ", "  ", "\t", "\n ");

const arbEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9._%+-]{1,10}$/),
    fc.stringMatching(/^[a-z0-9-]{1,10}$/),
    fc.stringMatching(/^[a-z]{2,6}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Values that pass Req 21.3 by construction. */
const arbValidValues: fc.Arbitrary<ContactValues> = fc.record({
  name: arbNonBlank,
  email: arbEmail,
  message: arbNonBlank,
});

/** Values that fail Req 21.3 by construction: one field blanked or the email broken. */
const arbInvalidValues: fc.Arbitrary<ContactValues> = fc.oneof(
  fc.tuple(arbValidValues, arbBlank).map(([v, b]) => ({ ...v, name: b })),
  fc.tuple(arbValidValues, arbBlank).map(([v, b]) => ({ ...v, email: b })),
  fc.tuple(arbValidValues, arbBlank).map(([v, b]) => ({ ...v, message: b })),
  arbValidValues.map((v) => ({ ...v, email: v.email.replace("@", "") })), // no "@"
  arbValidValues.map((v) => ({ ...v, email: v.email.replace("@", "@@") })), // two "@"
  arbValidValues.map((v) => ({ ...v, email: v.email.replace(/\.[a-z]+$/, "") })), // domain without "."
);

/** Empty Honeypot_Field (human) or any non-empty value (bot). */
const arbHoneypot = fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 12 }));
const arbFilledHoneypot = fc.string({ minLength: 1, maxLength: 12 });

type Outcome = "ok" | "notOk" | "successFalse" | "badJson" | "network" | "timeout";
const arbOutcome = fc.constantFrom<Outcome>("ok", "notOk", "successFalse", "badJson", "network", "timeout");

const expectedForOutcome: Record<Outcome, SubmitResult> = {
  ok: { status: "success", dropped: false },
  notOk: { status: "error", reason: "provider" },
  successFalse: { status: "error", reason: "provider" },
  badJson: { status: "error", reason: "provider" },
  network: { status: "error", reason: "network" },
  timeout: { status: "error", reason: "timeout" },
};

type Op =
  | { kind: "submit"; valid: boolean; values: ContactValues; honeypot: string }
  | { kind: "settle"; outcome: Outcome };

const arbOp: fc.Arbitrary<Op> = fc.oneof(
  { weight: 3, arbitrary: fc.record({ kind: fc.constant("submit" as const), valid: fc.constant(true), values: arbValidValues, honeypot: arbHoneypot }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("submit" as const), valid: fc.constant(false), values: arbInvalidValues, honeypot: arbHoneypot }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("settle" as const), outcome: arbOutcome }) },
);

// ---------- controllable fetch harness ----------

interface PendingRequest {
  settle(outcome: Outcome): void;
}

interface Harness {
  fetch: FetchLike;
  timeoutSignal: (ms: number) => AbortSignal;
  dispatch: (e: ContactEvent) => void;
  calls: { url: string; method: string }[];
  events: ContactEvent[];
  state: () => ContactState;
  /** The request currently awaiting a response, if any. */
  pending: () => PendingRequest | null;
  maxConcurrent: () => number;
}

/**
 * A deferred fetch: each call stays pending until the test settles it. The injected timeout signal
 * never aborts on its own (no real timers); the "timeout" outcome aborts it explicitly, and the fake
 * fetch rejects on abort like the real one would. Dispatched events drive the real reducer.
 */
function makeHarness(): Harness {
  const calls: { url: string; method: string }[] = [];
  const events: ContactEvent[] = [];
  let state: ContactState = initialContactState;
  let active = 0;
  let maxConcurrent = 0;
  let pending: PendingRequest | null = null;
  let controller: AbortController | null = null;

  const timeoutSignal = (): AbortSignal => {
    controller = new AbortController();
    return controller.signal;
  };

  const fetch: FetchLike = (url, init) => {
    calls.push({ url, method: init.method });
    active += 1;
    maxConcurrent = Math.max(maxConcurrent, active);
    const ctrl = controller!;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn: () => void): void => {
        if (done) return;
        done = true;
        active -= 1;
        pending = null;
        fn();
      };
      init.signal.addEventListener("abort", () => finish(() => reject(init.signal.reason)), { once: true });
      pending = {
        settle(outcome) {
          switch (outcome) {
            case "ok":
              return finish(() => resolve({ ok: true, json: async () => ({ success: true }) }));
            case "notOk":
              return finish(() => resolve({ ok: false, json: async () => ({ success: false }) }));
            case "successFalse":
              return finish(() => resolve({ ok: true, json: async () => ({ success: false, message: "nope" }) }));
            case "badJson":
              return finish(() => resolve({ ok: true, json: async () => { throw new SyntaxError("Unexpected token"); } }));
            case "network":
              return finish(() => reject(new TypeError("Failed to fetch")));
            case "timeout":
              return ctrl.abort(new DOMException("The operation timed out.", "TimeoutError"));
          }
        },
      };
    });
  };

  return {
    fetch,
    timeoutSignal,
    dispatch: (e) => {
      events.push(e);
      state = contactReducer(state, e);
    },
    calls,
    events,
    state: () => state,
    pending: () => pending,
    maxConcurrent: () => maxConcurrent,
  };
}

function stateAfter(result: SubmitResult): ContactState | null {
  if (result.status === "success") return { status: "success" };
  if (result.status === "error") return { status: "error", reason: result.reason as SubmitFailureReason };
  return null; // ignored / invalid leave the state unchanged
}

// ---------- properties ----------

describe("Property 21: Single-flight submission and honeypot", () => {
  it("any burst of submits before the response sends one request (empty honeypot) or none (filled), ending in success", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidValues,
        fc.oneof(fc.constant(""), arbFilledHoneypot),
        fc.integer({ min: 1, max: 8 }),
        async (values, honeypot, burst) => {
          const h = makeHarness();
          const submitter = createSubmitter({
            accessKey: "test-key",
            subject: "Portfolio contact",
            fetch: h.fetch,
            timeoutSignal: h.timeoutSignal,
            dispatch: h.dispatch,
          });

          // All submits fire synchronously, before any response can arrive.
          const results = Array.from({ length: burst }, () => submitter.submit(values, honeypot));

          if (honeypot === "") {
            expect(h.calls).toHaveLength(1);
            expect(submitter.inFlight).toBe(true);
            expect(h.state()).toEqual({ status: "sending" });
            h.pending()!.settle("ok");
          } else {
            expect(h.calls).toHaveLength(0);
            expect(submitter.inFlight).toBe(false);
          }

          const settled = await Promise.all(results);
          expect(h.calls.every((c) => c.url === WEB3FORMS_ENDPOINT && c.method === "POST")).toBe(true);
          expect(h.state()).toEqual({ status: "success" });
          expect(submitter.inFlight).toBe(false);

          if (honeypot === "") {
            expect(settled[0]).toEqual({ status: "success", dropped: false });
            for (const r of settled.slice(1)) expect(r).toEqual({ status: "ignored" });
            expect(h.events).toEqual([{ type: "submit" }, { type: "succeeded" }]);
          } else {
            for (const r of settled) expect(r).toEqual({ status: "success", dropped: true });
          }
        },
      ),
    );
  });

  it("arbitrary interleavings of submits and responses keep at most one request in flight and match the model", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbOp, { minLength: 1, maxLength: 25 }), async (ops) => {
        const h = makeHarness();
        const submitter = createSubmitter({
          accessKey: "test-key",
          subject: "Portfolio contact",
          fetch: h.fetch,
          timeoutSignal: h.timeoutSignal,
          dispatch: h.dispatch,
        });

        let inFlightPromise: Promise<SubmitResult> | null = null;
        let expectedFetches = 0;
        let expectedState: ContactState = initialContactState;

        const settle = async (outcome: Outcome): Promise<void> => {
          if (inFlightPromise === null) return; // nothing pending: a stray response is a no-op
          h.pending()!.settle(outcome);
          const result = await inFlightPromise;
          inFlightPromise = null;
          expect(result).toEqual(expectedForOutcome[outcome]);
          expectedState = stateAfter(result)!;
        };

        for (const op of ops) {
          if (op.kind === "settle") {
            await settle(op.outcome);
          } else {
            const eventsBefore = h.events.length;
            const fetchesBefore = h.calls.length;
            const p = submitter.submit(op.values, op.honeypot);

            if (inFlightPromise !== null) {
              // Guard first: anything while pending is ignored, with no request and no dispatch.
              expect(await p).toEqual({ status: "ignored" });
              expect(h.calls.length).toBe(fetchesBefore);
              expect(h.events.length).toBe(eventsBefore);
            } else if (!op.valid) {
              const r = await p;
              expect(r.status).toBe("invalid");
              expect(h.calls.length).toBe(fetchesBefore);
              expect(h.events.length).toBe(eventsBefore);
            } else if (op.honeypot !== "") {
              // Silently dropped: no request, same success state as a confirmed submission.
              expect(await p).toEqual({ status: "success", dropped: true });
              expect(h.calls.length).toBe(fetchesBefore);
              expect(h.events.slice(eventsBefore)).toEqual([{ type: "submit" }, { type: "succeeded" }]);
              expectedState = { status: "success" };
            } else {
              expectedFetches += 1;
              expect(h.calls.length).toBe(fetchesBefore + 1);
              expect(submitter.inFlight).toBe(true);
              inFlightPromise = p;
              expectedState = { status: "sending" };
            }
          }

          expect(submitter.inFlight).toBe(inFlightPromise !== null);
          expect(h.state()).toEqual(expectedState);
        }

        // Let any last request finish so the run ends in a settled state.
        await settle("ok");

        expect(h.maxConcurrent()).toBeLessThanOrEqual(1);
        expect(h.calls).toHaveLength(expectedFetches);
        expect(h.calls.every((c) => c.url === WEB3FORMS_ENDPOINT && c.method === "POST")).toBe(true);
        expect(submitter.inFlight).toBe(false);
        expect(h.state()).toEqual(expectedState);
      }),
    );
  });
});
