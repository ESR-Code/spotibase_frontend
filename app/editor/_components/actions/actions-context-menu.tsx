"use client";

import { ClipboardPaste, Copy, Search, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ACTION_MENU_GROUPS, ACTION_UI_MENU_ITEMS } from "@/app/editor/_components/actions/action-node-registry";
import {
  useActionsEditor,
  type ActionsPendingConnect,
} from "@/app/editor/_components/actions/actions-editor-context";
import type { ActionNodeType } from "@/lib/editor/types/hotspot-action";
import { TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";

export type { ActionsPendingConnect };

export type ActionsContextMenuState =
  | {
      kind: "pane";
      x: number;
      y: number;
      hotspotId: number;
      flowPosition: { x: number; y: number };
      allowedNodeTypes: ActionNodeType[];
      pendingConnect?: ActionsPendingConnect;
      /** `pendingConnect` was inferred (selected / last node), not dragged. */
      autoConnect?: boolean;
      /** Lane the node will be added to; set only when several lanes exist. */
      laneLabel?: string;
      /** What an auto-connected node will follow. */
      anchorLabel?: string;
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
    pendingConnect?: ActionsPendingConnect,
  ) => void;
  onDelete: (hotspotId: number, nodeId: string) => void;
};

export function ActionsContextMenu({
  menu,
  onClose,
  onAdd,
  onDelete,
}: ActionsContextMenuProps) {
  const { clipboard, copyNode, pasteNode } = useActionsEditor();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

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

  const groupedItems = useMemo(() => {
    if (!menu || menu.kind !== "pane") return [];
    const allowed = ACTION_UI_MENU_ITEMS.filter((item) =>
      menu.allowedNodeTypes.includes(item.type),
    );
    const q = query.trim().toLowerCase();
    const filtered = q
      ? allowed.filter((item) => {
          const haystack =
            `${item.meta.label} ${item.meta.description}`.toLowerCase();
          return haystack.includes(q);
        })
      : allowed;

    return ACTION_MENU_GROUPS.map((group) => ({
      ...group,
      items: filtered.filter((item) => item.menuGroup === group.id),
    })).filter((group) => group.items.length > 0);
  }, [menu, query]);

  const hasMatchingItems = groupedItems.length > 0;

  // Keep the menu inside the canvas (it resizes as the search filters items).
  useLayoutEffect(() => {
    const el = rootRef.current;
    const container = el?.parentElement;
    if (!menu || !el || !container) return;
    const margin = 8;
    const maxLeft = Math.max(margin, container.clientWidth - el.offsetWidth - margin);
    const maxTop = Math.max(margin, container.clientHeight - el.offsetHeight - margin);
    const left = Math.min(Math.max(menu.x, margin), maxLeft);
    const top = Math.min(Math.max(menu.y, margin), maxTop);
    setPos((prev) =>
      prev && prev.left === left && prev.top === top ? prev : { left, top },
    );
  }, [menu, groupedItems]);

  if (!menu) return null;

  const paneHint =
    menu.kind === "pane"
      ? [menu.laneLabel, menu.anchorLabel ? `after ${menu.anchorLabel}` : null]
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <div
      ref={rootRef}
      role="menu"
      className="editor-actions-context-menu"
      style={{ left: pos?.left ?? menu.x, top: pos?.top ?? menu.y }}
    >
      {menu.kind === "pane" ? (
        <>
          {clipboard && (!menu.pendingConnect || menu.autoConnect) ? (
            <button
              type="button"
              role="menuitem"
              className="editor-actions-context-menu-item"
              onClick={() => {
                pasteNode(menu.hotspotId, { position: menu.flowPosition });
                onClose();
              }}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste node
            </button>
          ) : null}
          <div className="editor-actions-context-menu-label">
            {menu.pendingConnect ? "Add & connect" : "Add node"}
          </div>
          {paneHint ? (
            <div className="editor-actions-context-menu-hint" title={paneHint}>
              {paneHint}
            </div>
          ) : null}
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
            {!hasMatchingItems ? (
              <div
                className="px-3 py-3 text-[11px]"
                style={{ color: "var(--editor-muted)" }}
              >
                No matching nodes
              </div>
            ) : (
              groupedItems.map((group, groupIndex) => (
                <div
                  key={group.id}
                  className="editor-actions-context-menu-group"
                  data-first={groupIndex === 0 ? "true" : undefined}
                >
                  <div className="editor-actions-context-menu-group-label">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        role="menuitem"
                        className="editor-actions-context-menu-item"
                        onClick={() => {
                          onAdd(
                            menu.hotspotId,
                            item.type,
                            menu.flowPosition,
                            menu.pendingConnect,
                          );
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
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {menu.nodeId !== TRIGGER_NODE_ID && menu.deletable ? (
            <button
              type="button"
              role="menuitem"
              className="editor-actions-context-menu-item"
              onClick={() => {
                copyNode(menu.hotspotId, menu.nodeId);
                onClose();
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy node
            </button>
          ) : null}
          {clipboard ? (
            <button
              type="button"
              role="menuitem"
              className="editor-actions-context-menu-item"
              onClick={() => {
                pasteNode(menu.hotspotId, {
                  nearNodeId:
                    menu.nodeId === TRIGGER_NODE_ID ? undefined : menu.nodeId,
                });
                onClose();
              }}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste node
            </button>
          ) : null}
          {menu.deletable ? (
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
          ) : !clipboard ? (
            <div
              className="px-3 py-2 text-[11px]"
              style={{ color: "var(--editor-muted)" }}
            >
              Trigger node cannot be deleted
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
