import { SessionGate } from "@/lib/auth/session-gate";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <SessionGate mode="guest">{children}</SessionGate>;
}
