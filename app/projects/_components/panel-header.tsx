import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PanelHeader({
  title,
  subtitle,
  icon,
  aside,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="studio-heading flex items-center gap-2 text-xl leading-tight">
          {icon ? (
            <span className="text-[var(--studio-accent)] [&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</span>
          ) : null}
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs font-semibold text-[var(--studio-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {aside}
    </div>
  );
}

export function PanelBadge({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--studio-line-strong)] bg-[var(--studio-sub)] px-2 py-1 text-[10px] font-bold text-[var(--studio-muted)] [&_svg]:h-3 [&_svg]:w-3">
      {icon}
      {children}
    </span>
  );
}
