import type {
  CameraMode,
  SceneEngine,
  SceneTypeDescriptor,
  SceneTypeId,
} from "@/lib/editor/types/scene-type";

const MODEL_TYPE: SceneTypeDescriptor = {
  id: "model",
  label: "3D Model",
  shortLabel: "3D",
  description: "Orbit a 3D model",
  accept: ".glb,model/gltf-binary",
  extensions: ["glb"],
  engine: "playcanvas",
  cameraMode: "orbit",
  subjectControls: {
    scale: true,
    rotation: true,
    reflection: true,
  },
  settingsSections: {
    grid: true,
    effects: true,
    environment: true,
    camera: true,
    geoDetails: false,
    mapStyle: false,
  },
  outlinerTabs: {
    layers: false,
  },
  emptySubjectName: "Default_Box.glb",
  emptySubjectInfo: "Default sample model",
};

const IMAGE_TYPE: SceneTypeDescriptor = {
  id: "image",
  label: "2D Image",
  shortLabel: "2D",
  description: "Pan & zoom image plane",
  accept: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
  extensions: ["png", "jpg", "jpeg", "webp"],
  engine: "playcanvas",
  cameraMode: "panZoom",
  subjectControls: {
    scale: true,
    rotation: true,
    reflection: false,
  },
  settingsSections: {
    grid: true,
    effects: false,
    environment: true,
    camera: true,
    geoDetails: false,
    mapStyle: false,
  },
  outlinerTabs: {
    layers: false,
  },
  emptySubjectName: "No image",
  emptySubjectInfo: "Import a PNG, JPG, or WebP",
};

const GEO_TYPE: SceneTypeDescriptor = {
  id: "geo",
  label: "Geo map",
  shortLabel: "Map",
  description: "Globe with pan, zoom, and markers",
  accept: "",
  extensions: [],
  engine: "map",
  cameraMode: "globe",
  subjectControls: {
    scale: false,
    rotation: false,
    reflection: false,
  },
  settingsSections: {
    grid: false,
    effects: false,
    environment: false,
    camera: true,
    geoDetails: true,
    mapStyle: true,
  },
  outlinerTabs: {
    layers: true,
  },
  emptySubjectName: "Earth",
  emptySubjectInfo: "World globe — set start coordinates in Scene Settings",
};

const REGISTRY: Record<SceneTypeId, SceneTypeDescriptor> = {
  model: MODEL_TYPE,
  image: IMAGE_TYPE,
  geo: GEO_TYPE,
};

export const SCENE_TYPE_IDS: SceneTypeId[] = ["model", "image", "geo"];

export function getSceneType(id: SceneTypeId): SceneTypeDescriptor {
  return REGISTRY[id];
}

export function getSceneTypeOrDefault(
  id: SceneTypeId | undefined | null,
): SceneTypeDescriptor {
  return REGISTRY[id ?? "model"] ?? MODEL_TYPE;
}

export function getCameraModeForSceneType(id: SceneTypeId): CameraMode {
  return getSceneType(id).cameraMode;
}

export function getSceneEngine(id: SceneTypeId): SceneEngine {
  return getSceneType(id).engine;
}

export function isPlayCanvasSceneType(id: SceneTypeId): boolean {
  return getSceneEngine(id) === "playcanvas";
}

export function isGeoSceneType(id: SceneTypeId): boolean {
  return id === "geo";
}

export function isValidSubjectExtension(
  typeId: SceneTypeId,
  fileName: string,
): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return false;
  return getSceneType(typeId).extensions.includes(ext);
}

export function listSceneTypes(): SceneTypeDescriptor[] {
  return SCENE_TYPE_IDS.map((id) => REGISTRY[id]);
}
