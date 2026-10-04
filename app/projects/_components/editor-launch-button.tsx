import { cn } from "@/lib/utils";
import { ArrowRight, Clapperboard } from "lucide-react";
import Link from "next/link";

export function editorHref(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}/editor`;
}

export function EditorLaunchButton({
  projectId,
  label = "Open in Studio Editor",
  className,
}: {
  projectId: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link href={editorHref(projectId)} className={cn("studio-launch-btn", className)}>
      <Clapperboard />
      {label}
      <ArrowRight className="studio-launch-arrow" />
    </Link>
  );
}
