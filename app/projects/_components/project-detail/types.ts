import type {
  OrganizationSummary,
  ProjectFolderRow,
  ProjectRow,
} from "@/lib/projects/types";

export type ProjectTabId = "details" | "analytics" | "settings";

/** Everything a tab panel needs; resolved once by `ProjectDetail`. */
export type ProjectTabProps = {
  project: ProjectRow;
  folder: ProjectFolderRow | null;
  folders: ProjectFolderRow[];
  organization: OrganizationSummary | null;
  onTabChange: (tab: ProjectTabId) => void;
};
