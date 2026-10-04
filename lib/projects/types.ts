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
