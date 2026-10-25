import type { ReactNode } from "react";

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** `span` (default) is valid inside phrasing content; use `div` for block content. */
  as?: "span" | "div";
  id?: string;
}

/** Content read by assistive technologies but not shown on screen (Tailwind `sr-only`). */
export function VisuallyHidden({ children, as: Tag = "span", id }: VisuallyHiddenProps) {
  return (
    <Tag id={id} className="sr-only">
      {children}
    </Tag>
  );
}
