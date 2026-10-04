import { toast } from "@/lib/editor/toast";
import {
  getSceneType,
  isValidSubjectExtension,
} from "@/lib/editor/scene-types/registry";
import { uploadAsset } from "@/lib/editor/assets/upload-asset";
import { useModelStore } from "@/lib/editor/state/model-store";
import { sceneSubjectCache } from "@/lib/editor/state/scene-subject-cache";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

export type ImportSubjectDetail = {
  file: File;
  type: SceneTypeId;
};

/** Import a subject file validated against the active scene type. */
export async function importSubjectFile(file: File) {
  const scene =
    useScenesStore.getState().scenes.find(
      (s) => s.id === useScenesStore.getState().activeSceneId,
    ) ?? null;
  const type: SceneTypeId = scene?.type ?? "model";
  const descriptor = getSceneType(type);

  if (descriptor.engine !== "playcanvas" || descriptor.extensions.length === 0) {
    toast.error(`${descriptor.label} scenes do not import a subject file`);
    return;
  }

  if (!isValidSubjectExtension(type, file.name)) {
    const formats = descriptor.extensions.map((e) => `.${e}`).join(", ");
    toast.error(`Unsupported format for ${descriptor.label}. Use ${formats}`);
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ImportSubjectDetail>("editor:import-subject", {
      detail: { file, type },
    }),
  );
}

/** @deprecated Use importSubjectFile */
export async function importGlbFile(file: File) {
  return importSubjectFile(file);
}

/**
 * Stores an already-loaded subject file in the project library and points
 * the scene at it. Runs in the background so the viewport is not blocked.
 */
export async function uploadSubjectAsset(
  file: File,
  type: SceneTypeId,
  sceneId: string,
) {
  const toastId = toast.message(`Saving ${file.name} to the project…`, {
    duration: 0,
  });
  try {
    const asset = await uploadAsset(file, {
      kind: type === "image" ? "image" : "model",
      sceneId,
    });
    sceneSubjectCache.setAssetId(sceneId, asset.id);
    const scenes = useScenesStore.getState();
    if (scenes.activeSceneId === sceneId) {
      useModelStore.getState().setSubjectAssetId(asset.id);
    } else {
      useScenesStore.setState({
        scenes: scenes.scenes.map((scene) =>
          scene.id === sceneId
            ? { ...scene, model: { ...scene.model, subjectAssetId: asset.id } }
            : scene,
        ),
      });
    }
    toast.dismiss(toastId);
    toast.success(`${file.name} saved to the project`);
  } catch (error) {
    toast.dismiss(toastId);
    toast.error(
      error instanceof Error
        ? `${file.name} was not saved: ${error.message}`
        : `${file.name} was not saved to the project`,
    );
  }
}
