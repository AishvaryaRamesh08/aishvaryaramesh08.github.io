// Light example tests for the Cloud certifications section (Req 18). The full unit suite is task
// 15.3 and the Verify-enablement property test is task 15.2; these cover the non-obvious contracts:
// exactly three cards render in `certifications.ts` order with no heading of their own, an enabled
// Verify link opens in a new tab with the safe rel, and a card without a credential URL renders a
// disabled "pending" marker with no href (Req 18.1, 18.3, 18.4).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { certifications } from "../../data/certifications";
import { CertificationCard } from "./CertificationCard";
import { certificationsCopy } from "./copy";
import { isVerifyEnabled } from "./verify";
import Certifications from "./Certifications";

describe("Certifications", () => {
  it("renders exactly three cards in certifications.ts order and no heading of its own", () => {
    render(<Certifications />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(certifications.length);
    expect(certifications).toHaveLength(3);
    certifications.forEach((cert, index) => {
      expect(items[index]).toHaveTextContent(cert.name);
    });

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });

  it("renders a disabled pending marker (no href) when the credential URL is absent (Req 18.4)", () => {
    const cert = { ...certifications[0], credentialUrl: undefined };
    render(
      <ul>
        <CertificationCard cert={cert} />
      </ul>,
    );

    const pending = screen.getByRole("link", { name: certificationsCopy.pendingLabel(cert.name) });
    expect(pending).toHaveAttribute("aria-disabled", "true");
    expect(pending).not.toHaveAttribute("href");
    expect(isVerifyEnabled(cert)).toBe(false);
  });

  it("renders an enabled Verify link opening a new tab with the safe rel (Req 18.3)", () => {
    const cert = { ...certifications[0], credentialUrl: "https://example.com/verify/123" };
    render(
      <ul>
        <CertificationCard cert={cert} />
      </ul>,
    );

    const link = screen.getByRole("link", { name: new RegExp(`^${certificationsCopy.verify} `) });
    expect(link).toHaveAttribute("href", cert.credentialUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(isVerifyEnabled(cert)).toBe(true);
  });
});
