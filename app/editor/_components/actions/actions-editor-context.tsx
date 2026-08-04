"use client";

import { createContext, useContext } from "react";
import type {
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";

export type ActionsEditorApi = {
  updateGraph: (
    hotspotId: number,
    updater: (graph: HotspotActionGraph) => HotspotActionGraph,
  ) => void;
  deleteNode: (hotspotId: number, nodeId: string) => void;
  updateNodeData: (
    hotspotId: number,
    nodeId: string,
    patch: Record<string, unknown>,
  ) => void;
  addNode: (
    hotspotId: number,
    type: ActionNodeType,
    position: ActionNodeXY,
  ) => void;
};

const ActionsEditorContext = createContext<ActionsEditorApi | null>(null);

export function ActionsEditorProvider({
  value,
  children,
}: {
  value: ActionsEditorApi;
  children: React.ReactNode;
}) {
  return (
    <ActionsEditorContext.Provider value={value}>
      {children}
    </ActionsEditorContext.Provider>
  );
}

export function useActionsEditor(): ActionsEditorApi {
  const ctx = useContext(ActionsEditorContext);
  if (!ctx) {
    throw new Error("useActionsEditor must be used within ActionsEditorProvider");
  }
  return ctx;
}
