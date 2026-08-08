import type { SceneTypeId } from "@/lib/editor/types/scene-type";

export type CachedSubject = {
  kind: SceneTypeId;
  fileName: string;
  buffer: ArrayBuffer;
};

const cache = new Map<string, CachedSubject>();

export const sceneSubjectCache = {
  get(sceneId: string): CachedSubject | undefined {
    return cache.get(sceneId);
  },
  set(sceneId: string, value: CachedSubject): void {
    cache.set(sceneId, value);
  },
  delete(sceneId: string): void {
    cache.delete(sceneId);
  },
  clear(): void {
    cache.clear();
  },
};

/** @deprecated Use sceneSubjectCache */
export const sceneModelCache = sceneSubjectCache;
