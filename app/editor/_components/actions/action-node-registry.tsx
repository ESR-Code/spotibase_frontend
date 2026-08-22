"use client";

import type { NodeProps } from "@xyflow/react";
import {
  Boxes,
  Crosshair,
  ExternalLink,
  Eye,
  Globe,
  MapPinned,
  MessagesSquare,
  Palette,
  PanelRightOpen,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { ChangeHotspotColorNode } from "@/app/editor/_components/actions/change-hotspot-color-node";
import { ChangeHotspotIconNode } from "@/app/editor/_components/actions/change-hotspot-icon-node";
import { EnableDisableNode } from "@/app/editor/_components/actions/enable-disable-node";
import { EnableDisableMeshNode } from "@/app/editor/_components/actions/enable-disable-mesh-node";
import { GoToHotspotNode } from "@/app/editor/_components/actions/go-to-hotspot-node";
import { GoToSceneNode } from "@/app/editor/_components/actions/go-to-scene-node";
import { HotspotTriggerNode } from "@/app/editor/_components/actions/hotspot-trigger-node";
import { HttpRequestNode } from "@/app/editor/_components/actions/http-request-node";
import { OpenModalNode } from "@/app/editor/_components/actions/open-modal-node";
import { OpenUrlNode } from "@/app/editor/_components/actions/open-url-node";
import { SendPostMessageNode } from "@/app/editor/_components/actions/send-post-message-node";
import { ActionFenceNode } from "@/app/editor/_components/actions/action-fence-node";
import {
  ACTION_NODE_META,
  type ActionNodeMeta,
} from "@/lib/editor/actions/registry";
import { ACTION_FENCE_TYPE } from "@/lib/editor/types/action-fence";
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
  goToHotspot: {
    type: "goToHotspot",
    meta: ACTION_NODE_META.goToHotspot,
    icon: Crosshair,
    accent: "#f0a35a",
    Node: GoToHotspotNode,
  },
  openUrl: {
    type: "openUrl",
    meta: ACTION_NODE_META.openUrl,
    icon: ExternalLink,
    accent: "var(--editor-teal)",
    Node: OpenUrlNode,
  },
  sendPostMessage: {
    type: "sendPostMessage",
    meta: ACTION_NODE_META.sendPostMessage,
    icon: MessagesSquare,
    accent: "#7aa2ff",
    Node: SendPostMessageNode,
  },
  httpRequest: {
    type: "httpRequest",
    meta: ACTION_NODE_META.httpRequest,
    icon: Globe,
    accent: "#56c8a0",
    Node: HttpRequestNode,
  },
  enableDisable: {
    type: "enableDisable",
    meta: ACTION_NODE_META.enableDisable,
    icon: Eye,
    accent: "#c4a35a",
    Node: EnableDisableNode,
  },
  enableDisableMesh: {
    type: "enableDisableMesh",
    meta: ACTION_NODE_META.enableDisableMesh,
    icon: Boxes,
    accent: "#8eb5d4",
    Node: EnableDisableMeshNode,
  },
  changeHotspotColor: {
    type: "changeHotspotColor",
    meta: ACTION_NODE_META.changeHotspotColor,
    icon: Palette,
    accent: "#ff7a59",
    Node: ChangeHotspotColorNode,
  },
  changeHotspotIcon: {
    type: "changeHotspotIcon",
    meta: ACTION_NODE_META.changeHotspotIcon,
    icon: Shapes,
    accent: "#6ec6ff",
    Node: ChangeHotspotIconNode,
  },
};

export const ACTION_UI_MENU_ITEMS = Object.values(ACTION_UI_REGISTRY);

export const ACTION_FLOW_NODE_TYPES = {
  [TRIGGER_FLOW_TYPE]: HotspotTriggerNode,
  openModal: OpenModalNode,
  goToScene: GoToSceneNode,
  goToHotspot: GoToHotspotNode,
  openUrl: OpenUrlNode,
  sendPostMessage: SendPostMessageNode,
  httpRequest: HttpRequestNode,
  enableDisable: EnableDisableNode,
  enableDisableMesh: EnableDisableMeshNode,
  changeHotspotColor: ChangeHotspotColorNode,
  changeHotspotIcon: ChangeHotspotIconNode,
  [ACTION_FENCE_TYPE]: ActionFenceNode,
};
