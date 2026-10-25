// Inline SVG <symbol> set for the Background_Layer.
// Line icons on a 24 × 24 grid, stroked with `currentColor` so they follow the Theme tokens.
import type { ReactNode } from "react";
import type { IconKind } from "./scene";

/** Element ID of the `<symbol>` for an icon kind, referenced with `<use href>`. */
export function iconSymbolId(kind: IconKind): string {
  return `bg-icon-${kind}`;
}

const MONO = "JetBrains Mono, JetBrains Mono Fallback, ui-monospace, monospace";

/** Small key label ("PK" / "FK") in JetBrains Mono (Req 5.10: terminal-style labels). */
function KeyLabel({ text }: { text: string }) {
  return (
    <text x="2" y="22.5" fontSize="6.5" fontFamily={MONO} fill="currentColor" stroke="none">
      {text}
    </text>
  );
}

const SYMBOLS: Readonly<Record<IconKind, ReactNode>> = {
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M3 14.5h18M9 9v11M15 9v11" />
    </>
  ),
  "key-pk": (
    <>
      <circle cx="7" cy="9" r="4" />
      <path d="M11 9h10M17.5 9v3M20.5 9v2.5" />
      <KeyLabel text="PK" />
    </>
  ),
  "key-fk": (
    <>
      <circle cx="7" cy="9" r="4" />
      <circle cx="7" cy="9" r="1.5" />
      <path d="M11 9h10M18 9v3" strokeDasharray="2 1.5" />
      <KeyLabel text="FK" />
    </>
  ),
  schema: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 8h18M6.5 12h8M6.5 16h10" />
    </>
  ),
  cloud: (
    <>
      <path d="M7 19h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 10.3 4.4 4.4 0 0 0 7 19z" />
      <path d="M12 12v5M10 15l2 2 2-2" />
    </>
  ),
  warehouse: (
    <>
      <path d="M3 10l9-6 9 6v10H3z" />
      <path d="M7 20v-6h10v6M7 17h10" />
    </>
  ),
  lakehouse: (
    <>
      <path d="M5 12l7-5 7 5v4H5z" />
      <path d="M2 19.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
    </>
  ),
};

/** Hidden `<svg>` holding the symbol definitions. */
export function BackgroundSymbols() {
  return (
    <svg width="0" height="0" focusable="false" className="absolute" data-bg-symbols="">
      <defs>
        {(Object.keys(SYMBOLS) as IconKind[]).map((kind) => (
          <symbol
            key={kind}
            id={iconSymbolId(kind)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {SYMBOLS[kind]}
          </symbol>
        ))}
      </defs>
    </svg>
  );
}
