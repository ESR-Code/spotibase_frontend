import { plural } from "@/app/projects/_lib/format";
import { Layers } from "lucide-react";

export function WorkspaceSummary({
  orgName,
  projectCount,
  folderCount,
  foldered,
  sceneCount,
}: {
  orgName: string;
  projectCount: number;
  folderCount: number;
  foldered: number;
  sceneCount: number;
}) {
  const organizedPct = projectCount ? Math.round((foldered / projectCount) * 100) : 0;

  return (
    <section className="studio-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-4">
        <span className="studio-dialog-icon">
          <Layers />
        </span>
        <div className="min-w-0">
          <h2 className="studio-heading text-lg leading-tight">Workspace overview</h2>
          <p className="mt-0.5 text-xs font-semibold text-[var(--studio-muted)]">
            {plural(projectCount, "project")} · {plural(folderCount, "folder")} · {plural(sceneCount, "scene")} in{" "}
            <span className="text-[var(--studio-fg-2)]">{orgName}</span>
          </p>
        </div>
      </div>
      <div className="w-full sm:w-64">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
          <span className="text-[var(--studio-muted)]">Organized in folders</span>
          <span className="font-mono text-[var(--studio-fg-2)]">
            {foldered} / {projectCount} ({organizedPct}%)
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--studio-chip)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff7186] to-[#fd4f6a] shadow-[0_0_12px_rgba(253,79,106,0.6)] transition-[width] duration-700 ease-out"
            style={{ width: `${organizedPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
