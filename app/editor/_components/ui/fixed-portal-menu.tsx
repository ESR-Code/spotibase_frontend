"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type FixedMenuPosition = {
  top: number;
  left: number;
};

export function getEditorPortalHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    (document.querySelector(".editor-root") as HTMLElement | null) ??
    document.body
  );
}

export function useFixedMenuPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  options?: {
    align?: "left" | "right";
    gap?: number;
  },
): FixedMenuPosition | null {
  const align = options?.align ?? "right";
  const gap = options?.gap ?? 4;
  const [pos, setPos] = useState<FixedMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menu = menuRef.current;
      const width = menu?.offsetWidth || 260;
      const height = menu?.offsetHeight || 260;
      let left = align === "right" ? rect.right - width : rect.left;
      left = Math.min(
        Math.max(12, left),
        Math.max(12, window.innerWidth - width - 12),
      );
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUpward = spaceBelow < height && spaceAbove > spaceBelow;
      let top = openUpward ? rect.top - gap - height : rect.bottom + gap;
      top = Math.min(
        Math.max(12, top),
        Math.max(12, window.innerHeight - height - 12),
      );
      setPos({ top, left });
    };

    update();
    const raf = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, triggerRef, menuRef, align, gap]);

  return pos;
}
