"use client";

import { AccountMenu } from "@/app/projects/_components/account-menu";
import { BrandMark } from "@/app/projects/_components/projects-topbar";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { ModeToolbar } from "@/app/editor/_components/toolbar/mode-toolbar";
import { SaveButton } from "@/app/editor/_components/toolbar/save-button";
import { useProjectPersistStore } from "@/lib/editor/persist/persist-store";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { PROJECT_NAME } from "@/lib/editor/theme/tokens";

export function EditorHeader() {
  const activeScene = useActiveScene();
  const sceneTypeLabel = getSceneType(activeScene.type).label;
  const projectName = useProjectPersistStore((s) => s.projectName) || PROJECT_NAME;

  return (
    <header className="z-20 flex items-center gap-4 border-b border-[var(--studio-line)] bg-[rgba(9,15,31,0.86)] px-5 py-3 backdrop-blur-xl">
      <BrandMark />

      <div className="editor-vsep" />

      <div className="hidden items-center gap-3 md:flex">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="truncate">{projectName}</span>
          <span style={{ color: "var(--editor-muted-2)" }}>›</span>
          <span className="truncate">{activeScene.name}</span>
          <EditorChip
            style={{
              color: "var(--editor-teal)",
              borderColor: "rgba(63,184,175,0.3)",
            }}
          >
            {sceneTypeLabel}
          </EditorChip>
        </div>
      </div>

      <div className="flex flex-1 justify-center">
        <ModeToolbar />
      </div>

      <SaveButton />

      <div className="editor-vsep" />

      <AccountMenu />
    </header>
  );
}
