"use client";

import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    authClient
      .getSession()
      .then((result) => {
        router.replace(result.data?.user ? "/projects" : "/auth/sign-in");
      })
      .catch(() => {
        router.replace("/auth/sign-in");
      });
  }, [router]);

  return (
    <p className="flex min-h-dvh items-center justify-center text-sm text-zinc-500">
      Loading…
    </p>
  );
}
