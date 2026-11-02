import { Suspense } from "react";
import { ViewerPageClient } from "@/app/view/[id]/viewer-page-client";

/**
 * Public viewer for a published project. A static shell: the server never
 * fetches project data, so serving a view costs no server work beyond the
 * cached HTML. Everything (snapshot, password, files) loads client-side.
 */

// Render each /view/<id> once on first visit, then serve it as static HTML.
export function generateStaticParams() {
  return [];
}

export default function ViewerPage() {
  return (
    // `useSearchParams` (?scene=) renders client-side below this boundary.
    <Suspense fallback={<ViewerLoadingFallback />}>
      <ViewerPageClient />
    </Suspense>
  );
}

function ViewerLoadingFallback() {
  return (
    <div
      className="editor-root flex h-dvh items-center justify-center"
      style={{ background: "#0b1424", color: "#8a98b8" }}
    >
      Loading tour…
    </div>
  );
}
