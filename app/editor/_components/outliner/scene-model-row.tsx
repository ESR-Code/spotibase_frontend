"use client";

import { RefreshCw, Upload } from "lucide-react";
import { useRef } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { importGlbFile } from "@/lib/editor/io/import-glb";
import { useSceneStore } from "@/lib/editor/state/scene-store";

export function SceneModelRow() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelName = useSceneStore((s) => s.modelName);
  const modelInfo = useSceneStore((s) => s.modelInfo);
  const hasUserModel = useSceneStore((s) => s.hasUserModel);

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div
      className="px-3 py-2.5"
      style={{ borderBottom: "1px solid var(--editor-line-soft)" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importGlbFile(file);
          e.target.value = "";
        }}
      />

      {hasUserModel ? (
        <div className="flex items-center gap-2.5">
          <BoxIcon />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold">{modelName}</div>
            <div className="text-[10px]" style={{ color: "var(--editor-muted-2)" }}>
              {modelInfo}
            </div>
          </div>
          <button
            type="button"
            title="Replace model"
            aria-label="Replace model"
            onClick={openFilePicker}
            className="editor-replace-model-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.25} />
            Replace
          </button>
        </div>
      ) : (
        <EditorButton
          type="button"
          className="w-full justify-center text-[12.5px]"
          title="Import a .glb model"
          onClick={openFilePicker}
        >
          <Upload className="h-4 w-4" />
          Import Model
        </EditorButton>
      )}
    </div>
  );
}

function BoxIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ color: "var(--editor-amber)" }}
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}
