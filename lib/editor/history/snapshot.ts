import {
  history,
  type HistoryEntry,
} from "@/lib/editor/history/history-store";
import { toast } from "@/lib/editor/toast";

const UNDO_TOAST_MS = 6000;

/** Toast with an Undo button; it only undoes `entry` while it is the latest change. */
export function toastUndo(
  scope: string,
  entry: HistoryEntry,
  message: string,
): void {
  toast(message, {
    duration: UNDO_TOAST_MS,
    action: {
      label: "Undo",
      onClick: () => {
        if (!history.undoEntry(scope, entry)) {
          toast.message("Can't undo — newer changes were made");
        }
      },
    },
  });
}

type SnapshotChange<S> = {
  scope: string;
  label: string;
  before: S;
  after: S;
  /**
   * Write `target` back to the stores. `other` is the opposite state, so
   * restore can tell what to remove as well as what to put back.
   */
  restore: (target: S, other: S) => void;
  /** When set, also shows an Undo toast with this message. */
  toast?: string;
};

/**
 * Record a change described by two JSON-serialisable snapshots.
 * Skips no-ops. Returns the entry, or null when nothing changed.
 */
export function recordSnapshotChange<S>(
  change: SnapshotChange<S>,
): HistoryEntry | null {
  const { scope, label, before, after, restore } = change;
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  const entry: HistoryEntry = {
    label,
    undo: () => restore(before, after),
    redo: () => restore(after, before),
  };
  history.record(scope, entry);
  if (change.toast) toastUndo(scope, entry, change.toast);
  return entry;
}

/** Capture, apply the mutation, capture again, record. */
export function runSnapshotChange<S>(
  change: Omit<SnapshotChange<S>, "before" | "after"> & {
    capture: () => S;
    apply: () => void;
  },
): HistoryEntry | null {
  const before = change.capture();
  change.apply();
  return recordSnapshotChange({ ...change, before, after: change.capture() });
}
