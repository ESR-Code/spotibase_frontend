"use client";

import { ProjectsLoading } from "@/app/projects/_components/projects-loading";
import dynamic from "next/dynamic";

const ProjectDetailStub = dynamic(
  () =>
    import("@/app/projects/_components/project-detail-stub").then(
      (mod) => mod.ProjectDetailStub,
    ),
  { ssr: false, loading: () => <ProjectsLoading /> },
);

export default function ProjectDetailPage() {
  return <ProjectDetailStub />;
}
