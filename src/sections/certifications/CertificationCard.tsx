// A single Certification_Card (Req 18.2, 18.4, 18.5, 18.7, 18.8). Each card is a `GlassCard` that
// shows the issuer logo (a real `FixedImage` or a same-size `PlaceholderAsset`, so a missing or
// broken logo never shifts the layout — Req 18.7), the certification name, the "what this means for
// my work" line (Req 18.2), and a Verify control.
//
// The Verify control is an `ExternalLink` opening the credential URL in a new tab with
// rel="noopener noreferrer" (Req 18.3) only when `isVerifyEnabled(cert)` is true; otherwise it
// renders as a disabled, pending marker exposed to assistive tech with aria-disabled and no href,
// performing no navigation (Req 18.4).
//
// Hover/focus plays a lift animation that settles within 300 ms each way; under Reduced_Motion_Mode
// the animation is dropped while the visible focus ring is kept (Req 18.5, 18.8). SSR-safe: the
// server and first client render produce identical DOM (motion starts in its resting state).
import { motion } from "framer-motion";
import { Badge } from "../../components/Chip";
import { ExternalLink } from "../../components/ExternalLink";
import { FixedImage } from "../../components/FixedImage";
import { GlassCard } from "../../components/GlassCard";
import { useMotionMode } from "../../hooks/motionStore";
import { isPlaceholder, type Certification } from "../../data/types";
import { certificationsCopy } from "./copy";
import { isVerifyEnabled } from "./verify";

/** Hover/focus lift must complete within 300 ms each way (Req 18.5). */
const HOVER_DURATION_S = 0.2;

export interface CertificationCardProps {
  cert: Certification;
}

/** The issuer logo, named for the issuer, kept at the same box whether real, placeholder, or broken (Req 18.2, 18.7). */
function IssuerLogo({ cert }: { cert: Certification }) {
  const logo = cert.logo;
  // A placeholder keeps its declared width/height; a real asset's alt is ensured to name the issuer
  // (Req 18.2). In both cases `FixedImage` renders the fixed box and falls back to the same-size box
  // on a load error, so the layout never shifts (Req 18.7).
  const image = isPlaceholder(logo) ? logo : { ...logo, alt: logo.alt || `${cert.issuer} logo` };
  return <FixedImage image={image} />;
}

/** The Verify control: an enabled new-tab link, or a disabled "pending" marker (Req 18.3, 18.4). */
function VerifyControl({ cert }: { cert: Certification }) {
  if (isVerifyEnabled(cert) && cert.credentialUrl !== undefined) {
    return (
      <ExternalLink
        href={cert.credentialUrl}
        aria-label={certificationsCopy.verifyLabel(cert.name)}
        className="inline-flex min-h-11 items-center rounded-pill border border-accent-cyan bg-surface px-5 font-mono text-sm text-accent-cyan-text hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
      >
        {certificationsCopy.verify}
      </ExternalLink>
    );
  }
  // Disabled "pending" state: a role="link" with no href performs no navigation on click or
  // keyboard, and aria-disabled exposes it as disabled to assistive tech (Req 18.4).
  return (
    <span
      role="link"
      aria-disabled="true"
      data-verify="pending"
      aria-label={certificationsCopy.pendingLabel(cert.name)}
      className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-pill border border-dashed border-border-strong bg-surface-2 px-4 font-mono text-sm text-text-muted"
    >
      <Badge tone="neutral">{certificationsCopy.pending}</Badge>
    </span>
  );
}

export function CertificationCard({ cert }: CertificationCardProps) {
  const reduced = useMotionMode() === "reduced";

  return (
    <GlassCard
      as="li"
      className="h-full"
    >
      <motion.div
        // Lift on hover and keyboard focus, settling within 300 ms each way (Req 18.5). Motion is
        // visual only; under Reduced_Motion_Mode no animation runs, but the focus ring on the inner
        // interactive elements is unaffected (Req 18.8).
        initial={false}
        whileHover={reduced ? undefined : { y: -6 }}
        whileFocus={reduced ? undefined : { y: -6 }}
        transition={reduced ? undefined : { duration: HOVER_DURATION_S, ease: "easeOut" }}
        className="flex h-full flex-col items-start gap-4 p-5"
      >
        <IssuerLogo cert={cert} />
        <h3 className="font-heading text-lg font-semibold text-pretty text-text">{cert.name}</h3>
        <p className="m-0 max-w-prose flex-1 text-sm text-pretty text-text-muted">{cert.meaning}</p>
        <VerifyControl cert={cert} />
      </motion.div>
    </GlassCard>
  );
}
