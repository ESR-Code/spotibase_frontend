"use client";

import type { NodeProps } from "@xyflow/react";
import {
  MapPinned,
  PanelRightOpen,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { GoToSceneNode } from "@/app/editor/_components/actions/go-to-scene-node";
import { HotspotTriggerNode } from "@/app/editor/_components/actions/hotspot-trigger-node";
import { OpenModalNode } from "@/app/editor/_components/actions/open-modal-node";
import {
  ACTION_NODE_META,
  type ActionNodeMeta,
} from "@/lib/editor/actions/registry";
import { TRIGGER_FLOW_TYPE } from "@/lib/editor/actions/flow-adapter";
import type { ActionNodeType } from "@/lib/editor/types/hotspot-action";

export type ActionUiDefinition = {
  type: ActionNodeType;
  meta: ActionNodeMeta;
  icon: LucideIcon;
  accent: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Node: ComponentType<NodeProps<any>>;
};

export const ACTION_UI_REGISTRY: Record<ActionNodeType, ActionUiDefinition> = {
  openModal: {
    type: "openModal",
    meta: ACTION_NODE_META.openModal,
    icon: PanelRightOpen,
    accent: "var(--editor-crimson-2)",
    Node: OpenModalNode,
  },
  goToScene: {
    type: "goToScene",
    meta: ACTION_NODE_META.goToScene,
    icon: MapPinned,
    accent: "var(--editor-amber)",
    Node: GoToSceneNode,
  },
};

export const ACTION_UI_MENU_ITEMS = Object.values(ACTION_UI_REGISTRY);

export const ACTION_FLOW_NODE_TYPES = {
  [TRIGGER_FLOW_TYPE]: HotspotTriggerNode,
  openModal: OpenModalNode,
  goToScene: GoToSceneNode,
};
