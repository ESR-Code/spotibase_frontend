"use client";

import { AuthLinks, AuthShell } from "@/app/auth/_components/auth-shell";
import { resetPassword } from "@/app/auth/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  if (!token) {
    return (
      <AuthShell title="Reset password">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This page needs a valid reset link from your email.
        </p>
        <AuthLinks current="forgot-password" />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {state?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        ) : null}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {isPending ? "Saving…" : "Update password"}
        </Button>
      </form>
      <AuthLinks current="forgot-password" />
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
