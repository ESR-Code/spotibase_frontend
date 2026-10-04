"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const EditorProjectLoader = dynamic(
  () =>
    import("@/app/editor/_components/editor-project-loader").then(
      (mod) => mod.EditorProjectLoader,
    ),
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
  const { id } = useParams<{ id: string }>();
  return <EditorProjectLoader key={id} projectId={id} />;
}
