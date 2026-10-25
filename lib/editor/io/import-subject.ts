import { toast } from "@/lib/editor/toast";
import {
  getSceneType,
  isValidSubjectExtension,
} from "@/lib/editor/scene-types/registry";
import { ASSET_LIMITS, formatAssetSize } from "@/lib/editor/assets/api";
import { uploadAsset } from "@/lib/editor/assets/upload-asset";
import { useAlignmentSessionStore } from "@/lib/editor/state/alignment-session-store";
import { useEditorStore } from "@/lib/editor/state/editor-store";
import { useModelStore } from "@/lib/editor/state/model-store";
import { sceneSubjectCache } from "@/lib/editor/state/scene-subject-cache";
import { useScenesStore } from "@/lib/editor/state/scenes-store";
import type { SceneTypeId } from "@/lib/editor/types/scene-type";

/**
 * Longest side of a 2D subject image. The file is decoded into one GPU texture
 * (RGBA, plus mips): 8192 px is ~350 MB of video memory and the safe ceiling
 * on common GPUs.
 */
export const SUBJECT_IMAGE_MAX_SIDE = 8192;

async function imageSideLength(file: File): Promise<number | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.max(bitmap.width, bitmap.height);
    bitmap.close();
    return side;
  } catch {
    return null;
  }
}

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

  // Replacing the subject under a running Preview or a half-picked alignment
  // would leave the session (and the control points) pointing at the old one.
  if (useEditorStore.getState().isPreview) {
    toast.error("Exit Preview to replace the subject");
    return;
  }
  if (useAlignmentSessionStore.getState().open) {
    toast.error("Finish or cancel the georeference alignment first");
    return;
  }

  // Same limit the project library enforces on upload, checked before the file
  // is read into memory and decoded.
  const limit = ASSET_LIMITS[type === "image" ? "image" : "model"].maxBytes;
  if (file.size > limit) {
    toast.error(
      `${file.name} is ${formatAssetSize(file.size)}. The limit is ${formatAssetSize(limit)}.`,
    );
    return;
  }
  if (type === "image") {
    const side = await imageSideLength(file);
    if (side != null && side > SUBJECT_IMAGE_MAX_SIDE) {
      toast.error(
        `${file.name} is ${side}px wide or tall. The limit is ${SUBJECT_IMAGE_MAX_SIDE}px; scale it down first.`,
      );
      return;
    }
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
