"use client";

import { Toaster } from "sonner";
import { EditorShell } from "@/app/editor/_components/editor-shell";

export function EditorApp() {
  return (
    <>
      <EditorShell />
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: "editor-glass editor-panel-shadow border border-[var(--editor-line)] text-[var(--editor-fg)]",
          },
        }}
      />
    </>
  );
}
