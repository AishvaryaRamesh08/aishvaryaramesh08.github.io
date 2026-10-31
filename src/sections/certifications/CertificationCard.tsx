import { ExternalLink } from "../../components/ExternalLink";
import { FixedImage } from "../../components/FixedImage";
import type { Certification } from "../../data/types";
import { isVerifyEnabled } from "./verify";

export interface CertificationCardProps {
  cert: Certification;
}

export function CertificationCard({ cert }: CertificationCardProps) {
  return (
    <li className="flex min-w-0 flex-col items-start gap-3 rounded-xl border border-border bg-surface p-5">
      {cert.badgeImage ? <FixedImage image={cert.badgeImage} /> : null}
      <p className="m-0 font-mono text-xs uppercase tracking-wide text-text-muted">{cert.issuer}</p>
      <h4 className="m-0 font-heading text-base font-semibold leading-snug text-text">{cert.name}</h4>
      <p className="m-0 flex-1 text-sm leading-relaxed text-text-muted">{cert.description}</p>
      {isVerifyEnabled(cert) && cert.credentialUrl ? (
        <ExternalLink
          href={cert.credentialUrl}
          className="inline-flex min-h-11 items-center rounded-pill border border-border-strong px-4 font-mono text-sm text-accent-cyan-text hover:border-accent-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
        >
          Verify
        </ExternalLink>
      ) : null}
    </li>
  );
}
