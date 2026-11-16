"use client";

import {
  AuthError,
  AuthField,
  AuthLinks,
  AuthShell,
  AuthSubmit,
} from "@/app/auth/_components/auth-shell";
import { authClient } from "@/lib/auth/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message || "Failed to sign in.");
        return;
      }
      router.push("/projects");
    } catch {
      setError("Could not reach the API.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back to Spotibase"
      subtitle="Sign in to continue to your studio"
      footer="Your projects and media stay private to your organization."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <AuthField
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Enter your email"
        />
        <AuthField
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          aside={
            <Link href="/auth/forgot-password" className="auth-link text-xs">
              Forgot password?
            </Link>
          }
        />
        <AuthError message={error} />
        <AuthSubmit disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </AuthSubmit>
      </form>
      <AuthLinks current="sign-in" />
    </AuthShell>
  );
}
