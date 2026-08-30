"use client";

import { LayoutList, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SpawnHotspotGeneralTab } from "@/app/editor/_components/actions/spawn-hotspot-general-tab";
import { useActionsEditor } from "@/app/editor/_components/actions/actions-editor-context";
import { HotspotBlocksTab } from "@/app/editor/_components/drawers/hotspot-blocks-tab";
import { GlassPanel } from "@/app/editor/_components/ui/glass-panel";
import { IconButton } from "@/app/editor/_components/ui/icon-button";
import { getOwnedActionGraph } from "@/lib/editor/actions/action-owners";
import {
  findUpstreamForEach,
  sampleForEachItems,
} from "@/lib/editor/actions/for-each";
import { createHotspotData } from "@/lib/editor/state/editor-store";
import { useOwnedActionNode } from "@/lib/editor/actions/use-owned-action-node";
import {
  fieldSourcesFromValue,
  listAllFieldSources,
} from "@/lib/editor/blocks/http-field-sources";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import { useUIStore } from "@/lib/editor/state/ui-store";
import type { SpawnHotspotTemplate } from "@/lib/editor/types/hotspot-action";

type PropertiesTab = "general" | "blocks";

const TABS: { id: PropertiesTab; label: string; icon: typeof Settings2 }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "blocks", label: "Blocks", icon: LayoutList },
];

export function SpawnHotspotTemplateDrawer() {
  const editor = useUIStore((s) => s.spawnTemplateEditor);
  const close = useUIStore((s) => s.closeSpawnTemplateEditor);
  const { updateNodeData } = useActionsEditor();
  const [tab, setTab] = useState<PropertiesTab>("general");
  const ownedNode = useOwnedActionNode(editor?.ownerId ?? 0, editor?.nodeId);

  const hotspots = useEditorStore((s) => s.hotspots);
  const appStartActions = useScenesStore((s) => s.appStartActions);
  const sceneStartActions = useScenesStore((s) => {
    const scene =
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];
    return scene?.startActions ?? null;
  });
  const customMenuButtons = useSettingsStore((s) => s.customMenuButtons);

  const fieldSources = useMemo(() => {
    if (!editor || ownedNode?.type !== "spawnHotspots") return [];
    const global = listAllFieldSources(editor.nodeId);
    const graph = getOwnedActionGraph(editor.ownerId);
    const forEach = graph
      ? findUpstreamForEach(graph, editor.nodeId)
      : null;
    if (!graph || !forEach) return global;
    const items = sampleForEachItems(graph, forEach);
    const first = items?.[0];
    if (first === undefined) return global;
    const itemSources = fieldSourcesFromValue(first, {
      nodeId: forEach.id,
      ownerId: editor.ownerId,
      nodeLabel: "For Each item",
    });
    return [...itemSources, ...global];
  }, [
    editor,
    ownedNode,
    hotspots,
    appStartActions,
    sceneStartActions,
    customMenuButtons,
  ]);

  if (!editor || ownedNode?.type !== "spawnHotspots") return null;

  const template = ownedNode.data.template;
  const patchTemplate = (partial: Partial<SpawnHotspotTemplate>) => {
    updateNodeData(editor.ownerId, editor.nodeId, {
      template: { ...template, ...partial },
    });
  };

  const virtualHotspot = createHotspotData(
    editor.ownerId,
    { x: 0, y: 0, z: 0 },
    {
      title: template.title || "Spawn template",
      blocks: template.blocks,
    },
  );

  return (
    <GlassPanel
      className="editor-drawer editor-properties-drawer flex flex-col open"
      style={{
        borderLeft: "1px solid var(--editor-line)",
        zIndex: 40,
      }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--editor-line)" }}
      >
        <div className="min-w-0">
          <div className="font-display text-[15px] font-bold">
            Spawn template
          </div>
          <div className="text-[11px]" style={{ color: "var(--editor-muted)" }}>
            Fields can use {"{{tokens}}"} from the current For Each item
          </div>
        </div>
        <IconButton title="Close" onClick={close}>
          <X />
        </IconButton>
      </div>

      <div
        className="flex flex-shrink-0 gap-1 px-4 py-2"
        style={{ borderBottom: "1px solid var(--editor-line)" }}
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`editor-btn editor-btn-ghost text-[11px] ${active ? "is-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === "general" ? (
          <SpawnHotspotGeneralTab
            template={template}
            coordMode={ownedNode.data.coordMode}
            fieldSources={fieldSources}
            onChange={patchTemplate}
          />
        ) : (
          <HotspotBlocksTab
            selected={virtualHotspot}
            onChange={(blocks) => patchTemplate({ blocks })}
          />
        )}
      </div>
    </GlassPanel>
  );
}
