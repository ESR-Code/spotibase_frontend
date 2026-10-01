"use client";

import { AuthLinks, AuthShell } from "@/app/auth/_components/auth-shell";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get("password") ?? "");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword,
        token,
      });
      if (resetError) {
        setError(resetError.message || "Could not reset password.");
        return;
      }
      router.push("/auth/sign-in");
    } catch {
      setError("Could not reach the API.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Reset password">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Saving…" : "Update password"}
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
