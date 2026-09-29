"use client";

import { AuthLinks, AuthShell } from "@/app/auth/_components/auth-shell";
import { requestPasswordReset } from "@/app/auth/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    null,
  );

  return (
    <AuthShell title="Forgot password">
      {state?.ok ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          If that email is registered, a reset link is on its way.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
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
          {state?.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <AuthLinks current="forgot-password" />
    </AuthShell>
  );
}
