import { AnalyticsTab } from "@/app/projects/_components/project-detail/analytics-tab";
import { DetailsTab } from "@/app/projects/_components/project-detail/details-tab";
import { SettingsTab } from "@/app/projects/_components/project-detail/settings-tab";
import type { ProjectTabId, ProjectTabProps } from "@/app/projects/_components/project-detail/types";
import type { StudioLineTabItem } from "@/app/projects/_components/studio-line-tabs";
import { ChartColumn, Info, SlidersHorizontal } from "lucide-react";
import type { ComponentType } from "react";

export type ProjectTabDefinition = StudioLineTabItem<ProjectTabId> & {
  Panel: ComponentType<ProjectTabProps>;
};

/** Add a tab here: it shows up in the tab bar and is reachable via `?tab=<id>`. */
export const PROJECT_TABS: readonly ProjectTabDefinition[] = [
  { id: "details", label: "Project Details", icon: <Info />, color: "var(--studio-accent)", Panel: DetailsTab },
  { id: "analytics", label: "Analytics & Reach", icon: <ChartColumn />, color: "var(--studio-teal)", Panel: AnalyticsTab },
  { id: "settings", label: "Settings", icon: <SlidersHorizontal />, color: "#f4b740", Panel: SettingsTab },
];

export const DEFAULT_PROJECT_TAB: ProjectTabId = "details";

export function isProjectTab(value: string | null): value is ProjectTabId {
  return PROJECT_TABS.some((tab) => tab.id === value);
}
