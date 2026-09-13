"use client";

import { useReactFlow } from "@xyflow/react";
import {
  MousePointerClick,
  Play,
  Rocket,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  flowNodeId,
  TRIGGER_FLOW_TYPE,
  type ActionFlowEntry,
} from "@/lib/editor/actions/flow-adapter";
import { getCategoryLucideIcon } from "@/lib/editor/theme/category-icons";
import { TRIGGER_NODE_ID } from "@/lib/editor/types/hotspot-action";

type ActionsCanvasSearchProps = {
  entries: ActionFlowEntry[];
  onFocused: (flowId: string) => void;
};

type SearchHit = {
  flowId: string;
  title: string;
  subtitle: string;
  chip: string;
  haystack: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
};

function hitsFromEntries(entries: ActionFlowEntry[]): SearchHit[] {
  return entries.map((entry) => {
    const flowIdValue = flowNodeId(entry.ownerId, TRIGGER_NODE_ID);
    if (entry.triggerKind === "appStart") {
      return {
        flowId: flowIdValue,
        title: "App Start",
        subtitle: "Runs once when Preview begins",
        chip: "APP",
        haystack: "app start all scenes preview",
        Icon: Rocket,
        color: "#c4a5ff",
        bg: "rgba(196,165,255,0.15)",
        border: "rgba(196,165,255,0.4)",
      };
    }
    if (entry.triggerKind === "sceneStart") {
      return {
        flowId: flowIdValue,
        title: "Scene Start",
        subtitle: entry.title,
        chip: "SCENE",
        haystack: `scene start ${entry.title}`,
        Icon: Play,
        color: "var(--editor-amber)",
        bg: "rgba(242, 169, 59, 0.15)",
        border: "rgba(242, 169, 59, 0.4)",
      };
    }
    if (entry.triggerKind === "menuButton") {
      return {
        flowId: flowIdValue,
        title: entry.title || "Custom button",
        subtitle: entry.toggleEnabled
          ? "Bottom menu · toggle"
          : "Bottom menu",
        chip: "MENU",
        haystack: `menu button custom ${entry.title}`,
        Icon: getCategoryLucideIcon(entry.triggerIcon ?? "Star"),
        color: "var(--editor-teal)",
        bg: "rgba(63,184,175,0.15)",
        border: "rgba(63,184,175,0.4)",
      };
    }
    if (entry.triggerKind === "contentButton") {
      return {
        flowId: flowIdValue,
        title: entry.title || "Action button",
        subtitle: entry.triggerSubtitle || "Hotspot content",
        chip: "BTN",
        haystack: `action button content ${entry.title} ${entry.triggerSubtitle ?? ""}`,
        Icon: getCategoryLucideIcon(entry.triggerIcon ?? "Star"),
        color: "var(--editor-crimson)",
        bg: "rgba(230,57,70,0.15)",
        border: "rgba(230,57,70,0.4)",
      };
    }
    const chip = `HSP-${String(entry.ownerId).padStart(3, "0")}`;
    return {
      flowId: flowIdValue,
      title: entry.title || "Hotspot",
      subtitle: "Hotspot clicked",
      chip,
      haystack: `hotspot ${entry.title} ${chip}`,
      Icon: MousePointerClick,
      color: "var(--editor-teal)",
      bg: "rgba(63,184,175,0.15)",
      border: "rgba(63,184,175,0.4)",
    };
  });
}

export function ActionsCanvasSearch({
  entries,
  onFocused,
}: ActionsCanvasSearchProps) {
  const { fitView, getNode } = useReactFlow();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const hits = useMemo(() => hitsFromEntries(entries), [entries]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hits;
    return hits.filter((hit) => {
      const haystack =
        `${hit.title} ${hit.subtitle} ${hit.chip} ${hit.haystack}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [hits, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goTo = (hit: SearchHit) => {
    const node = getNode(hit.flowId);
    if (!node) return;
    onFocused(hit.flowId);
    void fitView({
      nodes: [{ id: hit.flowId, type: TRIGGER_FLOW_TYPE }],
      padding: 1.15,
      duration: 380,
      maxZoom: 1.2,
      minZoom: 0.55,
    });
    setOpen(false);
    setQuery(hit.title);
  };

  return (
    <div ref={rootRef} className="editor-actions-search nodrag nopan nowheel">
      <div className="editor-actions-search-field">
        <Search
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: "var(--editor-muted-2)" }}
        />
        <input
          type="search"
          className="editor-actions-search-input"
          placeholder="Search hotspots, App Start…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter" && filtered[0]) goTo(filtered[0]);
          }}
          aria-label="Search action canvas"
        />
      </div>
      {open ? (
        <div className="editor-actions-search-list" role="listbox">
          {filtered.length === 0 ? (
            <div
              className="px-3 py-3 text-[11px]"
              style={{ color: "var(--editor-muted)" }}
            >
              No matching nodes
            </div>
          ) : (
            filtered.map((hit) => {
              const Icon = hit.Icon;
              return (
                <button
                  key={hit.flowId}
                  type="button"
                  role="option"
                  className="editor-actions-search-item"
                  onClick={() => goTo(hit)}
                >
                  <span
                    className="editor-action-node-icon editor-actions-search-icon"
                    style={{
                      color: hit.color,
                      background: hit.bg,
                      borderColor: hit.border,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[12px] font-medium">
                      {hit.title}
                    </span>
                    <span
                      className="block truncate text-[10px]"
                      style={{ color: "var(--editor-muted)" }}
                    >
                      {hit.subtitle}
                    </span>
                  </span>
                  <span className="editor-chip">{hit.chip}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
