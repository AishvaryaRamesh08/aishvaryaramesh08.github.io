/**
 * Contact section copy, Web3Forms key and contact links (Req 21). The links are shared with the
 * Footer (Req 22.2) and the Terminal_Widget `contact` command (Req 24.3).
 *
 * No phone number appears here or anywhere else in the Content_Config (Req 21.10).
 */
import type { ContactConfig } from "./types";

export const contact = {
  headline: "Let's connect.",
  // web3formsAccessKey: public by design (Req 21.12). Not set yet, so the section shows the mailto
  // fallback and sends nothing to Web3Forms (Req 21.8). Set it here or via VITE_WEB3FORMS_KEY.
  subject: "New message from aishvaryaramesh08.github.io",
  limits: { name: 100, email: 254, message: 5000 },
  messages: {
    sending: "Sending…",
    success: "Thanks, your message is on its way. I'll reply by email.",
    error: "Your message didn't go through. Your text is still here, so you can try again or email me directly.",
    mailtoLabel: "Email me instead",
  },
  links: {
    email: "mailto:Aishvarya.ramesh@tamu.edu",
    linkedin: "https://www.linkedin.com/in/aishvarya-ramesh",
    github: "https://github.com/AishvaryaRamesh08",
    // Place the PDF at public/resume/ and replace this with e.g. "resume/aishvarya-ramesh-resume.pdf".
    resumePdf: { placeholder: true, expected: "resume PDF" },
  },
} satisfies ContactConfig;
