"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { confirmDelete } from "@/lib/editor/confirm";
import {
  hasUnsavedChanges,
  useProjectPersistStore,
} from "@/lib/editor/persist/persist-store";

const LEAVE_PROMPT = {
  subject: "changes",
  title: "Leave without saving?",
  description:
    "You have unsaved changes. If you leave now they will be lost.",
  confirmLabel: "Leave",
  cancelLabel: "Stay",
} as const;

/**
 * `beforeunload` only covers closing / reloading the tab. This covers in-app
 * exits: clicks on any link that leaves the editor (header, brand, account
 * menu) and the browser Back button, by asking before unsaved work is dropped.
 */
export function useLeaveGuard() {
  const router = useRouter();

  useEffect(() => {
    let leaving = false;
    let sentinelPushed = false;
    let asking = false;

    const onClickCapture = (e: MouseEvent) => {
      if (leaving || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      if (!hasUnsavedChanges()) return;

      e.preventDefault();
      e.stopPropagation();
      if (asking) return;
      asking = true;
      void confirmDelete(LEAVE_PROMPT).then((ok) => {
        asking = false;
        if (!ok) return;
        leaving = true;
        router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };

    // Back: once the project has unsaved changes, put one extra entry for the
    // same URL on the history stack so Back lands on it first and can be asked.
    const pushSentinel = () => {
      if (sentinelPushed) return;
      sentinelPushed = true;
      window.history.pushState(window.history.state, "", window.location.href);
    };

    const onPopState = () => {
      if (leaving || !sentinelPushed) return;
      if (!hasUnsavedChanges()) {
        leaving = true;
        window.history.back();
        return;
      }
      // Stay: restore the sentinel entry Back just consumed.
      sentinelPushed = false;
      pushSentinel();
      if (asking) return;
      asking = true;
      void confirmDelete(LEAVE_PROMPT).then((ok) => {
        asking = false;
        if (!ok) return;
        leaving = true;
        window.history.back();
      });
    };

    const unsubscribe = useProjectPersistStore.subscribe((state) => {
      if (state.dirty) pushSentinel();
    });

    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      unsubscribe();
      window.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [router]);
}
