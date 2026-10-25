// Contact_Form validation and submission controller (Req 21.3, 21.5–21.8, 21.14). Pure TypeScript,
// no DOM and no React, so the rules and the single-flight guarantee can be property-tested
// (Properties 20 and 21).
//
// - `validateContact` implements exactly the rules of Req 21.3 and nothing else (length limits are
//   enforced by `maxLength` on the inputs, Req 21.2).
// - `contactReducer` is the UI state machine `idle → sending → success | error`; submit events while
//   `sending` are ignored (Req 21.5).
// - `createSubmitter` is the network side: an in-flight guard (backing up the reducer), the honeypot
//   short-circuit (Req 21.14), and the Web3Forms request with a 15 s timeout (Req 21.7). `fetch`
//   and the timeout signal are injectable for tests. The only origin it ever contacts is the fixed
//   `WEB3FORMS_ENDPOINT` (Req 1.5); the URL is not configurable.

/** The fixed Form_Provider endpoint. Never derived from config or input. */
export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/** No response within this many milliseconds counts as a failure (Req 21.7). */
export const CONTACT_TIMEOUT_MS = 15_000;

/** Name of the Honeypot_Field input (Req 21.13). */
export const HONEYPOT_FIELD_NAME = "hp_company_site";

// ---------- validation ----------

export interface ContactValues {
  name: string;
  email: string;
  message: string;
}

export type ContactField = keyof ContactValues;

/** Field order on the form; the first invalid field in this order receives focus (Req 21.3). */
export const CONTACT_FIELDS = ["name", "email", "message"] as const satisfies readonly ContactField[];

/** `required`: empty or whitespace-only. `email`: fails the email rule of Req 21.3. */
export type ContactErrorCode = "required" | "email";

/** One entry per invalid field; valid fields are absent. Empty object means the form is valid. */
export type ContactErrors = Partial<Record<ContactField, ContactErrorCode>>;

/**
 * The email rule of Req 21.3: exactly one "@", at least one non-whitespace character before it,
 * and a domain after it containing at least one ".". Leading/trailing whitespace never changes the
 * outcome, so this gives the same answer for the raw and the trimmed value.
 */
export function isValidEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return /\S/.test(local) && domain.includes(".");
}

/**
 * Flags each field that fails Req 21.3: `required` when the trimmed value is empty, otherwise
 * `email` when the email fails `isValidEmail`.
 */
export function validateContact(v: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  if (v.name.trim() === "") errors.name = "required";
  if (v.email.trim() === "") errors.email = "required";
  else if (!isValidEmail(v.email)) errors.email = "email";
  if (v.message.trim() === "") errors.message = "required";
  return errors;
}

/** True when `validateContact` found no errors. */
export function isContactValid(errors: ContactErrors): boolean {
  return CONTACT_FIELDS.every((f) => errors[f] === undefined);
}

/** The first invalid field in form order, or `null` when valid (focus target, Req 21.3). */
export function firstInvalidField(errors: ContactErrors): ContactField | null {
  return CONTACT_FIELDS.find((f) => errors[f] !== undefined) ?? null;
}

// ---------- UI state machine ----------

/** Why a submission failed (Req 21.7). All three render the same error alert + mailto fallback. */
export type SubmitFailureReason = "provider" | "network" | "timeout";

export type ContactState =
  | { readonly status: "idle" }
  | { readonly status: "sending" }
  | { readonly status: "success" }
  | { readonly status: "error"; readonly reason: SubmitFailureReason };

export type ContactEvent =
  /** A valid submission started (request sent, or honeypot drop about to succeed). */
  | { readonly type: "submit" }
  /** The Form_Provider confirmed receipt, or the honeypot dropped the submission (Req 21.6, 21.14). */
  | { readonly type: "succeeded" }
  /** Provider error, network error or timeout (Req 21.7). */
  | { readonly type: "failed"; readonly reason: SubmitFailureReason }
  /** Back to `idle`, e.g. when the Visitor starts a new message after success. */
  | { readonly type: "reset" };

export const initialContactState: ContactState = { status: "idle" };

/**
 * `idle | success | error → sending` on `submit`; `sending → success | error` on the response.
 * `submit` while `sending` is ignored (Req 21.5), as are responses outside `sending` and `reset`
 * while `sending`. Unchanged transitions return the same object so `useReducer` skips re-renders.
 */
export function contactReducer(s: ContactState, e: ContactEvent): ContactState {
  switch (e.type) {
    case "submit":
      return s.status === "sending" ? s : { status: "sending" };
    case "succeeded":
      return s.status === "sending" ? { status: "success" } : s;
    case "failed":
      return s.status === "sending" ? { status: "error", reason: e.reason } : s;
    case "reset":
      return s.status === "sending" || s.status === "idle" ? s : initialContactState;
  }
}

// ---------- access key ----------

/**
 * `VITE_WEB3FORMS_KEY ?? contact.web3formsAccessKey`, treating empty/whitespace values as absent
 * (CI passes `""` when the repository variable is unset). `null` means: render the mailto fallback
 * and never create a submitter (Req 21.8). The key is public by design (Req 21.12).
 */
export function resolveAccessKey(envKey: string | undefined, configKey: string | undefined): string | null {
  for (const key of [envKey, configKey]) {
    const k = key?.trim();
    if (k) return k;
  }
  return null;
}

// ---------- submission controller ----------

/** The subset of `fetch` the submitter uses, so tests can inject a plain function. */
export type FetchLike = (
  url: string,
  init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export interface SubmitterOptions {
  /** Resolved Web3Forms access key (see `resolveAccessKey`). Must be non-empty. */
  accessKey: string;
  /** Email subject, from `contact.subject`. */
  subject: string;
  /** Defaults to the global `fetch`, looked up at call time. */
  fetch?: FetchLike;
  /** Creates the timeout signal for one request. Defaults to `AbortSignal.timeout`. */
  timeoutSignal?: (ms: number) => AbortSignal;
  /** Defaults to `CONTACT_TIMEOUT_MS`. */
  timeoutMs?: number;
  /** Receives `submit` when a valid submission starts and `succeeded`/`failed` when it ends. */
  dispatch?: (e: ContactEvent) => void;
}

export type SubmitResult =
  /** Confirmed by the provider, or silently dropped by the honeypot (`dropped: true`). */
  | { readonly status: "success"; readonly dropped: boolean }
  | { readonly status: "error"; readonly reason: SubmitFailureReason }
  /** Failed validation; nothing was sent and nothing was dispatched. */
  | { readonly status: "invalid"; readonly errors: ContactErrors }
  /** Another submission is in flight; nothing was sent and nothing was dispatched (Req 21.5). */
  | { readonly status: "ignored" };

export interface Submitter {
  /**
   * Submits once. Order: in-flight guard → validation → honeypot → request. The guard is set
   * synchronously, so every call made before the pending one settles returns `ignored`.
   */
  submit(values: ContactValues, honeypot?: string): Promise<SubmitResult>;
  /** True while a request is pending. */
  readonly inFlight: boolean;
}

const defaultFetch: FetchLike = (url, init) => globalThis.fetch(url, init);
const defaultTimeoutSignal = (ms: number): AbortSignal => AbortSignal.timeout(ms);

/** Rejects with the signal's reason once it aborts; `cleanup` removes the listener. */
function whenAborted(signal: AbortSignal): { promise: Promise<never>; cleanup: () => void } {
  let onAbort = (): void => {};
  const promise = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
  return { promise, cleanup: () => signal.removeEventListener("abort", onAbort) };
}

function isTimeoutError(err: unknown): boolean {
  const name = (err as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

class ProviderError extends Error {}

/**
 * Creates the submission controller for one Contact_Form. Success iff `res.ok && json.success ===
 * true`; a non-ok response, `success !== true` or an unparsable body is a `provider` failure, an
 * abort/timeout is `timeout`, anything else thrown by `fetch` is `network`. The timeout is raced
 * against the request, so it holds even if an injected `fetch` ignores the signal.
 */
export function createSubmitter(opts: SubmitterOptions): Submitter {
  const accessKey = opts.accessKey.trim();
  if (accessKey === "") throw new Error("createSubmitter: accessKey is required (render the mailto fallback instead)");
  const timeoutMs = opts.timeoutMs ?? CONTACT_TIMEOUT_MS;
  const timeoutSignal = opts.timeoutSignal ?? defaultTimeoutSignal;
  const dispatch = opts.dispatch ?? (() => {});
  let inFlight = false;

  async function send(v: ContactValues): Promise<SubmitResult> {
    const doFetch = opts.fetch ?? defaultFetch;
    const name = v.name.trim();
    const signal = timeoutSignal(timeoutMs);
    const aborted = whenAborted(signal);
    try {
      const request = (async () => {
        const res = await doFetch(WEB3FORMS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: accessKey,
            name,
            email: v.email.trim(),
            message: v.message.trim(),
            subject: opts.subject,
            from_name: name,
          }),
          signal,
        });
        if (!res.ok) throw new ProviderError("response not ok");
        let json: unknown;
        try {
          json = await res.json();
        } catch {
          throw new ProviderError("unparsable response");
        }
        if ((json as { success?: unknown } | null)?.success !== true) throw new ProviderError("success !== true");
      })();
      // Keep a late rejection from the losing branch from surfacing as unhandled.
      request.catch(() => {});
      await Promise.race([request, aborted.promise]);
      return { status: "success", dropped: false };
    } catch (err) {
      const reason: SubmitFailureReason =
        err instanceof ProviderError ? "provider" : signal.aborted || isTimeoutError(err) ? "timeout" : "network";
      return { status: "error", reason };
    } finally {
      aborted.cleanup();
    }
  }

  return {
    get inFlight() {
      return inFlight;
    },
    async submit(values, honeypot = "") {
      if (inFlight) return { status: "ignored" };
      const errors = validateContact(values);
      if (!isContactValid(errors)) return { status: "invalid", errors };
      if (honeypot !== "") {
        // Silently drop: no request, same success state as a confirmed submission (Req 21.14).
        dispatch({ type: "submit" });
        dispatch({ type: "succeeded" });
        return { status: "success", dropped: true };
      }
      inFlight = true;
      dispatch({ type: "submit" });
      try {
        const result = await send(values);
        dispatch(result.status === "error" ? { type: "failed", reason: result.reason } : { type: "succeeded" });
        return result;
      } finally {
        inFlight = false;
      }
    },
  };
}
