/**
 * Shared UI microcopy used by the components in `src/components/` (Req 4.1): kept here so no
 * Visitor-visible string is hard-coded in component source.
 */
export interface UiText {
  /** Skip link label (Req 28.6). */
  skipLink: string;
  /** Word shown on every Placeholder_Asset (Req 4.5). */
  placeholder: string;
  /** Shown with the alt text when an image fails to load (Req 8.20, 14.15). */
  imageUnavailable: string;
  /** Shown in a section's place when its lazy chunk fails (Req 30.9). */
  sectionLoadError: string;
  /** Shown when a lazy library or chunk inside a section fails (Req 30.9). */
  contentLoadError: string;
  /** Retry control label (Req 30.9). */
  retry: string;
  /** Loading placeholder label. */
  loading: string;
  /** Appended to the accessible name of links that open a new tab. */
  opensInNewTab: string;
  /** Close button of dialogs such as the Lightbox (Req 16.9, 20.9). */
  close: string;
  /** Accessible name of the Navbar's nav landmark (Req 3.2, 28.9). */
  primaryNav: string;
  /** Accessible name of the Navbar's menu button on a Mobile_Viewport (Req 7.9). */
  openMenu: string;
  /** Accessible name of the Mobile_Menu dialog (Req 7.10). */
  menuDialog: string;
  /** Accessible name of the Mobile_Menu close control (Req 7.13). */
  closeMenu: string;
  /** Contact_Form labels, errors and link names (Req 21). */
  contact: ContactUiText;
}

export interface ContactUiText {
  /** Visible field labels (Req 21.2). */
  nameLabel: string;
  emailLabel: string;
  messageLabel: string;
  /** Submit button label. */
  submit: string;
  /** Inline error messages, keyed by the `ContactErrorCode` returned by `validateContact` (Req 21.3). */
  errors: { required: string; email: string };
  /** Summary announced to assistive tech when a submit is blocked by validation (Req 21.3). */
  invalidSummary: string;
  /** Heading above the standalone contact links. */
  linksHeading: string;
  /** Accessible names for each contact link (destination named, Req 21.9, 22.2). */
  linkNames: { email: string; linkedin: string; github: string; resume: string };
  /** Visible label for the resume download link. */
  resumeLabel: string;
}

export const ui = {
  skipLink: "Skip to content",
  placeholder: "Placeholder",
  imageUnavailable: "Image unavailable",
  sectionLoadError: "This section couldn't be loaded.",
  contentLoadError: "This content couldn't be loaded.",
  retry: "Retry",
  loading: "Loading…",
  opensInNewTab: "(opens in new tab)",
  close: "Close",
  primaryNav: "Primary",
  openMenu: "Menu",
  menuDialog: "Site menu",
  closeMenu: "Close menu",
  contact: {
    nameLabel: "Name",
    emailLabel: "Email",
    messageLabel: "Message",
    submit: "Send message",
    errors: {
      required: "This field is required.",
      email: "Enter a valid email address.",
    },
    invalidSummary: "Please fix the highlighted fields and try again.",
    linksHeading: "Other ways to reach me",
    linkNames: {
      email: "Email Aishvarya Ramesh",
      linkedin: "LinkedIn profile",
      github: "GitHub profile",
      resume: "Download resume (PDF)",
    },
    resumeLabel: "Download resume",
  },
} satisfies UiText;
