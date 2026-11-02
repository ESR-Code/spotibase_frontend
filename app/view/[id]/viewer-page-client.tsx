"use client";

import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";

const ViewerApp = dynamic(
  () => import("@/app/view/_components/viewer-app").then((mod) => mod.ViewerApp),
  {
    ssr: false,
    loading: () => (
      <div
        className="editor-root flex h-dvh items-center justify-center"
        style={{ background: "#0b1424", color: "#8a98b8" }}
      >
        Loading tour…
      </div>
    ),
  },
);

export function ViewerPageClient() {
  const { id } = useParams<{ id: string }>();
  const sceneSlug = useSearchParams().get("scene");
  return <ViewerApp key={id} projectId={id} sceneSlug={sceneSlug} />;
}
