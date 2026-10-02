"use client";

import { ProjectsLoading } from "@/app/projects/_components/projects-loading";
import dynamic from "next/dynamic";

const ProjectsDashboard = dynamic(
  () =>
    import("@/app/projects/_components/projects-dashboard").then(
      (mod) => mod.ProjectsDashboard,
    ),
  { ssr: false, loading: () => <ProjectsLoading /> },
);

export default function ProjectsPage() {
  return <ProjectsDashboard />;
}
