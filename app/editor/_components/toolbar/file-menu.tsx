"use client";

import { ChevronDown, FolderOpen, Upload } from "lucide-react";
import { useRef } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { importGlbFile } from "@/lib/editor/io/import-glb";
import { useUIStore } from "@/lib/editor/state/ui-store";

export function FileMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuOpen = useUIStore((s) => s.fileMenuOpen);
  const setFileMenuOpen = useUIStore((s) => s.setFileMenuOpen);

  const handleImport = () => {
    setFileMenuOpen(false);
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
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
      <EditorButton
        type="button"
        aria-haspopup="true"
        aria-expanded={fileMenuOpen}
        onClick={() => setFileMenuOpen(!fileMenuOpen)}
      >
        <FolderOpen className="h-4 w-4" />
        File
        <ChevronDown className="h-2.5 w-2.5 opacity-70" />
      </EditorButton>
      {fileMenuOpen && (
        <div className="editor-file-menu">
          <button type="button" onClick={handleImport}>
            <span className="inline-block w-[18px] text-center text-[var(--editor-muted)]">
              <Upload className="mx-auto h-4 w-4" />
            </span>
            Import Model
          </button>
        </div>
      )}
    </div>
  );
}
