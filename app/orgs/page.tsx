"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Legacy path — product landing is `/projects`. */
export default function OrgsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects");
  }, [router]);

  return (
    <p className="flex min-h-dvh items-center justify-center text-sm text-zinc-500">
      Loading…
    </p>
  );
}
