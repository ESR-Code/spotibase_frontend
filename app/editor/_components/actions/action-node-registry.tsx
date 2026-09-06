"use client";

import type { NodeProps } from "@xyflow/react";
import {
  Boxes,
  Crosshair,
  ExternalLink,
  Eye,
  GitBranch,
  Globe,
  Hash,
  Highlighter,
  MapPin,
  MapPinned,
  MessagesSquare,
  Palette,
  PanelRightOpen,
  Radio,
  Repeat,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { ChangeHotspotColorNode } from "@/app/editor/_components/actions/change-hotspot-color-node";
import { ChangeHotspotIconNode } from "@/app/editor/_components/actions/change-hotspot-icon-node";
import { ChangeHotspotNumberTitleNode } from "@/app/editor/_components/actions/change-hotspot-number-title-node";
import { EnableDisableNode } from "@/app/editor/_components/actions/enable-disable-node";
import { EnableDisableMeshNode } from "@/app/editor/_components/actions/enable-disable-mesh-node";
import { HighlightMeshNode } from "@/app/editor/_components/actions/highlight-mesh-node";
import { GoToHotspotNode } from "@/app/editor/_components/actions/go-to-hotspot-node";
import { GoToSceneNode } from "@/app/editor/_components/actions/go-to-scene-node";
import { HotspotTriggerNode } from "@/app/editor/_components/actions/hotspot-trigger-node";
import { HttpRequestNode } from "@/app/editor/_components/actions/http-request-node";
import { SubscribeNode } from "@/app/editor/_components/actions/subscribe-node";
import { OpenModalNode } from "@/app/editor/_components/actions/open-modal-node";
import { OpenUrlNode } from "@/app/editor/_components/actions/open-url-node";
import { ForEachNode } from "@/app/editor/_components/actions/for-each-node";
import { SendPostMessageNode } from "@/app/editor/_components/actions/send-post-message-node";
import { SpawnHotspotsNode } from "@/app/editor/_components/actions/spawn-hotspots-node";
import { SwitchNode } from "@/app/editor/_components/actions/switch-node";
import { ActionFenceNode } from "@/app/editor/_components/actions/action-fence-node";
import {
  ACTION_NODE_META,
  type ActionNodeMeta,
} from "@/lib/editor/actions/registry";
import { ACTION_FENCE_TYPE } from "@/lib/editor/types/action-fence";
import { TRIGGER_FLOW_TYPE } from "@/lib/editor/actions/flow-adapter";
import type { ActionNodeType } from "@/lib/editor/types/hotspot-action";

export type ActionMenuGroupId =
  | "navigate"
  | "integrate"
  | "visibility"
  | "appearance"
  | "logic";

export const ACTION_MENU_GROUPS: { id: ActionMenuGroupId; label: string }[] = [
  { id: "navigate", label: "Navigate" },
  { id: "integrate", label: "Integrate" },
  { id: "visibility", label: "Visibility" },
  { id: "appearance", label: "Appearance" },
  { id: "logic", label: "Logic" },
];

export type ActionUiDefinition = {
  type: ActionNodeType;
  meta: ActionNodeMeta;
  icon: LucideIcon;
  accent: string;
  menuGroup: ActionMenuGroupId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Node: ComponentType<NodeProps<any>>;
};

export const ACTION_UI_REGISTRY: Record<ActionNodeType, ActionUiDefinition> = {
  openModal: {
    type: "openModal",
    meta: ACTION_NODE_META.openModal,
    icon: PanelRightOpen,
    accent: "var(--editor-crimson-2)",
    menuGroup: "navigate",
    Node: OpenModalNode,
  },
  goToScene: {
    type: "goToScene",
    meta: ACTION_NODE_META.goToScene,
    icon: MapPinned,
    accent: "var(--editor-amber)",
    menuGroup: "navigate",
    Node: GoToSceneNode,
  },
  goToHotspot: {
    type: "goToHotspot",
    meta: ACTION_NODE_META.goToHotspot,
    icon: Crosshair,
    accent: "#f0a35a",
    menuGroup: "navigate",
    Node: GoToHotspotNode,
  },
  openUrl: {
    type: "openUrl",
    meta: ACTION_NODE_META.openUrl,
    icon: ExternalLink,
    accent: "var(--editor-teal)",
    menuGroup: "navigate",
    Node: OpenUrlNode,
  },
  sendPostMessage: {
    type: "sendPostMessage",
    meta: ACTION_NODE_META.sendPostMessage,
    icon: MessagesSquare,
    accent: "#7aa2ff",
    menuGroup: "integrate",
    Node: SendPostMessageNode,
  },
  httpRequest: {
    type: "httpRequest",
    meta: ACTION_NODE_META.httpRequest,
    icon: Globe,
    accent: "#56c8a0",
    menuGroup: "integrate",
    Node: HttpRequestNode,
  },
  subscribe: {
    type: "subscribe",
    meta: ACTION_NODE_META.subscribe,
    icon: Radio,
    accent: "#4cc9f0",
    menuGroup: "integrate",
    Node: SubscribeNode,
  },
  enableDisable: {
    type: "enableDisable",
    meta: ACTION_NODE_META.enableDisable,
    icon: Eye,
    accent: "#c4a35a",
    menuGroup: "visibility",
    Node: EnableDisableNode,
  },
  enableDisableMesh: {
    type: "enableDisableMesh",
    meta: ACTION_NODE_META.enableDisableMesh,
    icon: Boxes,
    accent: "#8eb5d4",
    menuGroup: "visibility",
    Node: EnableDisableMeshNode,
  },
  highlightMesh: {
    type: "highlightMesh",
    meta: ACTION_NODE_META.highlightMesh,
    icon: Highlighter,
    accent: "#ffd166",
    menuGroup: "visibility",
    Node: HighlightMeshNode,
  },
  changeHotspotColor: {
    type: "changeHotspotColor",
    meta: ACTION_NODE_META.changeHotspotColor,
    icon: Palette,
    accent: "#ff7a59",
    menuGroup: "appearance",
    Node: ChangeHotspotColorNode,
  },
  changeHotspotIcon: {
    type: "changeHotspotIcon",
    meta: ACTION_NODE_META.changeHotspotIcon,
    icon: Shapes,
    accent: "#6ec6ff",
    menuGroup: "appearance",
    Node: ChangeHotspotIconNode,
  },
  changeHotspotNumberTitle: {
    type: "changeHotspotNumberTitle",
    meta: ACTION_NODE_META.changeHotspotNumberTitle,
    icon: Hash,
    accent: "#a78bfa",
    menuGroup: "appearance",
    Node: ChangeHotspotNumberTitleNode,
  },
  forEach: {
    type: "forEach",
    meta: ACTION_NODE_META.forEach,
    icon: Repeat,
    accent: "#5ad0c8",
    menuGroup: "logic",
    Node: ForEachNode,
  },
  spawnHotspots: {
    type: "spawnHotspots",
    meta: ACTION_NODE_META.spawnHotspots,
    icon: MapPin,
    accent: "#e07a5f",
    menuGroup: "logic",
    Node: SpawnHotspotsNode,
  },
  switch: {
    type: "switch",
    meta: ACTION_NODE_META.switch,
    icon: GitBranch,
    accent: "#c9a227",
    menuGroup: "logic",
    Node: SwitchNode,
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
  subscribe: SubscribeNode,
  enableDisable: EnableDisableNode,
  enableDisableMesh: EnableDisableMeshNode,
  highlightMesh: HighlightMeshNode,
  changeHotspotColor: ChangeHotspotColorNode,
  changeHotspotIcon: ChangeHotspotIconNode,
  changeHotspotNumberTitle: ChangeHotspotNumberTitleNode,
  forEach: ForEachNode,
  spawnHotspots: SpawnHotspotsNode,
  switch: SwitchNode,
  [ACTION_FENCE_TYPE]: ActionFenceNode,
};
