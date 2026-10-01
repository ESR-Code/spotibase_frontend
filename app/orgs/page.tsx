"use client";

import { authClient } from "@/lib/auth/client";
import { SessionGate } from "@/lib/auth/session-gate";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function OrgsHome() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authClient.getSession().then((result) => {
      if (!cancelled) setEmail(result.data?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSignOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/auth/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-4 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500">
        {email ? `Signed in as ${email}` : "Signed in"}
      </p>
      <h1 className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Organizations &amp; projects
      </h1>
      <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
        Placeholder. Org and project lists will go here.
      </p>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={onSignOut}
        className="text-zinc-700 dark:text-zinc-300"
      >
        Sign out
      </Button>
    </div>
  );
}

export default function OrgsPlaceholderPage() {
  return (
    <SessionGate mode="require">
      <OrgsHome />
    </SessionGate>
  );
}
