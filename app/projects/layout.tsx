import { studioFontClass } from "@/app/projects/_lib/fonts";
import { SessionGate } from "@/lib/auth/session-gate";
import "./projects-theme.css";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${studioFontClass} studio-root`}>
      <SessionGate mode="require">{children}</SessionGate>
    </div>
  );
}
