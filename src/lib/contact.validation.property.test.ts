// Property 20: Validation matches the specification.
// **Validates: Requirements 21.3**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CONTACT_FIELDS,
  firstInvalidField,
  isContactValid,
  isValidEmail,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactValues,
} from "./contact";

// ---------- independent oracle, written from Req 21.3 ----------

/** ECMAScript WhiteSpace + LineTerminator code points, listed explicitly (no `\s`, no `trim`). */
const WHITESPACE = new Set<string>([
  "\t", "\n", "\v", "\f", "\r", " ", "\u00a0", "\u1680",
  "\u2000", "\u2001", "\u2002", "\u2003", "\u2004", "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200a",
  "\u2028", "\u2029", "\u202f", "\u205f", "\u3000", "\ufeff",
]);

const isWs = (ch: string): boolean => WHITESPACE.has(ch);

/** "empty or contains only whitespace" */
function oracleBlank(s: string): boolean {
  for (const ch of s) if (!isWs(ch)) return false;
  return true;
}

/** Exactly one "@", ≥ 1 non-whitespace char before it, a domain containing "." after it. */
function oracleEmailOk(s: string): boolean {
  let at = -1;
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "@") {
      count++;
      at = i;
    }
  }
  if (count !== 1) return false;
  let localHasNonWs = false;
  for (const ch of s.slice(0, at)) if (!isWs(ch)) localHasNonWs = true;
  let domainHasDot = false;
  for (const ch of s.slice(at + 1)) if (ch === ".") domainHasDot = true;
  return localHasNonWs && domainHasDot;
}

function oracleErrors(v: ContactValues): ContactErrors {
  const e: ContactErrors = {};
  if (oracleBlank(v.name)) e.name = "required";
  if (oracleBlank(v.email)) e.email = "required";
  else if (!oracleEmailOk(v.email)) e.email = "email";
  if (oracleBlank(v.message)) e.message = "required";
  return e;
}

const ORDER: readonly ContactField[] = ["name", "email", "message"];

// ---------- generators ----------

const wsChar = fc.constantFrom(...WHITESPACE);
const whitespace = fc.string({ unit: wsChar, maxLength: 4 });

/** Characters that matter to the rule, plus ordinary and non-BMP unicode. */
const interesting = fc.oneof(
  { weight: 3, arbitrary: fc.constantFrom("@", ".", "a", "Z", "0", "-", "_", "+") },
  { weight: 2, arbitrary: wsChar },
  { weight: 2, arbitrary: fc.constantFrom("é", "ß", "名", "Ω", "😀", "👩‍💻", "\u0301", "\u200b", "＠", "．") },
  { weight: 1, arbitrary: fc.string({ unit: "grapheme", minLength: 1, maxLength: 1 }) },
);
const mixed = fc.string({ unit: interesting, maxLength: 20 });

/** Shaped like an email, with optional padding and possible extra "@"s or missing ".". */
const emailish = fc
  .tuple(
    whitespace,
    fc.string({ unit: interesting, maxLength: 6 }),
    fc.constantFrom("@", "@@", "", "@x@"),
    fc.string({ unit: interesting, maxLength: 6 }),
    fc.constantFrom(".", "", ".."),
    fc.string({ unit: interesting, maxLength: 4 }),
    whitespace,
  )
  .map((parts) => parts.join(""));

const anyString = fc.oneof(
  mixed,
  whitespace,
  emailish,
  fc.string({ unit: "binary", maxLength: 16 }),
  fc.constant(""),
);

const values: fc.Arbitrary<ContactValues> = fc.record({
  name: anyString,
  email: fc.oneof(emailish, anyString),
  message: anyString,
});

// ---------- properties ----------

describe("Property 20: Validation matches the specification", () => {
  it("field order is name, email, message", () => {
    expect([...CONTACT_FIELDS]).toEqual(ORDER);
  });

  it("isValidEmail agrees with the Req 21.3 email rule for arbitrary strings", () => {
    fc.assert(
      fc.property(fc.oneof(emailish, anyString), (s) => {
        expect(isValidEmail(s)).toBe(oracleEmailOk(s));
      }),
    );
  });

  it("validateContact flags exactly the fields the oracle rejects, with the same codes", () => {
    fc.assert(
      fc.property(values, (v) => {
        const errors = validateContact(v);
        const expected = oracleErrors(v);
        expect(errors).toEqual(expected);
        expect(isContactValid(errors)).toBe(Object.keys(expected).length === 0);
      }),
    );
  });

  it("firstInvalidField returns the first invalid field in form order, or null", () => {
    fc.assert(
      fc.property(values, (v) => {
        const expected = oracleErrors(v);
        const first = ORDER.find((f) => expected[f] !== undefined) ?? null;
        expect(firstInvalidField(validateContact(v))).toBe(first);
      }),
    );
  });

  it("padding with whitespace does not change the email verdict", () => {
    fc.assert(
      fc.property(fc.oneof(emailish, anyString), whitespace, whitespace, (s, pre, post) => {
        const padded = pre + s + post;
        expect(isValidEmail(padded)).toBe(isValidEmail(s));
        expect(isValidEmail(padded)).toBe(isValidEmail(s.trim()));
        expect(validateContact({ name: "n", email: padded, message: "m" }).email).toBe(
          validateContact({ name: "n", email: s, message: "m" }).email,
        );
      }),
    );
  });

  it("examples: whitespace-only, multiple @, missing dot, unicode", () => {
    expect(validateContact({ name: " \t", email: "\u3000", message: "\n" })).toEqual({
      name: "required",
      email: "required",
      message: "required",
    });
    expect(isValidEmail("a@b@c.d")).toBe(false);
    expect(isValidEmail(" @b.c")).toBe(false);
    expect(isValidEmail("a@bc")).toBe(false);
    expect(isValidEmail("  名@例え.jp  ")).toBe(true);
    expect(isValidEmail("a＠b.c")).toBe(false); // fullwidth @ is not "@"
    expect(firstInvalidField(validateContact({ name: "x", email: "bad", message: "" }))).toBe("email");
  });
});
