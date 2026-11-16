import { BrandMark } from "@/app/projects/_components/projects-topbar";
import { AuthIllustration } from "@/app/auth/_components/auth-illustration";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function AuthHero() {
  return (
    <aside className="auth-hero hidden min-h-[560px] flex-col p-8 lg:flex xl:p-12">
      <div className="flex flex-1 items-center justify-center py-6">
        <AuthIllustration className="h-auto w-full max-w-[560px]" />
      </div>

      <div>
        <h2 className="studio-heading max-w-md text-[26px] leading-tight xl:text-[30px]">
          Bring every space to life, one hotspot at a time
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--studio-muted)]">
          Place hotspots on 3D models, images, and geo maps, wire their behavior
          with action graphs, and publish a viewer anywhere.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Scene types">
          {["3D models", "Images", "Geo maps"].map((t) => (
            <li key={t} className="auth-chip">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh flex-1 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthHero />

      <main className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-5">
              <BrandMark href="/auth/sign-in" compact />
            </span>
            <h1 className="studio-heading text-2xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm text-[var(--studio-muted)]">{subtitle}</p>
            ) : null}
          </div>

          {children}

          {footer ? (
            <div className="mt-8 text-center text-xs leading-relaxed text-[var(--studio-muted)]">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export function AuthField({
  label,
  id,
  aside,
  ...inputProps
}: { label: string; id: string; aside?: ReactNode } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
        {aside}
      </div>
      <input id={id} name={id} className="studio-input" {...inputProps} />
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-[var(--studio-accent-2)]">
      {message}
    </p>
  );
}

export function AuthSubmit({ children, ...props }: ComponentProps<"button">) {
  return (
    <button type="submit" className="studio-btn studio-btn-primary h-[42px] w-full text-sm" {...props}>
      {children}
    </button>
  );
}

export function AuthLinks({
  current,
}: {
  current: "sign-in" | "sign-up" | "forgot-password";
}) {
  return (
    <p className="mt-6 text-center text-sm text-[var(--studio-muted)]">
      {current === "sign-in" ? (
        <>
          New to Spotibase?{" "}
          <Link href="/auth/sign-up" className="auth-link">
            Create an account
          </Link>
        </>
      ) : (
        <>
          {current === "sign-up" ? "Already have an account?" : "Remembered it?"}{" "}
          <Link href="/auth/sign-in" className="auth-link">
            Sign in
          </Link>
        </>
      )}
    </p>
  );
}
