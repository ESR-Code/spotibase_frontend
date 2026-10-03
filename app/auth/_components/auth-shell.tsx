import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-1 text-center text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Spotibase
        </p>
        <h1 className="mb-6 text-center text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

export function AuthLinks({
  current,
}: {
  current: "sign-in" | "sign-up" | "forgot-password";
}) {
  const linkClass = "text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400";
  return (
    <nav className="mt-6 flex flex-col items-center gap-2">
      {current !== "sign-in" ? (
        <Link href="/auth/sign-in" className={linkClass}>
          Sign in
        </Link>
      ) : null}
      {current !== "forgot-password" ? (
        <Link href="/auth/forgot-password" className={linkClass}>
          Forgot password
        </Link>
      ) : null}
      {current !== "sign-up" ? (
        <Link href="/auth/sign-up" className={linkClass}>
          Create an account
        </Link>
      ) : null}
    </nav>
  );
}
