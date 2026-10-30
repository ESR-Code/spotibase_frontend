"use client";

import {
  Copy,
  ImageIcon,
  LayoutList,
  PanelRight,
  Settings2,
  Square,
  Trash2,
  Type,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/editor/toast";
import { ActionButtonsList } from "@/app/editor/_components/actions/hotspot-actions-tab";
import { HotspotBlocksTab } from "@/app/editor/_components/drawers/hotspot-blocks-tab";
import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { SettingsSection } from "@/app/editor/_components/ui/settings-section";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import { listHttpFieldSources } from "@/lib/editor/blocks/http-field-sources";
import {
  duplicateSceneDialog,
  listSceneDialogReferences,
  removeSceneDialog,
  updateSceneDialog,
  useActiveSceneDialog,
} from "@/lib/editor/dialogs/scene-dialogs";
import {
  clearEditorSelection,
  selectDialogExclusive,
} from "@/lib/editor/state/exclusive-selection";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { MarkerDialogSize } from "@/lib/editor/types/editor-settings";
import type {
  SceneDialog,
  SceneDialogPresentation,
} from "@/lib/editor/types/scene-dialog";

type DialogTab = "general" | "blocks" | "actions";

const TABS: { id: DialogTab; label: string; icon: typeof Settings2 }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "blocks", label: "Blocks", icon: LayoutList },
  { id: "actions", label: "Actions", icon: Workflow },
];

const PRESENTATIONS: {
  id: SceneDialogPresentation | null;
  label: string;
  icon?: typeof Square;
}[] = [
  { id: null, label: "Scene default" },
  { id: "modal", label: "Modal", icon: Square },
  { id: "drawer", label: "Drawer", icon: PanelRight },
];

const SIZES: { id: MarkerDialogSize | null; label: string }[] = [
  { id: null, label: "Scene default" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
  { id: "fullscreen", label: "Full screen" },
];

/** Editor drawer for a scene dialog (outliner Dialogs tab). */
export function DialogPropertiesDrawer() {
  const dialogId = useUIStore((s) => s.dialogEditorId);
  const isPreview = useEditorStore((s) => s.isPreview);
  const dialog = useActiveSceneDialog(dialogId);
  const open = dialog != null && !isPreview;
  const [tabState, setTabState] = useState<{
    dialogId: string | null;
    tab: DialogTab;
  }>({ dialogId, tab: "general" });

  const activeTab = tabState.dialogId === dialogId ? tabState.tab : "general";
  const setActiveTab = (tab: DialogTab) => setTabState({ dialogId, tab });

  return (
    <GlassPanel
      className={`editor-drawer editor-properties-drawer flex flex-col ${open ? "open" : ""}`}
      style={{ borderLeft: "1px solid var(--editor-line)" }}
    >
      {dialog ? (
        <>
          <div
            className="flex flex-shrink-0 items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--editor-line)" }}
          >
            <div className="min-w-0">
              <div className="font-display text-[15px] font-bold">Dialog Editor</div>
              <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
                Content shown by Open Modal nodes in this scene
              </div>
            </div>
            <IconButton title="Close" onClick={clearEditorSelection}>
              <X />
            </IconButton>
          </div>

          <div
            className="editor-panel-tabs flex-shrink-0"
            role="tablist"
            aria-label="Dialog editor panels"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`editor-panel-tab ${active ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="editor-settings-sections min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
            {activeTab === "general" ? (
              <DialogGeneralTab dialog={dialog} />
            ) : activeTab === "blocks" ? (
              <HotspotBlocksTab
                selected={dialog}
                fieldSources={listHttpFieldSources(dialog)}
                onChange={(blocks) => updateSceneDialog(dialog.id, { blocks })}
              />
            ) : (
              <DialogActionsTab dialog={dialog} />
            )}
          </div>

          <div
            className="flex flex-shrink-0 gap-2 p-4"
            style={{ borderTop: "1px solid var(--editor-line)" }}
          >
            <EditorButton
              className="flex-1"
              onClick={() => {
                const copy = duplicateSceneDialog(dialog.id);
                if (copy) {
                  selectDialogExclusive(copy.id);
                  toast.success("Dialog duplicated");
                }
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </EditorButton>
            <EditorButton
              className="flex-1"
              style={{ color: "#ff8a95", borderColor: "rgba(230,57,70,0.4)" }}
              onClick={() => {
                clearEditorSelection();
                removeSceneDialog(dialog.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </EditorButton>
          </div>
        </>
      ) : null}
    </GlassPanel>
  );
}

function DialogGeneralTab({ dialog }: { dialog: SceneDialog }) {
  const update = (patch: Partial<Omit<SceneDialog, "id">>) =>
    updateSceneDialog(dialog.id, patch);

  return (
    <div className="editor-general-tab space-y-2.5">
      <SettingsSection
        title="Title"
        icon={<Type className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            className="editor-input"
            placeholder="e.g. Welcome to the plant"
            value={dialog.title}
            onChange={(event) => update({ title: event.target.value })}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Presentation"
        icon={<PanelRight className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <div>
          <FieldLabel>Open as</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {PRESENTATIONS.map((mode) => {
              const Icon = mode.icon;
              return (
                <TypePill
                  key={mode.id ?? "default"}
                  active={(dialog.presentation ?? null) === mode.id}
                  onClick={() =>
                    update({ presentation: mode.id ?? undefined })
                  }
                >
                  {Icon ? <Icon className="mr-1 inline h-3 w-3" /> : null}
                  {mode.label}
                </TypePill>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Scene default follows the marker dialog setting. Info box falls back
            to Modal, since a dialog has no marker to anchor to.
          </p>
        </div>
        <div>
          <FieldLabel>Size</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((size) => (
              <TypePill
                key={size.id ?? "default"}
                active={(dialog.size ?? null) === size.id}
                onClick={() => update({ size: size.id ?? undefined })}
              >
                {size.label}
              </TypePill>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Header image"
        icon={<ImageIcon className="h-3.5 w-3.5" />}
      >
        <HotspotImageField
          layout="split"
          value={dialog.image}
          onChange={(image) => update({ image })}
          uploadLabel="Upload image"
          emptyLabel="No header image"
          hint="Optional. Shown at the top of the dialog."
          clearTitle="Clear header image"
          successMessage="Header image applied"
          urlInput={
            <input
              className="editor-input"
              placeholder="https://…"
              value={dialog.image}
              onChange={(event) => update({ image: event.target.value })}
            />
          }
        />
      </SettingsSection>
    </div>
  );
}

function DialogActionsTab({ dialog }: { dialog: SceneDialog }) {
  const openActionsModal = useUIStore((s) => s.openActionsModal);
  // Re-read on graph edits so the list stays current.
  useEditorStore((s) => s.hotspots);
  useScenesStore((s) => s.scenes);
  useSettingsStore((s) => s.customMenuButtons);
  const refs = listSceneDialogReferences(dialog.id);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div
        className="rounded-lg px-4 py-4"
        style={{
          border: "1px solid var(--editor-line-soft)",
          background: "rgba(11,20,36,0.35)",
        }}
      >
        <div className="mb-1 text-[12px] font-semibold">Opened by</div>
        {refs.length === 0 ? (
          <div className="text-[11px]" style={{ color: "var(--editor-amber)" }}>
            Nothing opens this dialog yet. Add an Open Modal node (for example on
            Scene Start or a menu button) and pick this dialog.
          </div>
        ) : (
          <ul className="space-y-1">
            {refs.map((ref) => (
              <li key={ref.ownerId} className="truncate text-[12px] font-medium">
                {ref.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditorButton
        variant="primary"
        className="w-full justify-center"
        onClick={() => openActionsModal({ kind: "scene" })}
      >
        <Workflow className="h-3.5 w-3.5" />
        Open Scene Actions
      </EditorButton>

      <ActionButtonsList
        blocks={dialog.blocks}
        description="Buttons in this dialog. Each has its own lane on the Scene Actions canvas."
        onEditActions={(ownerId) =>
          openActionsModal({ kind: "scene", focusOwnerId: ownerId })
        }
      />
    </div>
  );
}
