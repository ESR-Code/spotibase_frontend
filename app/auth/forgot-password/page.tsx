"use client";

import {
  AuthError,
  AuthField,
  AuthLinks,
  AuthShell,
  AuthSubmit,
} from "@/app/auth/_components/auth-shell";
import { authClient } from "@/lib/auth/client";
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
    <AuthShell
      title="Forgot your password?"
      subtitle="We'll email you a link to reset it"
    >
      {ok ? (
        <p className="text-center text-sm text-[var(--studio-fg-2)]">
          If that email is registered, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <AuthField
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email"
          />
          <AuthError message={error} />
          <AuthSubmit disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </AuthSubmit>
        </form>
      )}
      <AuthLinks current="forgot-password" />
    </AuthShell>
  );
}
