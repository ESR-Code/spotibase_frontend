import { plural } from "@/app/projects/_lib/format";
import { Folder, Layers, LayoutGrid } from "lucide-react";

export function WorkspaceSummary({
  projectCount,
  folderCount,
  foldered,
  sceneCount,
}: {
  projectCount: number;
  folderCount: number;
  foldered: number;
  sceneCount: number;
}) {
  const organizedPct = projectCount ? Math.round((foldered / projectCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--studio-line)] pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatChip icon={<LayoutGrid />} label={plural(projectCount, "project")} />
        <StatChip icon={<Folder />} label={plural(folderCount, "folder")} />
        <StatChip icon={<Layers />} label={plural(sceneCount, "scene")} />
      </div>
      <div className="min-w-0 sm:w-56 lg:w-64">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
          <span className="text-[var(--studio-muted)]">In folders</span>
          <span className="font-mono text-[var(--studio-fg-2)]">
            {foldered}/{projectCount} · {organizedPct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--studio-chip)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff7186] to-[#fd4f6a] shadow-[0_0_12px_rgba(253,79,106,0.6)] transition-[width] duration-700 ease-out"
            style={{ width: `${organizedPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--studio-chip)] px-2.5 py-1 text-[11px] font-bold text-[var(--studio-fg-2)]">
      <span className="text-[var(--studio-muted)] [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      {label}
    </span>
  );
}
