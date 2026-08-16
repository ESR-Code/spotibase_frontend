"use client";

import { Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACTION_UI_MENU_ITEMS } from "@/app/editor/_components/actions/action-node-registry";
import type { ActionNodeType } from "@/lib/editor/types/hotspot-action";

export type ActionsContextMenuState =
  | {
      kind: "pane";
      x: number;
      y: number;
      hotspotId: number;
      flowPosition: { x: number; y: number };
      allowedNodeTypes: ActionNodeType[];
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
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!menu) return;
    setQuery("");
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

  useEffect(() => {
    if (menu?.kind !== "pane") return;
    const id = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [menu]);

  const filteredItems = useMemo(() => {
    if (!menu || menu.kind !== "pane") return [];
    const allowed = ACTION_UI_MENU_ITEMS.filter((item) =>
      menu.allowedNodeTypes.includes(item.type),
    );
    const q = query.trim().toLowerCase();
    if (!q) return allowed;
    return allowed.filter((item) => {
      const haystack = `${item.meta.label} ${item.meta.description}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [menu, query]);

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
          <div className="editor-actions-context-menu-search">
            <Search
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--editor-muted-2)" }}
            />
            <input
              ref={searchRef}
              type="search"
              className="editor-actions-context-menu-search-input"
              placeholder="Search nodes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Search action nodes"
            />
          </div>
          <div className="editor-actions-context-menu-list">
            {filteredItems.length === 0 ? (
              <div
                className="px-3 py-3 text-[11px]"
                style={{ color: "var(--editor-muted)" }}
              >
                No matching nodes
              </div>
            ) : (
              filteredItems.map((item) => {
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
              })
            )}
          </div>
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
