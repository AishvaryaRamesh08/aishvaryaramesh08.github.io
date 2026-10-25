// Light example tests for the Contact section (Req 21). The full suite is task 19.5; these cover
// the non-obvious contracts: the mailto-only fallback when no access key is configured (and that
// `fetch` is never called), the field `maxLength` and honeypot attributes, focus moving to the
// first invalid field on a blocked submit, a success clearing the fields, and an error keeping the
// input and showing the mailto fallback.
//
// `ACCESS_KEY` is resolved once at module load from `import.meta.env.VITE_WEB3FORMS_KEY ??
// contact.web3formsAccessKey`. The Vitest env leaves `VITE_WEB3FORMS_KEY` empty and the real
// Content_Config ships no key, so a plain import renders the fallback. To exercise the form we mock
// the contact module with a key and re-import Contact fresh.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contact } from "../../data/contact";
import { ui } from "../../data/ui";
import { HONEYPOT_FIELD_NAME } from "../../lib/contact";

/** Renders the body inside a labelled section carrying the h2, as the shell does. */
function renderInSection(Component: () => React.JSX.Element) {
  return render(
    <section id="contact" aria-labelledby="contact-heading">
      <h2 id="contact-heading">Contact</h2>
      <Component />
    </section>,
  );
}

const WITH_KEY = {
  contact: { ...contact, web3formsAccessKey: "test-access-key" },
};

/** Imports a fresh Contact with the contact module optionally overridden to supply an access key. */
async function loadContact(withKey: boolean) {
  vi.resetModules();
  if (withKey) vi.doMock("../../data/contact", () => WITH_KEY);
  const mod = await import("./Contact");
  return mod.default;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock("../../data/contact");
  vi.restoreAllMocks();
});

describe("Contact (no access key)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../../data/contact");
  });

  it("renders the mailto fallback instead of the form and never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const Contact = await loadContact(false);
    renderInSection(Contact);

    // No form fields (Req 21.8).
    expect(screen.queryByLabelText(ui.contact.nameLabel)).toBeNull();
    expect(screen.queryByRole("button", { name: ui.contact.submit })).toBeNull();

    // A mailto link with the prefilled subject is shown in place of the form.
    const mailto = screen.getByRole("link", { name: contact.messages.mailtoLabel });
    expect(mailto.getAttribute("href")).toContain("mailto:");
    expect(mailto.getAttribute("href")).toContain(encodeURIComponent(contact.subject).replace(/%20/g, "%20"));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the headline and the contact links", async () => {
    const Contact = await loadContact(false);
    renderInSection(Contact);

    expect(screen.getByText(contact.headline)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ui.contact.linkNames.email })).toHaveAttribute(
      "href",
      contact.links.email,
    );
  });
});

describe("Contact (access key present)", () => {
  it("gives the fields the configured maxLength and includes the honeypot", async () => {
    const Contact = await loadContact(true);
    renderInSection(Contact);

    expect(screen.getByLabelText(ui.contact.nameLabel)).toHaveAttribute("maxLength", String(contact.limits.name));
    expect(screen.getByLabelText(ui.contact.emailLabel)).toHaveAttribute("maxLength", String(contact.limits.email));
    expect(screen.getByLabelText(ui.contact.messageLabel)).toHaveAttribute(
      "maxLength",
      String(contact.limits.message),
    );

    // Honeypot: out of the tab order and excluded from autofill (Req 21.13).
    const honeypot = document.querySelector<HTMLInputElement>(`input[name="${HONEYPOT_FIELD_NAME}"]`);
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    // Hidden from assistive tech via an aria-hidden wrapper.
    expect(honeypot!.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("blocks an empty submit and moves focus to the first invalid field", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const Contact = await loadContact(true);
    renderInSection(Contact);

    await user.click(screen.getByRole("button", { name: ui.contact.submit }));

    // Name is the first field and is empty, so it receives focus (Req 21.3).
    expect(screen.getByLabelText(ui.contact.nameLabel)).toHaveFocus();
    // An inline error is shown and nothing was sent.
    expect(screen.getByLabelText(ui.contact.nameLabel)).toHaveAttribute("aria-invalid", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clears the fields on a confirmed submission", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })),
    );

    const Contact = await loadContact(true);
    renderInSection(Contact);

    await user.type(screen.getByLabelText(ui.contact.nameLabel), "Ada Lovelace");
    await user.type(screen.getByLabelText(ui.contact.emailLabel), "ada@example.com");
    await user.type(screen.getByLabelText(ui.contact.messageLabel), "Hello there");
    await user.click(screen.getByRole("button", { name: ui.contact.submit }));

    // The success text appears both in the visible message and the live region, so match either.
    await waitFor(() => expect(screen.getAllByText(contact.messages.success).length).toBeGreaterThan(0));
    expect(screen.getByLabelText(ui.contact.nameLabel)).toHaveValue("");
    expect(screen.getByLabelText(ui.contact.messageLabel)).toHaveValue("");
  });

  it("keeps the input and shows the mailto fallback on an error", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ success: false }) })),
    );

    const Contact = await loadContact(true);
    renderInSection(Contact);

    await user.type(screen.getByLabelText(ui.contact.nameLabel), "Ada Lovelace");
    await user.type(screen.getByLabelText(ui.contact.emailLabel), "ada@example.com");
    await user.type(screen.getByLabelText(ui.contact.messageLabel), "Keep this text");
    await user.click(screen.getByRole("button", { name: ui.contact.submit }));

    // The error alert appears with the mailto fallback and the input is preserved (Req 21.7).
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(contact.messages.error);
    expect(screen.getByRole("link", { name: contact.messages.mailtoLabel })).toBeInTheDocument();
    expect(screen.getByLabelText(ui.contact.messageLabel)).toHaveValue("Keep this text");
  });
});
