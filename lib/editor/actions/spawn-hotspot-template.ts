import {
  cloneActionGraph,
  createDefaultActionGraph,
} from "@/lib/editor/actions/create-action-graph";
import {
  DEFAULT_HOTSPOT_SHAPE,
  normalizeHotspotShape,
  type HotspotStyle,
  type HotspotType,
} from "@/lib/editor/types/hotspot";
import type { HotspotBlock } from "@/lib/editor/types/hotspot-block";
import type {
  HotspotActionGraph,
  SpawnCoordMode,
  SpawnHotspotTemplate,
} from "@/lib/editor/types/hotspot-action";
import { hotspotTypeColors, markerColorSwatches } from "@/lib/editor/theme/tokens";

const HOTSPOT_TYPES: HotspotType[] = [
  "none",
  "info",
  "warning",
  "spec",
  "link",
];
const HOTSPOT_STYLES: HotspotStyle[] = [
  "dot",
  "number",
  "icon",
  "image",
  "hidden",
];

function asHotspotType(value: unknown): HotspotType {
  return HOTSPOT_TYPES.includes(value as HotspotType)
    ? (value as HotspotType)
    : "none";
}

function asHotspotStyle(value: unknown): HotspotStyle {
  return HOTSPOT_STYLES.includes(value as HotspotStyle)
    ? (value as HotspotStyle)
    : "dot";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function cloneSpawnBlocks(value: unknown): HotspotBlock[] {
  if (!Array.isArray(value)) return [];
  const blocks: HotspotBlock[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    if (!id) continue;
    if (rec.type === "heading" || rec.type === "text") {
      blocks.push({
        id,
        type: rec.type,
        content: typeof rec.content === "string" ? rec.content : "",
      });
      continue;
    }
    if (rec.type === "link") {
      blocks.push({
        id,
        type: "link",
        label: typeof rec.label === "string" ? rec.label : "",
        url: typeof rec.url === "string" ? rec.url : "",
      });
    }
  }
  return blocks;
}

export function createDefaultSpawnHotspotTemplate(): SpawnHotspotTemplate {
  return {
    title: "{{title}}",
    number: "",
    desc: "",
    type: "none",
    color: hotspotTypeColors.none,
    style: "dot",
    shape: DEFAULT_HOTSPOT_SHAPE,
    icon: "Info",
    markerImage: "",
    image: "",
    pulse: false,
    wick: false,
    category: "",
    legendName: "",
    positionX: "{{lng}}",
    positionY: "{{lat}}",
    positionZ: "0",
    blocks: [],
    actions: createDefaultActionGraph(),
  };
}

function asTemplateActions(value: unknown): HotspotActionGraph {
  if (!value || typeof value !== "object") return createDefaultActionGraph();
  const rec = value as Partial<HotspotActionGraph>;
  if (!Array.isArray(rec.nodes) || !Array.isArray(rec.edges) || !rec.trigger) {
    return createDefaultActionGraph();
  }
  try {
    return cloneActionGraph(rec as HotspotActionGraph);
  } catch {
    return createDefaultActionGraph();
  }
}

export function asSpawnCoordMode(value: unknown): SpawnCoordMode {
  if (value === "xyz" || value === "latlon" || value === "auto") return value;
  return "auto";
}

export function asSpawnHotspotTemplate(value: unknown): SpawnHotspotTemplate {
  const fallback = createDefaultSpawnHotspotTemplate();
  if (!value || typeof value !== "object") return fallback;
  const rec = value as Record<string, unknown>;
  const type = asHotspotType(rec.type);
  const color = asString(rec.color, fallback.color);
  return {
    title: asString(rec.title, fallback.title),
    number: asString(rec.number, fallback.number),
    desc: asString(rec.desc, fallback.desc),
    type,
    color:
      /^#[0-9a-fA-F]{6}$/.test(color) || markerColorSwatches.includes(color as never)
        ? color
        : hotspotTypeColors[type],
    style: asHotspotStyle(rec.style),
    shape: normalizeHotspotShape(rec.shape),
    icon: asString(rec.icon, fallback.icon) || "Info",
    markerImage: asString(rec.markerImage),
    image: asString(rec.image),
    pulse: asBoolean(rec.pulse, false),
    wick: asBoolean(rec.wick, false),
    category: asString(rec.category),
    legendName: asString(rec.legendName),
    positionX: asString(rec.positionX, fallback.positionX),
    positionY: asString(rec.positionY, fallback.positionY),
    positionZ: asString(rec.positionZ, fallback.positionZ),
    blocks: cloneSpawnBlocks(rec.blocks),
    actions: asTemplateActions(rec.actions),
  };
}
