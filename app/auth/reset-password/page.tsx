"use client";

import {
  AuthError,
  AuthField,
  AuthLinks,
  AuthShell,
  AuthSubmit,
} from "@/app/auth/_components/auth-shell";
import { authClient } from "@/lib/auth/client";
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
        <p className="text-center text-sm text-[var(--studio-fg-2)]">
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
    <AuthShell title="Reset password" subtitle="Choose a new password for your account">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <AuthField
          label="New password"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
        <AuthError message={error} />
        <AuthSubmit disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </AuthSubmit>
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
