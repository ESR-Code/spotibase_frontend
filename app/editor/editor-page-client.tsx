"use client";

import dynamic from "next/dynamic";

const EditorApp = dynamic(
  () =>
    import("@/app/editor/_components/editor-app").then((mod) => mod.EditorApp),
  {
    ssr: false,
    loading: () => (
      <div
        className="editor-root flex h-full items-center justify-center"
        style={{ background: "#0b1424", color: "#eef1f8" }}
      >
        Loading editor...
      </div>
    ),
  },
);

export function EditorPageClient() {
  return <EditorApp />;
}
