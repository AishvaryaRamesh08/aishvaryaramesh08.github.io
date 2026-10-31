// Covers certification order and the optional Verify link behavior.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { certifications } from "../../data/certifications";
import { CertificationCard } from "./CertificationCard";
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

  it("omits Verify when the credential URL is absent", () => {
    const cert = { ...certifications[0], credentialUrl: undefined };
    render(
      <ul>
        <CertificationCard cert={cert} />
      </ul>,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(isVerifyEnabled(cert)).toBe(false);
  });

  it("renders an enabled Verify link opening a new tab with the safe rel (Req 18.3)", () => {
    const cert = { ...certifications[0], credentialUrl: "https://example.com/verify/123" };
    render(
      <ul>
        <CertificationCard cert={cert} />
      </ul>,
    );

    const link = screen.getByRole("link", { name: /^Verify/ });
    expect(link).toHaveAttribute("href", cert.credentialUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(isVerifyEnabled(cert)).toBe(true);
  });
});
