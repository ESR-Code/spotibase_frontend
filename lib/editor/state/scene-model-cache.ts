export type CachedModel = {
  fileName: string;
  buffer: ArrayBuffer;
};

const cache = new Map<string, CachedModel>();

export const sceneModelCache = {
  get(sceneId: string): CachedModel | undefined {
    return cache.get(sceneId);
  },
  set(sceneId: string, value: CachedModel): void {
    cache.set(sceneId, value);
  },
  delete(sceneId: string): void {
    cache.delete(sceneId);
  },
  clear(): void {
    cache.clear();
  },
};
