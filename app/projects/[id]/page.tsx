"use client";

import { ProjectsLoading } from "@/app/projects/_components/projects-loading";
import dynamic from "next/dynamic";

const ProjectDetail = dynamic(
  () =>
    import("@/app/projects/_components/project-detail/project-detail").then(
      (mod) => mod.ProjectDetail,
    ),
  { ssr: false, loading: () => <ProjectsLoading /> },
);

export default function ProjectDetailPage() {
  return <ProjectDetail />;
}
