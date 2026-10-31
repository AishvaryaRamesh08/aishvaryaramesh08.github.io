// Verify links are shown only for absolute https:// credential URLs.
import type { Certification } from "../../data/types";
import { isHttpsUrl } from "../../lib/url";

/** True when the certification's credential URL is an absolute https:// URL. */
export function isVerifyEnabled(cert: Pick<Certification, "credentialUrl">): boolean {
  return isHttpsUrl(cert.credentialUrl);
}
