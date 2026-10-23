import type { FolderColor } from "@/lib/projects/folder-colors";

export type { FolderColor };

export type ProjectFolderRow = {
  id: string;
  organization_id: string;
  name: string;
  color: FolderColor;
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
  id: string;
  organization_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  scene_count: number;
  thumbnail_r2_key: string | null;
  editor_revision: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt?: string | Date;
  metadata?: unknown;
};

/** Org membership row from Neon Auth `organization.listMembers`. */
export type OrganizationMember = {
  id: string;
  userId: string;
  role: string;
  createdAt?: string | Date;
  user?: { name?: string | null; email?: string | null; image?: string | null };
};

/** Rollup from `public.project_asset_stats` — ready files only. */
export type ProjectAssetStats = {
  total_bytes: number;
  image_count: number;
  model_count: number;
  other_count: number;
};
