import { toast } from "sonner";
import {
  getSceneType,
  isValidSubjectExtension,
} from "@/lib/editor/scene-types/registry";
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
