// Contact section body (Req 21). The h2 heading and `#contact` anchor come from `SectionShell`
// (Req 3.2, 3.3); this renders everything under it: the headline, the Contact_Form (or the
// MailtoFallback when no Web3Forms access key is configured), and the standalone ContactLinks.
//
// All validation, the UI state machine and the single-flight submission live in the pure
// `src/lib/contact.ts` module (property-tested by tasks 19.2/19.3); this file is the accessible
// React shell around it. SSR-safe: `resolveAccessKey` reads only build-time env + config, the
// reducer starts `idle`, and no `window`/`document` access happens during render.
import { useId, useReducer, useRef, useState, type FormEvent } from "react";
import { ExternalLink } from "../../components/ExternalLink";
import { PlaceholderAsset } from "../../components/PlaceholderAsset";
import { LiveRegion, useAnnouncer } from "../../components/LiveRegion";
import { contact } from "../../data/contact";
import type { ContactConfig } from "../../data/types";
import { isPlaceholder } from "../../data/types";
import { ui } from "../../data/ui";
import { cx } from "../../lib/cx";
import {
  HONEYPOT_FIELD_NAME,
  contactReducer,
  createSubmitter,
  firstInvalidField,
  initialContactState,
  isContactValid,
  resolveAccessKey,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactValues,
} from "../../lib/contact";

/**
 * Resolved once per module load: `VITE_WEB3FORMS_KEY ?? contact.web3formsAccessKey`, empty treated
 * as absent (Req 21.8, 21.11). `null` → render the MailtoFallback and never create a submitter.
 */
const ACCESS_KEY = resolveAccessKey(
  import.meta.env.VITE_WEB3FORMS_KEY,
  (contact as ContactConfig).web3formsAccessKey,
);

const EMPTY_VALUES: ContactValues = { name: "", email: "", message: "" };

/** A `mailto:` href to the Owner with the Content_Config subject prefilled, plus an optional body. */
function mailtoHref(body?: string): string {
  const params = new URLSearchParams({ subject: contact.subject });
  if (body && body.trim() !== "") params.set("body", body);
  // URLSearchParams encodes spaces as "+"; mail clients expect %20 in a mailto query.
  return `${contact.links.email}?${params.toString().replace(/\+/g, "%20")}`;
}

/** Visible "Email me instead" fallback link, prefilled with the subject (and body on error). */
function MailtoFallback({ body }: { body?: string }) {
  return (
    <a
      href={mailtoHref(body)}
      className="text-accent-cyan-text underline underline-offset-4 hover:no-underline"
    >
      {contact.messages.mailtoLabel}
    </a>
  );
}

/** Email / LinkedIn / GitHub / resume links, each naming its destination (Req 21.9). */
function ContactLinks() {
  const links = contact.links;
  const names = ui.contact.linkNames;
  // Widened to the `Slot` branches so `isPlaceholder` narrows regardless of the current config value.
  const linkedin: ContactConfig["links"]["linkedin"] = links.linkedin;
  const github: ContactConfig["links"]["github"] = links.github;
  const resume: ContactConfig["links"]["resumePdf"] = links.resumePdf;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-wide text-text-muted uppercase">{ui.contact.linksHeading}</h3>
      <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
        {/* Email: a mailto link (same tab, not a new browser tab, Req 21.9). */}
        <li>
          <a
            href={links.email}
            aria-label={names.email}
            className="text-accent-cyan-text underline underline-offset-4 hover:no-underline"
          >
            Email
          </a>
        </li>
        {/* LinkedIn, GitHub, resume open in a new tab, or render a Placeholder_Asset when unsupplied. */}
        <li>
          {isPlaceholder(linkedin) ? (
            <PlaceholderAsset expected="LinkedIn URL" variant="link" />
          ) : (
            <ExternalLink href={linkedin} aria-label={names.linkedin}>
              LinkedIn
            </ExternalLink>
          )}
        </li>
        <li>
          {isPlaceholder(github) ? (
            <PlaceholderAsset expected="GitHub URL" variant="link" />
          ) : (
            <ExternalLink href={github} aria-label={names.github}>
              GitHub
            </ExternalLink>
          )}
        </li>
        <li>
          {!isPlaceholder(resume) && __RESUME_AVAILABLE__ ? (
            <ExternalLink href={resume} download aria-label={names.resume}>
              {ui.contact.resumeLabel}
            </ExternalLink>
          ) : (
            <PlaceholderAsset expected="resume PDF" variant="link" />
          )}
        </li>
      </ul>
    </div>
  );
}

/** One labelled text field with an inline error tied by `aria-describedby` + `aria-invalid`. */
interface FieldProps {
  field: ContactField;
  label: string;
  type: "text" | "email";
  value: string;
  maxLength: number;
  error: ContactErrors[ContactField];
  multiline?: boolean;
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
  onChange: (value: string) => void;
}

function Field({
  field,
  label,
  type,
  value,
  maxLength,
  error,
  multiline = false,
  autoComplete,
  inputRef,
  textareaRef,
  onChange,
}: FieldProps) {
  const id = `contact-${field}`;
  const errorId = `${id}-error`;
  const invalid = error !== undefined;
  const shared = {
    id,
    name: field,
    value,
    maxLength,
    autoComplete,
    required: true,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? errorId : undefined,
    className: cx(
      "w-full rounded-md border bg-surface px-3 py-2 text-text outline-none",
      "focus-visible:border-accent-cyan focus-visible:shadow-glow-cyan",
      invalid ? "border-maroon" : "border-border-strong",
    ),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  } as const;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} ref={textareaRef} rows={5} />
      ) : (
        <input {...shared} ref={inputRef} type={type} />
      )}
      {invalid ? (
        <p id={errorId} className="text-sm text-maroon">
          {ui.contact.errors[error]}
        </p>
      ) : null}
    </div>
  );
}

/** Controlled Contact_Form wired to `contactReducer` + a `createSubmitter` single-flight controller. */
function ContactForm({ web3formsKey }: { web3formsKey: string }) {
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [state, dispatch] = useReducer(contactReducer, initialContactState);
  const announcer = useAnnouncer();

  // Refs for focusing the first invalid field on a blocked submit (Req 21.3).
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // One submitter per mount (lazy state initializer); `dispatch` drives the reducer and the
  // submitter's in-flight guard backs up the `sending`-ignores-submit rule (Req 21.5).
  const [submitter] = useState(() => createSubmitter({ accessKey: web3formsKey, subject: contact.subject, dispatch }));

  const titleId = useId();
  const sending = state.status === "sending";

  function focusField(field: ContactField): void {
    const map = { name: nameRef, email: emailRef, message: messageRef } as const;
    map[field].current?.focus();
  }

  /** Clears a field's inline error as soon as it passes validation again (Req 21.4). */
  function updateField(field: ContactField, value: string): void {
    const next = { ...values, [field]: value };
    setValues(next);
    if (errors[field] !== undefined) {
      const fieldErrors = validateContact(next);
      if (fieldErrors[field] === undefined) {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy[field];
          return copy;
        });
      }
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const found = validateContact(values);
    if (!isContactValid(found)) {
      // Block submission, show inline errors, announce them, focus the first invalid field (Req 21.3).
      setErrors(found);
      announcer.announce(ui.contact.invalidSummary);
      const first = firstInvalidField(found);
      if (first) focusField(first);
      return;
    }
    setErrors({});

    const result = await submitter.submit(values, honeypotRef.current?.value ?? "");
    if (result.status === "success") {
      // Confirmed (or silently dropped by the honeypot): clear the fields and announce success (Req 21.6, 21.14).
      setValues(EMPTY_VALUES);
      announcer.announce(contact.messages.success);
    } else if (result.status === "error") {
      announcer.announce(contact.messages.error);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby={titleId} className="flex max-w-xl flex-col gap-4">
      <h3 id={titleId} className="sr-only">
        {ui.contact.submit}
      </h3>

      <Field
        field="name"
        label={ui.contact.nameLabel}
        type="text"
        value={values.name}
        maxLength={contact.limits.name}
        error={errors.name}
        autoComplete="name"
        inputRef={nameRef}
        onChange={(v) => updateField("name", v)}
      />
      <Field
        field="email"
        label={ui.contact.emailLabel}
        type="email"
        value={values.email}
        maxLength={contact.limits.email}
        error={errors.email}
        autoComplete="email"
        inputRef={emailRef}
        onChange={(v) => updateField("email", v)}
      />
      <Field
        field="message"
        label={ui.contact.messageLabel}
        type="text"
        multiline
        value={values.message}
        maxLength={contact.limits.message}
        error={errors.message}
        textareaRef={messageRef}
        onChange={(v) => updateField("message", v)}
      />

      {/* Honeypot_Field: off-screen (not display:none), hidden from AT, out of Tab order, no autofill
          (Req 21.13). A non-empty value makes the submitter drop the submission silently (Req 21.14). */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD_NAME}>Company website</label>
        <input
          ref={honeypotRef}
          id={HONEYPOT_FIELD_NAME}
          name={HONEYPOT_FIELD_NAME}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          className={cx(
            "inline-flex min-h-11 items-center justify-center rounded-pill border border-transparent px-5 font-medium",
            "bg-accent-cyan-text text-[var(--color-base)] hover:shadow-glow-cyan focus-visible:shadow-glow-cyan",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {sending ? contact.messages.sending : ui.contact.submit}
        </button>

        {/* Sending indicator / success message, both visible and announced (Req 21.5, 21.6). */}
        {state.status === "success" ? (
          <p className="text-sm text-text-muted">{contact.messages.success}</p>
        ) : null}
      </div>

      {/* Error alert with the prefilled mailto fallback (Req 21.7). */}
      {state.status === "error" ? (
        <div role="alert" className="flex flex-col gap-1 rounded-md border border-maroon bg-surface-2 p-3 text-sm">
          <span>{contact.messages.error}</span>
          <MailtoFallback body={values.message} />
        </div>
      ) : null}

      {/* Polite announcer for validation and success; the error alert above is already assertive. */}
      <LiveRegion message={announcer.message} messageKey={announcer.messageKey} politeness="polite" />
    </form>
  );
}

/** Contact body (Req 21). Headline, then the form or the mailto fallback, then the contact links. */
export default function Contact() {
  return (
    <div data-section-body="contact" className="flex flex-col gap-8">
      <p className="max-w-prose text-lg text-pretty">{contact.headline}</p>

      {ACCESS_KEY === null ? (
        // No access key configured: show the mailto fallback in place of the form, send nothing (Req 21.8).
        <p className="text-body">
          <MailtoFallback />
        </p>
      ) : (
        <ContactForm web3formsKey={ACCESS_KEY} />
      )}

      <ContactLinks />
    </div>
  );
}
