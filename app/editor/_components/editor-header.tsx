"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/app/projects/_components/account-menu";
import { BrandMark } from "@/app/projects/_components/projects-topbar";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { HeaderNavMenu } from "@/app/editor/_components/toolbar/header-nav-menu";
import { ModeToolbar } from "@/app/editor/_components/toolbar/mode-toolbar";
import { SaveButton } from "@/app/editor/_components/toolbar/save-button";
import { useProjectPersistStore } from "@/lib/editor/persist/persist-store";
import { getSceneType } from "@/lib/editor/scene-types/registry";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useActiveScene } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { PROJECT_NAME } from "@/lib/editor/theme/tokens";

export function EditorHeader() {
  const activeScene = useActiveScene();
  const sceneTypeLabel = getSceneType(activeScene.type).label;
  const projectName = useProjectPersistStore((s) => s.projectName) || PROJECT_NAME;
  const isPreview = useEditorStore((s) => s.isPreview);
  const setScenesModalOpen = useUIStore((s) => s.setScenesModalOpen);
  const setGeneralSettingsDrawerOpen = useUIStore(
    (s) => s.setGeneralSettingsDrawerOpen,
  );

  return (
    <header className="z-20 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-[var(--studio-line)] bg-[rgba(9,15,31,0.86)] px-5 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0">
          <BrandMark />
        </div>
        <div className="editor-vsep" />
        <HeaderNavMenu />
        <nav
          aria-label="Project"
          className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold"
        >
          <Link
            href="/projects"
            title={projectName}
            className="min-w-0 truncate rounded-md px-1 py-0.5 hover:bg-white/5 hover:underline"
          >
            {projectName}
          </Link>
          <span className="shrink-0" style={{ color: "var(--editor-muted-2)" }}>
            ›
          </span>
          <button
            type="button"
            title={
              isPreview
                ? "Exit Preview to switch scenes"
                : `Switch scene · ${activeScene.name}`
            }
            disabled={isPreview}
            className="flex min-w-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-left hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            onClick={() => {
              setGeneralSettingsDrawerOpen(false);
              setScenesModalOpen(true);
            }}
          >
            <span className="truncate">{activeScene.name}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--editor-muted-2)" }} />
          </button>
          <EditorChip
            className="ml-0.5 hidden shrink-0 sm:inline-flex"
            style={{
              color: "var(--editor-teal)",
              borderColor: "rgba(63,184,175,0.3)",
            }}
          >
            {sceneTypeLabel}
          </EditorChip>
        </nav>
      </div>

      <ModeToolbar />

      <div className="flex min-w-0 items-center justify-end gap-3">
        <SaveButton />
        <div className="editor-vsep" />
        <AccountMenu />
      </div>
    </header>
  );
}
