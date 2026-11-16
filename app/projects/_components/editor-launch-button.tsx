import { viewerHref } from "@/lib/projects/api";
import { cn } from "@/lib/utils";
import { ArrowRight, Clapperboard, Play } from "lucide-react";
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

/** Opens the project's live published version in the public viewer (new tab). */
export function ViewerPlayButton({
  projectId,
  version,
  className,
}: {
  projectId: string;
  version: number;
  className?: string;
}) {
  return (
    <a
      href={viewerHref(projectId)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("studio-play-btn", className)}
      title={`Open published version ${version} in a new tab`}
    >
      <Play />
      Play
      <span className="studio-play-version">v{version}</span>
    </a>
  );
}
