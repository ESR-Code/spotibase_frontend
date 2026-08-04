"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { ACTION_UI_MENU_ITEMS } from "@/app/editor/_components/actions/action-node-registry";
import type { ActionNodeType } from "@/lib/editor/types/hotspot-action";

export type ActionsContextMenuState =
  | {
      kind: "pane";
      x: number;
      y: number;
      hotspotId: number;
      flowPosition: { x: number; y: number };
    }
  | {
      kind: "node";
      x: number;
      y: number;
      hotspotId: number;
      nodeId: string;
      deletable: boolean;
    };

type ActionsContextMenuProps = {
  menu: ActionsContextMenuState | null;
  onClose: () => void;
  onAdd: (
    hotspotId: number,
    type: ActionNodeType,
    position: { x: number; y: number },
  ) => void;
  onDelete: (hotspotId: number, nodeId: string) => void;
};

export function ActionsContextMenu({
  menu,
  onClose,
  onAdd,
  onDelete,
}: ActionsContextMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <div
      ref={rootRef}
      role="menu"
      className="editor-actions-context-menu"
      style={{ left: menu.x, top: menu.y }}
    >
      {menu.kind === "pane" ? (
        <>
          <div className="editor-actions-context-menu-label">Add node</div>
          {ACTION_UI_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                role="menuitem"
                className="editor-actions-context-menu-item"
                onClick={() => {
                  onAdd(menu.hotspotId, item.type, menu.flowPosition);
                  onClose();
                }}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: item.accent }}
                />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium">
                    {item.meta.label}
                  </span>
                  <span
                    className="block text-[10px]"
                    style={{ color: "var(--editor-muted)" }}
                  >
                    {item.meta.description}
                  </span>
                </span>
              </button>
            );
          })}
        </>
      ) : menu.deletable ? (
        <button
          type="button"
          role="menuitem"
          className="editor-actions-context-menu-item"
          style={{ color: "#ff8a95" }}
          onClick={() => {
            onDelete(menu.hotspotId, menu.nodeId);
            onClose();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete node
        </button>
      ) : (
        <div
          className="px-3 py-2 text-[11px]"
          style={{ color: "var(--editor-muted)" }}
        >
          Trigger node cannot be deleted
        </div>
      )}
    </div>
  );
}
