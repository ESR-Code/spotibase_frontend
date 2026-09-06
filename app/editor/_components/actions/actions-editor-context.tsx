"use client";

import { createContext, useContext } from "react";
import type {
  ActionNode,
  ActionNodeType,
  ActionNodeXY,
  HotspotActionGraph,
} from "@/lib/editor/types/hotspot-action";

export type ActionsPendingConnect = {
  nodeId: string;
  handleId: string | null;
  /** Handle the user dragged from. */
  handleType: "source" | "target";
};

export type ActionsEditorApi = {
  updateGraph: (
    hotspotId: number,
    updater: (graph: HotspotActionGraph) => HotspotActionGraph,
  ) => void;
  deleteNode: (hotspotId: number, nodeId: string) => void;
  deleteEdge: (hotspotId: number, edgeId: string) => void;
  updateNodeData: (
    hotspotId: number,
    nodeId: string,
    patch: Record<string, unknown>,
  ) => void;
  addNode: (
    hotspotId: number,
    type: ActionNodeType,
    position: ActionNodeXY,
    pendingConnect?: ActionsPendingConnect,
  ) => void;
  clipboard: ActionNode | null;
  copyNode: (hotspotId: number, nodeId: string) => void;
  pasteNode: (
    hotspotId: number,
    target?: { nearNodeId?: string; position?: ActionNodeXY },
  ) => boolean;
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
