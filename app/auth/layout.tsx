import { SessionGate } from "@/lib/auth/session-gate";
import type { ReactNode } from "react";
import "@/app/projects/projects-theme.css";
import "./auth-theme.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="studio-root">
      <SessionGate mode="guest">{children}</SessionGate>
    </div>
  );
}
