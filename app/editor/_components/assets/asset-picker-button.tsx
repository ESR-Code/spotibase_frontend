"use client";

import { FolderOpen, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AssetThumb } from "@/app/editor/_components/assets/asset-thumb";
import { EditorDialog } from "@/app/editor/_components/ui/editor-dialog";
import { getEditorPortalHost } from "@/app/editor/_components/ui/fixed-portal-menu";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import {
  formatAssetSize,
  useAssetsStore,
  type EditorAsset,
  type EditorAssetKind,
} from "@/lib/editor/assets";

type AssetPickerButtonProps = {
  kind: EditorAssetKind;
  onPick: (asset: EditorAsset) => void;
  title?: string;
};

/** Icon button that opens the project library filtered to one asset kind. */
export function AssetPickerButton({
  kind,
  onPick,
  title = "Choose from library",
}: AssetPickerButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton title={title} onClick={() => setOpen(true)}>
        <FolderOpen />
      </IconButton>
      <AssetPickerDialog
        open={open}
        kind={kind}
        onClose={() => setOpen(false)}
        onPick={(asset) => {
          setOpen(false);
          onPick(asset);
        }}
      />
    </>
  );
}

function AssetPickerDialog({
  open,
  kind,
  onClose,
  onPick,
}: {
  open: boolean;
  kind: EditorAssetKind;
  onClose: () => void;
  onPick: (asset: EditorAsset) => void;
}) {
  const assets = useAssetsStore((s) => s.assets);
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(assets)
      .filter((a) => a.kind === kind)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [assets, kind, query]);

  const host = open ? getEditorPortalHost() : null;
  if (!host) return null;

  return createPortal(
    <EditorDialog
      open={open}
      onClose={onClose}
      presentation="modal"
      backdrop
      size="medium"
    >
      <EditorDialog.Header
        title="Choose from library"
        description="Assets are shared by every scene in this project."
      >
        <IconButton title="Close" onClick={onClose}>
          <X />
        </IconButton>
      </EditorDialog.Header>
      <EditorDialog.Body>
        <input
          className="editor-input mb-3"
          placeholder="Search assets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {list.length === 0 ? (
          <div className="py-8 text-center text-[12px]" style={{ color: "var(--editor-muted)" }}>
            {query ? "No matching assets." : "No assets yet. Upload one to add it to the library."}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {list.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="editor-btn flex h-auto flex-col items-stretch gap-1.5 p-1.5 text-left"
                onClick={() => onPick(asset)}
                title={asset.name}
              >
                <AssetThumb asset={asset} className="aspect-square w-full" />
                <span className="truncate text-[11px] font-semibold">{asset.name}</span>
                <span className="text-[10px]" style={{ color: "var(--editor-muted)" }}>
                  {formatAssetSize(asset.size)}
                </span>
              </button>
            ))}
          </div>
        )}
      </EditorDialog.Body>
    </EditorDialog>,
    host,
  );
}
