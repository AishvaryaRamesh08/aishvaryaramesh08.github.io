// Pure Verify-link enablement rule for the Certification_Cards (Req 18.4, Property 44).
//
// A card's Verify link is interactive only when its credential URL is an absolute https:// URL;
// a missing, empty, relative, or non-https value renders the link as a disabled "pending" marker
// instead (Req 18.4). The decision is isolated here as a pure function so both the component and
// the property test can share one source of truth.
import type { Certification } from "../../data/types";
import { isHttpsUrl } from "../../lib/url";

/** True when the certification's credential URL is a real, verifiable https:// link (Req 18.4). */
export function isVerifyEnabled(cert: Pick<Certification, "credentialUrl">): boolean {
  return isHttpsUrl(cert.credentialUrl);
}
