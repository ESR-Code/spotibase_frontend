import type {
  CameraMode,
  SceneTypeDescriptor,
  SceneTypeId,
} from "@/lib/editor/types/scene-type";

const MODEL_TYPE: SceneTypeDescriptor = {
  id: "model",
  label: "3D Model",
  shortLabel: "3D",
  accept: ".glb,model/gltf-binary",
  extensions: ["glb"],
  cameraMode: "orbit",
  subjectControls: {
    scale: true,
    rotation: true,
    reflection: true,
  },
  emptySubjectName: "Default_Box.glb",
  emptySubjectInfo: "Default sample model",
};

const IMAGE_TYPE: SceneTypeDescriptor = {
  id: "image",
  label: "2D Image",
  shortLabel: "2D",
  accept: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
  extensions: ["png", "jpg", "jpeg", "webp"],
  cameraMode: "panZoom",
  subjectControls: {
    scale: true,
    rotation: true,
    reflection: false,
  },
  emptySubjectName: "No image",
  emptySubjectInfo: "Import a PNG, JPG, or WebP",
};

const REGISTRY: Record<SceneTypeId, SceneTypeDescriptor> = {
  model: MODEL_TYPE,
  image: IMAGE_TYPE,
};

export const SCENE_TYPE_IDS: SceneTypeId[] = ["model", "image"];

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
