"use client";

import { ProjectsFooter } from "@/app/projects/_components/projects-footer";
import { ProjectsTopbar } from "@/app/projects/_components/projects-topbar";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function ProjectDetailStub() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex min-h-dvh flex-col">
      <ProjectsTopbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center sm:px-6">
        <span className="studio-dialog-icon h-14 w-14 rounded-2xl">
          <Sparkles />
        </span>
        <div className="studio-enter">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--studio-muted-2)]">Project workspace</p>
          <h1 className="studio-heading mt-2 text-4xl">Coming soon</h1>
          <p className="mx-auto mt-3 max-w-md text-[var(--studio-muted)]">
            The dedicated project page isn&apos;t available yet. It will open scenes and the editor for this project.
          </p>
        </div>
        <code className="max-w-full truncate rounded-lg bg-[var(--studio-card)] px-3 py-1.5 text-xs text-[var(--studio-muted)]">
          {id}
        </code>
        <Link href="/projects" className="studio-btn studio-btn-primary">
          <ArrowLeft />
          Back to projects
        </Link>
      </main>
      <ProjectsFooter />
    </div>
  );
}
