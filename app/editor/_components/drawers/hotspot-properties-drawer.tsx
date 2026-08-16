"use client";

import { Copy, LayoutList, Settings2, Trash2, Workflow, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HotspotActionsTab } from "@/app/editor/_components/actions/hotspot-actions-tab";
import { HotspotBlocksTab } from "@/app/editor/_components/drawers/hotspot-blocks-tab";
import { HotspotGeneralTab } from "@/app/editor/_components/drawers/hotspot-general-tab";
import { EditorButton } from "@/app/editor/_components/ui/editor-button";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { useHotspotForm } from "@/lib/editor/forms/use-hotspot-form";
import { clearEditorSelection } from "@/lib/editor/state/exclusive-selection";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import { hotspotTypeLabel } from "@/lib/editor/types/hotspot";

type PropertiesTab = "general" | "blocks" | "actions";

const TABS: {
  id: PropertiesTab;
  label: string;
  icon: typeof Settings2;
}[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "blocks", label: "Blocks", icon: LayoutList },
  { id: "actions", label: "Actions", icon: Workflow },
];

export function HotspotPropertiesDrawer() {
  const open = useUIStore((s) => s.propertiesDrawerOpen);
  const setOpen = useUIStore((s) => s.setPropertiesDrawerOpen);
  const openActionsModal = useUIStore((s) => s.openActionsModal);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeHotspot = useEditorStore((s) => s.removeHotspot);
  const duplicateHotspot = useEditorStore((s) => s.duplicateHotspot);
  const { form, selected } = useHotspotForm();
  const [tabState, setTabState] = useState<{
    hotspotId: number | null;
    tab: PropertiesTab;
  }>({ hotspotId: selectedId, tab: "general" });

  const activeTab =
    tabState.hotspotId === selectedId ? tabState.tab : "general";
  const setActiveTab = (tab: PropertiesTab) =>
    setTabState({ hotspotId: selectedId, tab });

  if (!selected) {
    return (
      <GlassPanel
        className={`editor-drawer editor-properties-drawer flex flex-col ${open ? "open" : ""}`}
        style={{ borderLeft: "1px solid var(--editor-line)" }}
      />
    );
  }

  return (
    <GlassPanel
      className={`editor-drawer editor-properties-drawer flex flex-col ${open ? "open" : ""}`}
      style={{ borderLeft: "1px solid var(--editor-line)" }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--editor-line)" }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-display text-[15px] font-bold">Hotspot Editor</div>
            <span className="editor-chip">
              HSP-{String(selected.id).padStart(3, "0")}
            </span>
            <span
              className="text-[11px] capitalize"
              style={{ color: "var(--editor-muted-2)" }}
            >
              {hotspotTypeLabel(selected.type)}
            </span>
          </div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Edit marker properties
          </div>
        </div>
        <IconButton
          title="Close"
          onClick={() => {
            setOpen(false);
            clearEditorSelection();
          }}
        >
          <X />
        </IconButton>
      </div>

      <div
        className="editor-panel-tabs flex-shrink-0"
        role="tablist"
        aria-label="Hotspot editor panels"
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
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "actions") {
                  openActionsModal({
                    kind: "hotspot",
                    hotspotId: selected.id,
                  });
                }
              }}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="editor-settings-sections min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
        {activeTab === "general" ? (
          <HotspotGeneralTab form={form} selected={selected} />
        ) : activeTab === "blocks" ? (
          <HotspotBlocksTab selected={selected} />
        ) : (
          <HotspotActionsTab selected={selected} />
        )}
      </div>

      <div
        className="flex flex-shrink-0 gap-2 p-4"
        style={{ borderTop: "1px solid var(--editor-line)" }}
      >
        <EditorButton
          className="flex-1"
          onClick={() => {
            duplicateHotspot(selected.id);
            toast.success("Hotspot duplicated");
          }}
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </EditorButton>
        <EditorButton
          className="flex-1"
          style={{ color: "#ff8a95", borderColor: "rgba(230,57,70,0.4)" }}
          onClick={() => {
            if (selectedId != null) {
              removeHotspot(selectedId);
              setOpen(false);
              toast.success("Hotspot deleted");
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </EditorButton>
      </div>
    </GlassPanel>
  );
}
