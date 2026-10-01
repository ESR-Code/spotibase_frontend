"use client";

import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function SessionGate({
  mode,
  children,
}: {
  mode: "guest" | "require";
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    authClient
      .getSession()
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setState(mode === "guest" ? "ready" : "error");
          return;
        }
        const signedIn = Boolean(result.data?.user);
        if (mode === "require" && !signedIn) {
          router.replace("/auth/sign-in");
          return;
        }
        if (mode === "guest" && signedIn) {
          router.replace("/orgs");
          return;
        }
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState(mode === "guest" ? "ready" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [mode, router]);

  if (state === "loading") {
    return (
      <p className="flex min-h-dvh items-center justify-center text-sm text-zinc-500">
        Loading…
      </p>
    );
  }
  if (state === "error") {
    return (
      <p className="flex min-h-dvh items-center justify-center px-4 text-center text-sm text-red-600">
        Could not reach the API.
      </p>
    );
  }
  return children;
}
