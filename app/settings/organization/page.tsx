"use client";

import { ProjectsLoading } from "@/app/projects/_components/projects-loading";
import dynamic from "next/dynamic";

const OrganizationSettings = dynamic(
  () =>
    import("@/app/settings/_components/organization-settings").then(
      (mod) => mod.OrganizationSettings,
    ),
  { ssr: false, loading: () => <ProjectsLoading /> },
);

export default function OrganizationSettingsPage() {
  return <OrganizationSettings />;
}
