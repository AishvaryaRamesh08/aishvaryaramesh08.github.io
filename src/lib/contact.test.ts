import { describe, expect, it, vi } from "vitest";
import {
  WEB3FORMS_ENDPOINT,
  contactReducer,
  createSubmitter,
  firstInvalidField,
  initialContactState,
  resolveAccessKey,
  validateContact,
  type ContactEvent,
  type ContactState,
  type FetchLike,
} from "./contact";

const valid = { name: " Ada ", email: "ada@example.com", message: "Hello" };

/** A fetch whose response is released manually, so tests can submit while it is pending. */
function deferredFetch() {
  let release: (r: { ok: boolean; json(): Promise<unknown> }) => void = () => {};
  const fetch = vi.fn<FetchLike>(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  return { fetch, release: (ok: boolean, json: unknown) => release({ ok, json: async () => json }) };
}

/** Collects dispatched events and folds them through the reducer. */
function recorder() {
  let state: ContactState = initialContactState;
  const events: ContactEvent[] = [];
  return {
    events,
    dispatch: (e: ContactEvent) => {
      events.push(e);
      state = contactReducer(state, e);
    },
    get state() {
      return state;
    },
  };
}

describe("validateContact", () => {
  it("accepts valid values", () => {
    expect(validateContact(valid)).toEqual({});
  });

  it("flags whitespace-only fields as required and focuses the first", () => {
    const errors = validateContact({ name: "  ", email: "\t", message: "\n" });
    expect(errors).toEqual({ name: "required", email: "required", message: "required" });
    expect(firstInvalidField(errors)).toBe("name");
  });

  it("applies the email rule of Req 21.3", () => {
    for (const email of ["a@b", "a@@b.c", "a@b@c.d", " @b.c", "@b.c", "ab.c"]) {
      expect(validateContact({ ...valid, email }).email, email).toBe("email");
    }
    for (const email of ["a@b.c", " x @ y.z ", "a@.c"]) {
      expect(validateContact({ ...valid, email }).email, email).toBeUndefined();
    }
    expect(firstInvalidField(validateContact({ ...valid, email: "nope" }))).toBe("email");
  });
});

describe("contactReducer", () => {
  it("goes idle → sending → success | error and ignores submit while sending", () => {
    const sending = contactReducer(initialContactState, { type: "submit" });
    expect(sending).toEqual({ status: "sending" });
    expect(contactReducer(sending, { type: "submit" })).toBe(sending);
    expect(contactReducer(sending, { type: "succeeded" })).toEqual({ status: "success" });
    expect(contactReducer(sending, { type: "failed", reason: "timeout" })).toEqual({ status: "error", reason: "timeout" });
    expect(contactReducer(initialContactState, { type: "succeeded" })).toBe(initialContactState);
    expect(contactReducer({ status: "error", reason: "network" }, { type: "submit" })).toEqual({ status: "sending" });
  });
});

describe("resolveAccessKey", () => {
  it("prefers the env key and treats blank values as absent", () => {
    expect(resolveAccessKey("env", "cfg")).toBe("env");
    expect(resolveAccessKey("", "cfg")).toBe("cfg");
    expect(resolveAccessKey(undefined, "  ")).toBeNull();
  });
});

describe("createSubmitter", () => {
  it("rejects an empty access key", () => {
    expect(() => createSubmitter({ accessKey: " ", subject: "s" })).toThrow();
  });

  it("sends exactly one Web3Forms request while pending and succeeds on success: true", async () => {
    const { fetch, release } = deferredFetch();
    const rec = recorder();
    const s = createSubmitter({ accessKey: "key", subject: "Subj", fetch, dispatch: rec.dispatch });

    const first = s.submit(valid);
    expect(s.inFlight).toBe(true);
    await expect(s.submit(valid)).resolves.toEqual({ status: "ignored" });
    expect(rec.state).toEqual({ status: "sending" });

    release(true, { success: true });
    await expect(first).resolves.toEqual({ status: "success", dropped: false });
    expect(rec.state).toEqual({ status: "success" });
    expect(s.inFlight).toBe(false);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(WEB3FORMS_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      access_key: "key",
      name: "Ada",
      email: "ada@example.com",
      message: "Hello",
      subject: "Subj",
      from_name: "Ada",
    });
  });

  it("drops a honeypot submission without a request and shows success", async () => {
    const fetch = vi.fn<FetchLike>();
    const rec = recorder();
    const s = createSubmitter({ accessKey: "key", subject: "s", fetch, dispatch: rec.dispatch });
    await expect(s.submit(valid, "bot.example")).resolves.toEqual({ status: "success", dropped: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(rec.state).toEqual({ status: "success" });
  });

  it("sends nothing for invalid values", async () => {
    const fetch = vi.fn<FetchLike>();
    const s = createSubmitter({ accessKey: "key", subject: "s", fetch });
    await expect(s.submit({ ...valid, email: "x" })).resolves.toEqual({ status: "invalid", errors: { email: "email" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps provider, network and timeout failures", async () => {
    const provider = createSubmitter({
      accessKey: "k",
      subject: "s",
      fetch: async () => ({ ok: true, json: async () => ({ success: false }) }),
    });
    await expect(provider.submit(valid)).resolves.toEqual({ status: "error", reason: "provider" });

    const notOk = createSubmitter({ accessKey: "k", subject: "s", fetch: async () => ({ ok: false, json: async () => ({ success: true }) }) });
    await expect(notOk.submit(valid)).resolves.toEqual({ status: "error", reason: "provider" });

    const network = createSubmitter({
      accessKey: "k",
      subject: "s",
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(network.submit(valid)).resolves.toEqual({ status: "error", reason: "network" });

    // A fetch that never settles and ignores its signal still times out via the injected signal.
    const controller = new AbortController();
    const rec = recorder();
    const timeout = createSubmitter({
      accessKey: "k",
      subject: "s",
      fetch: () => new Promise(() => {}),
      timeoutSignal: () => controller.signal,
      dispatch: rec.dispatch,
    });
    const pending = timeout.submit(valid);
    controller.abort(new DOMException("timed out", "TimeoutError"));
    await expect(pending).resolves.toEqual({ status: "error", reason: "timeout" });
    expect(rec.state).toEqual({ status: "error", reason: "timeout" });
    expect(timeout.inFlight).toBe(false);
  });
});
