"use client";

import { ProjectsLoading } from "@/app/projects/_components/projects-loading";
import { isOrganizationSection } from "@/app/settings/_components/settings-sections";
import dynamic from "next/dynamic";
import { notFound, useParams } from "next/navigation";

const OrganizationSettings = dynamic(
  () =>
    import("@/app/settings/_components/organization-settings").then(
      (mod) => mod.OrganizationSettings,
    ),
  { ssr: false, loading: () => <ProjectsLoading /> },
);

export default function OrganizationSettingsPage() {
  const { section } = useParams<{ section: string }>();
  if (!isOrganizationSection(section)) notFound();
  return <OrganizationSettings section={section} />;
}
