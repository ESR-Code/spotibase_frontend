"use client";

import { Upload } from "lucide-react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { toast } from "@/lib/editor/toast";

/** Placeholder until publishing exists. */
export function PublishButton() {
  return (
    <EditorButton
      variant="outline"
      className="h-8 gap-1.5 px-3 text-[12px]"
      title="Publishing is coming soon"
      onClick={() => toast.message("Publishing is coming soon")}
    >
      <Upload className="h-3.5 w-3.5" />
      Publish
    </EditorButton>
  );
}
