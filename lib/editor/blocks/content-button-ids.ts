/**
 * Synthetic owner ids for Action button blocks (−5000 down to −9999).
 * Must stay above MENU_BUTTON_OWNER_BASE (−10000). This file has no store
 * imports so spawn-template parsing cannot cycle through create-action-graph.
 */
export const CONTENT_BUTTON_OWNER_BASE = -5000;

/** Same value as MENU_BUTTON_OWNER_BASE in custom-menu-buttons.ts. */
const MENU_BUTTON_OWNER_FLOOR = -10000;

export function isContentButtonOwnerId(ownerId: number): boolean {
  return ownerId <= CONTENT_BUTTON_OWNER_BASE && ownerId > MENU_BUTTON_OWNER_FLOOR;
}
