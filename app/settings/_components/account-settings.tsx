"use client";

import { Avatar } from "@/app/projects/_components/avatar";
import { FormError, StudioField } from "@/app/projects/_components/studio-dialog";
import {
  errorMessage,
  formatDate,
  SavedNote,
  SettingsError,
  SettingsSection,
  SettingsShell,
  SettingsSkeleton,
} from "@/app/settings/_components/settings-shell";
import type { AccountSection } from "@/app/settings/_components/settings-sections";
import { SessionNotFreshError, type CurrentUser } from "@/lib/auth/account";
import { authClient } from "@/lib/auth/client";
import {
  useAuthAccounts,
  useChangePassword,
  useCurrentAccount,
  useRevokeOtherSessions,
  useUpdateProfile,
  useUserSessions,
} from "@/lib/auth/hooks";
import { Check, LoaderCircle, LogOut, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const MIN_PASSWORD_LENGTH = 8;

function ProfileSection({ user }: { user: CurrentUser }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(user.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = name.trim() !== (user.name ?? "");
  const pending = update.isPending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !dirty) return;
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync(name);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, "Failed to update profile"));
    }
  }

  return (
    <SettingsSection id="profile" title="Profile" subtitle="Your name and sign-in email">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name.trim() || user.email} size={56} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--studio-fg)]">{user.name || user.email}</p>
            <p className="text-xs font-semibold text-[var(--studio-muted)]">Member since {formatDate(user.createdAt)}</p>
          </div>
        </div>

        <StudioField label="Full name" htmlFor="profile-name">
          <input
            id="profile-name"
            required
            maxLength={80}
            value={name}
            disabled={pending}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            className="studio-input"
            autoComplete="name"
          />
        </StudioField>

        <StudioField label="Email address" htmlFor="account-email">
          <div className="flex items-center gap-2">
            <input id="account-email" value={user.email} readOnly disabled className="studio-input min-w-0 flex-1" />
            <span className="studio-pill shrink-0">{user.emailVerified ? "Verified" : "Unverified"}</span>
          </div>
          <p className="text-xs font-semibold text-[var(--studio-muted)]">
            Changing your sign-in email isn&apos;t supported yet. Ask an administrator if you need it updated.
          </p>
        </StudioField>

        <FormError error={error} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {saved && !dirty ? (
            <SavedNote>
              <Check className="h-3.5 w-3.5" />
              Profile updated
            </SavedNote>
          ) : null}
          <button
            type="button"
            className="studio-btn studio-btn-ghost"
            onClick={() => {
              setName(user.name ?? "");
              setError(null);
            }}
            disabled={!dirty || pending}
          >
            Cancel changes
          </button>
          <button type="submit" className="studio-btn studio-btn-primary" disabled={!dirty || !name.trim() || pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {pending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const pending = change.isPending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next, revokeOtherSessions: revokeOthers });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, "Failed to change password"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <StudioField label="Current password" htmlFor="password-current">
        <input
          id="password-current"
          type="password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="studio-input"
          autoComplete="current-password"
        />
      </StudioField>
      <div className="grid gap-4 sm:grid-cols-2">
        <StudioField label="New password" htmlFor="password-new">
          <input
            id="password-new"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="studio-input"
            autoComplete="new-password"
          />
        </StudioField>
        <StudioField label="Confirm new password" htmlFor="password-confirm">
          <input
            id="password-confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="studio-input"
            autoComplete="new-password"
          />
        </StudioField>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--studio-fg-2)]">
        <input
          type="checkbox"
          checked={revokeOthers}
          onChange={(e) => setRevokeOthers(e.target.checked)}
          className="h-4 w-4 accent-[var(--studio-accent)]"
        />
        Sign out of other devices
      </label>

      <FormError error={error} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {saved ? (
          <SavedNote>
            <Check className="h-3.5 w-3.5" />
            Password changed
          </SavedNote>
        ) : null}
        <button type="submit" className="studio-btn studio-btn-primary" disabled={pending || !current || !next || !confirm}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

function describeAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "Unknown device";
  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : "Browser";
  const os =
    /Windows/.test(userAgent) ? "Windows"
    : /iPhone|iPad/.test(userAgent) ? "iOS"
    : /Mac OS X/.test(userAgent) ? "macOS"
    : /Android/.test(userAgent) ? "Android"
    : /Linux/.test(userAgent) ? "Linux"
    : null;
  return os ? `${browser} on ${os}` : browser;
}

function ReauthPrompt({ message }: { message: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onReauth() {
    setPending(true);
    await authClient.signOut();
    router.push("/auth/sign-in");
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-[10px] border border-[var(--studio-line-strong)] bg-[var(--studio-sub)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-[var(--studio-fg-2)]">{message}</p>
      <button type="button" className="studio-btn studio-btn-ghost shrink-0" onClick={() => void onReauth()} disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
        Sign in again
      </button>
    </div>
  );
}

function SessionsList({ currentToken }: { currentToken: string | null }) {
  const sessions = useUserSessions();
  const revoke = useRevokeOtherSessions();
  const [error, setError] = useState<string | null>(null);
  const rows = sessions.data ?? [];
  const others = rows.filter((s) => s.token !== currentToken).length;

  async function onRevoke() {
    setError(null);
    try {
      await revoke.mutateAsync();
    } catch (e) {
      setError(errorMessage(e, "Failed to sign out other sessions"));
    }
  }

  if (sessions.isLoading) return <SettingsSkeleton rows={2} />;
  if (sessions.error instanceof SessionNotFreshError) return <ReauthPrompt message={sessions.error.message} />;
  if (sessions.isError) {
    return (
      <SettingsError
        message={errorMessage(sessions.error, "Failed to load sessions")}
        onRetry={() => void sessions.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-[var(--studio-line)]">
        {rows.map((session) => (
          <li key={session.id} className="flex items-center gap-3 py-3 first:pt-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--studio-sub)] text-[var(--studio-muted)] [&_svg]:h-4 [&_svg]:w-4">
              <Monitor />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--studio-fg)]">
                <span className="truncate">{describeAgent(session.userAgent)}</span>
                {session.token === currentToken ? (
                  <span className="studio-pill shrink-0 text-[10px]">This device</span>
                ) : null}
              </p>
              <p className="truncate text-xs font-semibold text-[var(--studio-muted)]">
                {session.ipAddress || "Unknown IP"} · Last active {formatDate(session.updatedAt ?? session.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <FormError error={error} />
      <div className="flex justify-end">
        <button
          type="button"
          className="studio-btn studio-btn-ghost"
          onClick={() => void onRevoke()}
          disabled={others === 0 || revoke.isPending}
        >
          {revoke.isPending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
          Sign out other sessions
        </button>
      </div>
    </div>
  );
}

function SecuritySection({ currentToken }: { currentToken: string | null }) {
  const accounts = useAuthAccounts();
  const hasPassword = accounts.data?.some((a) => a.providerId === "credential") ?? false;

  return (
    <SettingsSection id="security" title="Security" subtitle="Password and signed-in devices">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h3 className="studio-eyebrow">Password</h3>
          {accounts.isLoading ? (
            <SettingsSkeleton rows={2} />
          ) : accounts.isError ? (
            <SettingsError
              message={errorMessage(accounts.error, "Failed to load sign-in methods")}
              onRetry={() => void accounts.refetch()}
            />
          ) : hasPassword ? (
            <>
              <PasswordForm />
              <p className="text-xs font-semibold text-[var(--studio-muted)]">
                Forgot your current password? Sign out and use &ldquo;Forgot password&rdquo; on the sign-in page.
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-[var(--studio-muted)]">
              Your account doesn&apos;t use a password to sign in.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--studio-line)] pt-5">
          <h3 className="studio-eyebrow">Active sessions</h3>
          <SessionsList currentToken={currentToken} />
        </div>
      </div>
    </SettingsSection>
  );
}

export function AccountSettings({ section }: { section: AccountSection }) {
  const account = useCurrentAccount();
  const user = account.data?.user ?? null;

  return (
    <SettingsShell
      area="account"
      section={section}
      title="Account settings"
      description="Manage your profile, sign-in email, and security."
    >
      {account.isLoading ? (
        <section className="studio-panel p-5 sm:p-6">
          <SettingsSkeleton rows={4} />
        </section>
      ) : account.isError || !user ? (
        <SettingsError
          message={errorMessage(account.error, "Failed to load your account")}
          onRetry={() => void account.refetch()}
        />
      ) : (
        <>
          {section === "profile" ? <ProfileSection key={user.id} user={user} /> : null}
          {section === "security" ? <SecuritySection currentToken={account.data?.sessionToken ?? null} /> : null}
        </>
      )}
    </SettingsShell>
  );
}
