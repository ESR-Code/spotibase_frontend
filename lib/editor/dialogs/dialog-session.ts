/**
 * Scene dialogs already shown in this Preview session (for "Show once per
 * session"). Module-level, not authored: entering or leaving Preview resets it.
 * A future viewer would back this with `sessionStorage`.
 */
const shownDialogIds = new Set<string>();

export function wasSceneDialogShown(id: string): boolean {
  return shownDialogIds.has(id);
}

export function markSceneDialogShown(id: string): void {
  shownDialogIds.add(id);
}

export function resetSceneDialogSession(): void {
  shownDialogIds.clear();
}
