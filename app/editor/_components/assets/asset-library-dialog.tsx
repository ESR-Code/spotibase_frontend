"use client";

import { AlertTriangle, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AssetThumb } from "@/app/editor/_components/assets/asset-thumb";
import { EditorChip } from "@/app/editor/_components/ui/editor-chip";
import { confirmDelete } from "@/lib/editor/confirm";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import {
  ASSET_LIMITS,
  assetContentType,
  collectAssetRefs,
  deleteProjectAsset,
  formatAssetSize,
  renameProjectAsset,
  uploadAsset,
  useAssetsStore,
  type AssetUsage,
  type EditorAsset,
  type EditorAssetKind,
} from "@/lib/editor/assets";
import { useGeneralSettingsStore } from "@/lib/editor/state/general-settings-store";
import { readLiveScenes, useScenesStore } from "@/lib/editor/state/scenes-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { toast } from "@/lib/editor/toast";

type KindFilter = "all" | EditorAssetKind;

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "model", label: "Models" },
];

const LIBRARY_ACCEPT = [...ASSET_LIMITS.image.types, ".glb"].join(",");

function kindForFile(file: File): EditorAssetKind | null {
  const type = assetContentType(file);
  if (ASSET_LIMITS.model.types.includes(type)) return "model";
  if (ASSET_LIMITS.image.types.includes(type)) return "image";
  return null;
}

function readProjectRefs() {
  return collectAssetRefs({
    scenes: readLiveScenes(),
    project: {
      appStartActions: useScenesStore.getState().appStartActions,
      generalStyle: useGeneralSettingsStore.getState().style,
    },
  });
}

export function AssetLibraryDialog() {
  const open = useUIStore((s) => s.assetLibraryOpen);
  const setOpen = useUIStore((s) => s.setAssetLibraryOpen);
  if (!open) return null;
  return <AssetLibrary onClose={() => setOpen(false)} />;
}

function AssetLibrary({ onClose }: { onClose: () => void }) {
  const assets = useAssetsStore((s) => s.assets);
  const [filter, setFilter] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(0);
  // Re-read references whenever the library changes (upload, delete).
  const refs = useMemo(() => {
    void assets;
    return readProjectRefs();
  }, [assets]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(assets)
      .filter((a) => filter === "all" || a.kind === filter)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [assets, filter, query]);

  const missing = useMemo(
    () => [...refs.entries()].filter(([id]) => !assets[id]),
    [refs, assets],
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const sceneId = useScenesStore.getState().activeSceneId;
    for (const file of Array.from(files)) {
      const kind = kindForFile(file);
      if (!kind) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        await uploadAsset(file, { kind, sceneId });
        toast.success(`${file.name} added to the library`);
      } catch (error) {
        toast.error(
          `${file.name}: ${error instanceof Error ? error.message : "upload failed"}`,
        );
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  return (
    <EditorDialog open onClose={onClose} presentation="modal" backdrop size="large">
      <EditorDialog.Header
        title="Assets"
        description="Images and models shared by every scene in this project."
      >
        <IconButton title="Close" onClick={onClose}>
          <X />
        </IconButton>
      </EditorDialog.Header>
      <EditorDialog.Body className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="editor-pill-row">
            {KIND_FILTERS.map((f) => (
              <TypePill key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </TypePill>
            ))}
          </div>
          <input
            className="editor-input min-w-[160px] flex-1"
            placeholder="Search assets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="editor-btn editor-btn-primary mb-0 cursor-pointer">
            {uploading > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
            <input
              type="file"
              multiple
              accept={LIBRARY_ACCEPT}
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {missing.length > 0 ? <MissingAssets entries={missing} /> : null}

        {list.length === 0 ? (
          <div className="py-10 text-center text-[12px]" style={{ color: "var(--editor-muted)" }}>
            {query || filter !== "all"
              ? "No matching assets."
              : "No assets yet. Upload images or GLB models, or add them from any image field."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {list.map((asset) => (
              <AssetCard key={asset.id} asset={asset} usages={refs.get(asset.id) ?? []} />
            ))}
          </div>
        )}
      </EditorDialog.Body>
    </EditorDialog>
  );
}

function AssetCard({ asset, usages }: { asset: EditorAsset; usages: AssetUsage[] }) {
  const projectId = useAssetsStore((s) => s.projectId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(asset.name);
  const [busy, setBusy] = useState(false);
  const inUse = usages.length > 0;

  const commitRename = async () => {
    setEditing(false);
    const next = name.trim();
    if (!next || next === asset.name) {
      setName(asset.name);
      return;
    }
    try {
      await renameProjectAsset(asset.id, next);
      useAssetsStore.getState().patchAsset(asset.id, { name: next });
    } catch (error) {
      setName(asset.name);
      toast.error(error instanceof Error ? error.message : "Could not rename asset");
    }
  };

  const remove = async () => {
    // Re-check against the live project: the card may be stale.
    const live = readProjectRefs().get(asset.id) ?? [];
    if (live.length > 0) {
      toast.error(`${asset.name} is still in use`, {
        description: live.map((u) => `${u.sceneName}: ${u.where}`).slice(0, 4).join("\n"),
      });
      return;
    }
    if (!projectId) return;
    setBusy(true);
    try {
      await deleteProjectAsset(projectId, asset.id);
      useAssetsStore.getState().removeAsset(asset.id);
      toast.success(`${asset.name} deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete asset");
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg p-1.5"
      style={{ border: "1px solid var(--editor-line-soft)", background: "rgba(11,20,36,0.35)" }}
    >
      <AssetThumb asset={asset} className="aspect-square w-full" />
      {editing ? (
        <input
          className="editor-input h-7 text-[11px]"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void commitRename()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commitRename();
            if (e.key === "Escape") {
              setName(asset.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <div className="truncate text-[11px] font-semibold" title={asset.name}>
          {asset.name}
        </div>
      )}
      <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--editor-muted)" }}>
        <span>{formatAssetSize(asset.size)}</span>
        {asset.width && asset.height ? <span>· {asset.width}×{asset.height}</span> : null}
        <span className="flex-1" />
        {inUse ? (
          <EditorChip title={usages.map((u) => `${u.sceneName}: ${u.where}`).join("\n")}>
            {usages.length} use{usages.length === 1 ? "" : "s"}
          </EditorChip>
        ) : null}
      </div>
      <div className="flex gap-1">
        <IconButton title="Rename" onClick={() => setEditing(true)} style={{ width: 26, height: 26 }}>
          <Pencil className="h-3.5 w-3.5" />
        </IconButton>
        <span className="flex-1" />
        <IconButton
          title={inUse ? "In use — remove it from the project first" : "Delete asset"}
          onClick={() => {
            void confirmDelete("asset").then((ok) => {
              if (ok) void remove();
            });
          }}
          disabled={inUse || busy}
          style={{ width: 26, height: 26, color: "#ff8a95" }}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </IconButton>
      </div>
    </div>
  );
}

function MissingAssets({ entries }: { entries: [string, AssetUsage[]][] }) {
  return (
    <div
      className="rounded-lg p-2.5 text-[11px]"
      style={{ border: "1px solid rgba(230,57,70,0.4)", background: "rgba(230,57,70,0.08)" }}
    >
      <div className="mb-1 flex items-center gap-1.5 font-semibold" style={{ color: "var(--editor-crimson)" }}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {entries.length} missing asset{entries.length === 1 ? "" : "s"}
      </div>
      <ul className="space-y-0.5" style={{ color: "var(--editor-muted)" }}>
        {entries.flatMap(([id, usages]) =>
          usages.map((u, i) => (
            <li key={`${id}-${i}`}>
              {u.sceneName}: {u.where}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
