import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/** Highest first. A member can carry several roles (`"owner,admin"`). */
const ROLE_RANK = ["owner", "admin", "member"] as const;

export function formatRole(role: string | null | undefined) {
  if (!role) return "—";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function primaryRole(role: string) {
  const roles = role.split(",").map((r) => r.trim().toLowerCase());
  return ROLE_RANK.find((r) => roles.includes(r)) ?? "other";
}

/** Color-coded role pill (owner / admin / member). Colors live in `.studio-role` in `projects-theme.css`. */
export function RoleBadge({
  role,
  chevron,
  className,
}: {
  role: string;
  /** Adds a dropdown chevron, for use inside a menu trigger. */
  chevron?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("studio-role", className)} data-role={primaryRole(role)}>
      {formatRole(role)}
      {chevron ? <ChevronDown className="h-3 w-3" /> : null}
    </span>
  );
}
