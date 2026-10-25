// Visitor-visible microcopy for the Cloud certifications section (Req 4.1): kept out of component
// source so no hard-coded string ships in JSX. The Verify link's accessible name is built from the
// certification name so assistive tech can tell the three links apart (Req 18.2).

export interface CertificationsCopy {
  /** Visible label of an enabled Verify link. */
  verify: string;
  /** Builds the accessible name of a Verify link, e.g. "Verify Microsoft Certified – Azure Fundamentals" (Req 18.2). */
  verifyLabel: (certName: string) => string;
  /** Visible text of a disabled Verify link whose credential URL is not yet supplied (Req 18.4). */
  pending: string;
  /** Accessible description of the pending state, so the disabled control explains itself. */
  pendingLabel: (certName: string) => string;
}

export const certificationsCopy = {
  verify: "Verify",
  verifyLabel: (certName) => `Verify ${certName}`,
  pending: "Verification pending",
  pendingLabel: (certName) => `Verification pending for ${certName}`,
} satisfies CertificationsCopy;
