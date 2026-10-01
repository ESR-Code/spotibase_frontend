"use client";

import { AuthLinks, AuthShell } from "@/app/auth/_components/auth-shell";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ok, setOk] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Email is required.");
      return;
    }

    setPending(true);
    setError(null);
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? window.location.origin;
    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${origin}/auth/reset-password`,
      });
      if (resetError) {
        setError(resetError.message || "Could not send reset email.");
        return;
      }
      setOk(true);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Forgot password">
      {ok ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          If that email is registered, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <AuthLinks current="forgot-password" />
    </AuthShell>
  );
}
