import { create } from "zustand";

export type ConfirmRequest = {
  /** Noun used in the default copy, e.g. "hotspot". */
  subject: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export type ConfirmPrompt = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
};

type PendingConfirm = {
  prompt: ConfirmPrompt;
  resolve: (accepted: boolean) => void;
};

type ConfirmState = {
  current: ConfirmPrompt | null;
  ask: (input: string | ConfirmRequest) => Promise<boolean>;
  settle: (accepted: boolean) => void;
  dismissAll: () => void;
};

const queue: PendingConfirm[] = [];
let active: PendingConfirm | null = null;

function titleCaseSubject(subject: string): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}

export function resolveConfirmCopy(input: string | ConfirmRequest): ConfirmPrompt {
  const request = typeof input === "string" ? { subject: input } : input;
  const subject = request.subject.trim() || "item";
  return {
    title: request.title ?? `Delete ${subject}`,
    description:
      request.description ??
      `Are you sure you want to delete this ${subject}?`,
    confirmLabel: request.confirmLabel ?? "Delete",
    cancelLabel: request.cancelLabel ?? "Cancel",
  };
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  current: null,
  ask: (input) => {
    const prompt = resolveConfirmCopy(input);
    return new Promise((resolve) => {
      const pending: PendingConfirm = { prompt, resolve };
      if (active) {
        queue.push(pending);
        return;
      }
      active = pending;
      set({ current: prompt });
    });
  },
  settle: (accepted) => {
    if (!active) return;
    const pending = active;
    pending.resolve(accepted);
    const next = queue.shift() ?? null;
    active = next;
    set({ current: next?.prompt ?? null });
  },
  dismissAll: () => {
    const pending = [active, ...queue.splice(0)].filter(
      (item): item is PendingConfirm => item != null,
    );
    active = null;
    set({ current: null });
    for (const item of pending) item.resolve(false);
  },
}));

/** Ask before a destructive editor action. Resolves true when the user confirms. */
export function confirmDelete(input: string | ConfirmRequest): Promise<boolean> {
  return useConfirmStore.getState().ask(input);
}

/**
 * One item uses “this {singular}”. Several use “these {count} {plural}”.
 * Plural defaults to `{singular}s`.
 */
export function confirmDeleteMany(
  count: number,
  singular: string,
  plural = `${singular}s`,
): Promise<boolean> {
  if (count <= 1) return confirmDelete(singular);
  const label = titleCaseSubject(plural);
  return confirmDelete({
    subject: plural,
    title: `Delete ${label}`,
    description: `Are you sure you want to delete these ${count} ${plural}?`,
  });
}

export function confirmSettle(accepted: boolean) {
  useConfirmStore.getState().settle(accepted);
}
