"use client";

import { Layers, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { cloneCameraResetPosition } from "@/lib/editor/constants/default-settings";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import {
  readEnvironmentSnapshot,
} from "@/lib/editor/state/environment-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import {
  readEditorSettingsSnapshot,
} from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { Scene } from "@/lib/editor/types/scene";

function syncActiveSceneSnapshot() {
  const scenesState = useScenesStore.getState();
  const editor = useEditorStore.getState();
  const model = useModelStore.getState();
  useScenesStore.setState({
    scenes: scenesState.scenes.map((scene) =>
      scene.id === scenesState.activeSceneId
        ? {
            ...scene,
            hotspots: editor.hotspots.map((h) => ({
              ...h,
              position: { ...h.position },
              blocks: [...h.blocks],
              customCameraEnabled: h.customCameraEnabled ?? false,
              customCamera: cloneCameraResetPosition(h.customCamera ?? null),
            })),
            nextHotspotId: editor.nextId,
            model: {
              name: model.modelName,
              info: model.modelInfo,
              hasUserModel: model.hasUserModel,
              scale: model.modelScale,
              rotation: { ...model.modelRotation },
              reflection: model.modelReflection,
            },
            settings: readEditorSettingsSnapshot(),
            environment: readEnvironmentSnapshot(),
          }
        : scene,
    ),
  });
}

export function ScenesModal() {
  const isPreview = useEditorStore((s) => s.isPreview);
  const open = useUIStore((s) => s.scenesModalOpen);
  const setOpen = useUIStore((s) => s.setScenesModalOpen);
  const scenes = useScenesStore((s) => s.scenes);
  const activeSceneId = useScenesStore((s) => s.activeSceneId);
  const addScene = useScenesStore((s) => s.addScene);
  const removeScene = useScenesStore((s) => s.removeScene);
  const renameScene = useScenesStore((s) => s.renameScene);
  const setPrimaryScene = useScenesStore((s) => s.setPrimaryScene);
  const switchScene = useScenesStore((s) => s.switchScene);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      return;
    }
    syncActiveSceneSnapshot();
  }, [open]);

  if (isPreview) return null;

  const close = () => {
    setEditingId(null);
    setOpen(false);
  };

  const handleSelect = (id: string) => {
    if (editingId === id) return;
    switchScene(id);
    close();
  };

  const handleAdd = () => {
    addScene();
  };

  return (
    <EditorDialog
      open={open}
      onClose={close}
      presentation="modal"
      size="large"
      backdrop
      backdropBlur
      className="editor-scenes-dialog"
    >
      <EditorDialog.Header
        title="Scenes"
        description={`${scenes.length} scene${scenes.length === 1 ? "" : "s"} in this project`}
      >
        <IconButton title="Close" onClick={close}>
          <X />
        </IconButton>
      </EditorDialog.Header>

      <EditorDialog.Body className="space-y-2">
        {scenes.map((scene) => (
          <SceneListItem
            key={scene.id}
            scene={scene}
            selected={scene.id === activeSceneId}
            canDelete={scenes.length > 1}
            editing={editingId === scene.id}
            onStartEdit={() => setEditingId(scene.id)}
            onCancelEdit={() => setEditingId(null)}
            onRename={(name) => {
              renameScene(scene.id, name);
              setEditingId(null);
            }}
            onSelect={() => handleSelect(scene.id)}
            onSetPrimary={() => setPrimaryScene(scene.id)}
            onDelete={() => removeScene(scene.id)}
          />
        ))}
      </EditorDialog.Body>

      <EditorDialog.Footer>
        <EditorButton
          variant="primary"
          className="w-full justify-center"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Scene
        </EditorButton>
      </EditorDialog.Footer>
    </EditorDialog>
  );
}

function SceneListItem({
  scene,
  selected,
  canDelete,
  editing,
  onStartEdit,
  onCancelEdit,
  onRename,
  onSelect,
  onSetPrimary,
  onDelete,
}: {
  scene: Scene;
  selected: boolean;
  canDelete: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRename: (name: string) => void;
  onSelect: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  const [draftName, setDraftName] = useState(scene.name);

  useEffect(() => {
    if (editing) setDraftName(scene.name);
  }, [editing, scene.name]);

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      onCancelEdit();
      return;
    }
    onRename(trimmed);
  };

  return (
    <div
      className={`editor-hot-item editor-scene-item ${selected ? "selected" : ""}`}
      onClick={() => {
        if (!editing) onSelect();
      }}
      onKeyDown={(e) => {
        if (!editing && e.key === "Enter") onSelect();
      }}
      role="button"
      tabIndex={0}
    >
      <span
        className="editor-scene-item-icon"
        style={{
          color: selected ? "var(--editor-crimson-2)" : "var(--editor-amber)",
        }}
      >
        <Layers className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            className="editor-input"
            autoFocus
            value={draftName}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit();
              }
            }}
          />
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-[12.5px] font-semibold">
                {scene.name}
              </div>
              {scene.isPrimary ? (
                <EditorChip
                  style={{
                    color: "var(--editor-amber)",
                    borderColor: "rgba(244,162,89,0.35)",
                  }}
                >
                  Primary
                </EditorChip>
              ) : null}
              {selected ? (
                <EditorChip
                  style={{
                    color: "var(--editor-teal)",
                    borderColor: "rgba(63,184,175,0.3)",
                  }}
                >
                  Current
                </EditorChip>
              ) : null}
            </div>
            <div
              className="text-[10.5px]"
              style={{ color: "var(--editor-muted-2)" }}
            >
              {scene.hotspots.length} hotspot
              {scene.hotspots.length === 1 ? "" : "s"}
              {scene.model.hasUserModel
                ? ` · ${scene.model.name}`
                : " · Default model"}
            </div>
          </>
        )}
      </div>

      {!editing ? (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="editor-btn-ghost rounded p-1"
            title="Rename scene"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="editor-btn-ghost rounded p-1"
            title={
              scene.isPrimary ? "Primary scene" : "Set as primary scene"
            }
            disabled={scene.isPrimary}
            onClick={(e) => {
              e.stopPropagation();
              if (!scene.isPrimary) onSetPrimary();
            }}
            style={
              scene.isPrimary
                ? { color: "var(--editor-amber)", opacity: 1 }
                : undefined
            }
          >
            <Star
              className="h-3 w-3"
              fill={scene.isPrimary ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            className="editor-btn-ghost rounded p-1"
            title={
              canDelete
                ? "Delete scene"
                : "At least one scene is required"
            }
            disabled={!canDelete}
            style={canDelete ? { color: "var(--editor-crimson-2)" } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (canDelete) onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
