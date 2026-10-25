// Cloud certifications (Req 18). The body renders exactly three `CertificationCard`s from
// `certifications.ts` in Req 18.1 order — a single row on a Desktop_Viewport and a stacked column
// on a Mobile_Viewport — over a faint cloud/network SVG at no more than 20% opacity that does not
// intercept pointer events (Req 18.6). The heading and anchor come from `SectionShell`, so they are
// prerendered (Req 3.2, 3.3); this body renders no heading of its own.
//
// SSR-safe: the content is static (cards and a decorative background), so the server and first
// client render produce identical DOM.
import { certifications } from "../../data/certifications";
import { CertificationCard } from "./CertificationCard";

/** Decorative cloud/network backdrop: ≤ 0.2 opacity, aria-hidden, no pointer events (Req 18.6). */
function CloudNetworkBackground() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 400 200"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.12] text-accent-cyan"
    >
      {/* Network: nodes joined by edges, suggesting a cloud topology. */}
      <g stroke="currentColor" strokeWidth="0.75" fill="none" opacity="0.7">
        <path d="M40 60 L120 40 L200 70 L300 50 L360 90" />
        <path d="M40 60 L110 120 L200 70 L280 140 L360 90" />
        <path d="M110 120 L200 150 L280 140" />
        <path d="M120 40 L200 150" />
      </g>
      <g fill="currentColor">
        {[
          [40, 60],
          [120, 40],
          [200, 70],
          [300, 50],
          [360, 90],
          [110, 120],
          [280, 140],
          [200, 150],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />
        ))}
      </g>
      {/* A simple cloud glyph behind the network. */}
      <path
        d="M150 110 a24 24 0 0 1 48 0 a18 18 0 0 1 2 36 h-70 a20 20 0 0 1 -4 -39 a20 20 0 0 1 24 3 z"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  );
}

export default function Certifications() {
  return (
    <div data-section-body="certifications" className="relative isolate">
      <CloudNetworkBackground />
      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-3">
        {certifications.map((cert) => (
          <CertificationCard key={cert.id} cert={cert} />
        ))}
      </ul>
    </div>
  );
}
