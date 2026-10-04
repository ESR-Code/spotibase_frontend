import { redirect } from "next/navigation";

export default async function LegacyEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.project;
  const project = Array.isArray(raw) ? raw[0] : raw;
  if (project && !project.includes("/") && !project.includes("..")) {
    redirect(`/projects/${encodeURIComponent(project)}/editor`);
  }
  redirect("/projects");
}
