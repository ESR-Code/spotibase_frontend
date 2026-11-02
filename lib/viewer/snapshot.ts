import { z } from "zod";
import type { EditorAsset } from "@/lib/editor/assets/types";
import { sceneRowSchema, type SceneRow } from "@/lib/editor/persist/schema";

/**
 * Published snapshot (`project_versions.snapshot`, built in SQL by
 * `publish_project_version`, migrations 0007 / 0008). `scenes[]` has the same
 * row shape as the editor's `scenes` table, so it goes straight into
 * `hydrateProject`; only the asset map needs adapting.
 */
const snapshotAssetSchema = z.object({
  r2Key: z.string().min(1),
  kind: z.enum(["model", "image", "other"]),
  contentType: z.string().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
});

const publishedSnapshotSchema = z.object({
  formatVersion: z.literal(1),
  project: z.object({ id: z.string(), name: z.string() }),
  editorData: z.unknown(),
  scenes: z.array(sceneRowSchema),
  assets: z.record(z.string(), snapshotAssetSchema).nullish(),
});

export type PublishedProject = {
  projectId: string;
  name: string;
  editorData: unknown;
  sceneRows: SceneRow[];
  assets: EditorAsset[];
};

export class SnapshotFormatError extends Error {}

export function parsePublishedSnapshot(raw: unknown): PublishedProject {
  const parsed = publishedSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SnapshotFormatError(
      "This tour was published in a format this viewer cannot read. Republish it from the editor.",
    );
  }
  const snapshot = parsed.data;
  const assets: EditorAsset[] = Object.entries(snapshot.assets ?? {}).map(
    ([id, asset]) => ({
      id,
      kind: asset.kind,
      // Library metadata the viewer never shows (names, sizes, dates) is not
      // part of the snapshot.
      name: "",
      filename: "",
      contentType: asset.contentType ?? "",
      size: 0,
      width: asset.width ?? null,
      height: asset.height ?? null,
      r2Key: asset.r2Key,
      sceneId: null,
      createdAt: "",
    }),
  );
  return {
    projectId: snapshot.project.id,
    name: snapshot.project.name,
    editorData: snapshot.editorData,
    sceneRows: snapshot.scenes,
    assets,
  };
}
