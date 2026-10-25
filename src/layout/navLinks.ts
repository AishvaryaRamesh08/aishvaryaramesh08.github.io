// Navbar / Mobile_Menu link model (Req 7.2): one link per Nav_Group, in Content_Config order,
// targeting the group's first section. Shared so both menus stay identical.
import type { MouseEvent } from "react";
import { site } from "../data/site";
import type { NavGroupId, SectionId } from "../data/types";

export interface NavLink {
  id: NavGroupId;
  label: string;
  /** The first section of the Nav_Group: the scroll and focus target. */
  target: SectionId;
  /** `${BASE_URL}#target`, so the link still works without JavaScript or in a new tab. */
  href: string;
}

const BASE_URL = import.meta.env.BASE_URL;

export const NAV_LINKS: readonly NavLink[] = site.navGroups.map((group) => ({
  id: group.id,
  label: group.label,
  target: group.sections[0],
  href: `${BASE_URL}#${group.sections[0]}`,
}));

/** Site home; the logo link points here. */
export const HOME_HREF = BASE_URL;

/** ID of the Hook_Screen section, the logo's scroll target and the Navbar transparency trigger. */
export const HOOK_ID: SectionId = "hook";

/**
 * True for an unmodified primary-button click, the only kind the menus intercept: modified
 * clicks (new tab, new window, download) keep the browser's default link behaviour.
 */
export function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
