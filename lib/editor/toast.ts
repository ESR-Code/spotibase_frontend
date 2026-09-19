import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export type ToastOptions = {
  description?: string;
  /** Milliseconds. `0` keeps the toast until dismissed. */
  duration?: number;
};

export type EditorToast = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
  leaving: boolean;
};

const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 5500;
const EXIT_MS = 220;
const MAX_TOASTS = 4;

function createToastId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultDuration(variant: ToastVariant, duration?: number): number {
  if (duration !== undefined) return duration;
  return variant === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS;
}

type ToastState = {
  toasts: EditorToast[];
  push: (toast: Omit<EditorToast, "id" | "leaving"> & { id?: string }) => string;
  dismiss: (id?: string) => void;
};

const exitTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearExitTimer(id: string) {
  const timer = exitTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    exitTimers.delete(id);
  }
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (input) => {
    const id = input.id ?? createToastId();
    clearExitTimer(id);
    const next: EditorToast = {
      id,
      variant: input.variant,
      title: input.title,
      description: input.description,
      duration: input.duration,
      leaving: false,
    };
    set((state) => {
      const without = state.toasts.filter((toast) => toast.id !== id);
      const overflow = without.length + 1 - MAX_TOASTS;
      const kept = overflow > 0 ? without.slice(overflow) : without;
      return { toasts: [...kept, next] };
    });
    return id;
  },
  dismiss: (id) => {
    const targets = id
      ? get().toasts.filter((toast) => toast.id === id)
      : get().toasts;
    if (targets.length === 0) return;

    set((state) => ({
      toasts: state.toasts.map((toast) =>
        targets.some((target) => target.id === toast.id)
          ? { ...toast, leaving: true }
          : toast,
      ),
    }));

    for (const toast of targets) {
      clearExitTimer(toast.id);
      exitTimers.set(
        toast.id,
        setTimeout(() => {
          exitTimers.delete(toast.id);
          set((state) => ({
            toasts: state.toasts.filter((item) => item.id !== toast.id),
          }));
        }, EXIT_MS),
      );
    }
  },
}));

function show(
  variant: ToastVariant,
  title: string,
  options?: ToastOptions,
): string {
  return useToastStore.getState().push({
    variant,
    title,
    description: options?.description,
    duration: defaultDuration(variant, options?.duration),
  });
}

type ToastApi = {
  (title: string, options?: ToastOptions): string;
  success: (title: string, options?: ToastOptions) => string;
  error: (title: string, options?: ToastOptions) => string;
  message: (title: string, options?: ToastOptions) => string;
  dismiss: (id?: string) => void;
};

export const toast: ToastApi = Object.assign(
  (title: string, options?: ToastOptions) => show("info", title, options),
  {
    success: (title: string, options?: ToastOptions) =>
      show("success", title, options),
    error: (title: string, options?: ToastOptions) =>
      show("error", title, options),
    message: (title: string, options?: ToastOptions) =>
      show("info", title, options),
    dismiss: (id?: string) => useToastStore.getState().dismiss(id),
  },
);
