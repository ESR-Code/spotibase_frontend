"use client";

import { authClient } from "@/lib/auth/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt?: string | Date;
};

export type CurrentAccount = {
  user: CurrentUser;
  /** Token of the session this browser is using. */
  sessionToken: string | null;
};

export type AuthAccount = { id: string; providerId: string };

export type UserSession = {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  expiresAt?: string | Date;
};

/**
 * Better Auth only lists sessions for a "fresh" sign-in (default: within 24h).
 * Older sessions get 403 `SESSION_NOT_FRESH`; the fix is to sign in again.
 */
export class SessionNotFreshError extends Error {
  constructor() {
    super("For your security, sign in again to view your active sessions.");
    this.name = "SessionNotFreshError";
  }
}

export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  const result = await authClient.getSession();
  if (result.error) {
    throw new Error(result.error.message || "Failed to load your account");
  }
  if (!result.data?.user) return null;
  return {
    user: result.data.user as unknown as CurrentUser,
    sessionToken: (result.data.session as { token?: string } | undefined)?.token ?? null,
  };
}

export async function updateProfileName(name: string) {
  const result = await authClient.updateUser({ name: name.trim() });
  if (result.error) {
    throw new Error(result.error.message || "Failed to update profile");
  }
  return result.data;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}) {
  const result = await authClient.changePassword(input);
  if (result.error) {
    throw new Error(result.error.message || "Failed to change password");
  }
  return result.data;
}

export async function listAuthAccounts(): Promise<AuthAccount[]> {
  const result = await authClient.listAccounts();
  if (result.error) {
    throw new Error(result.error.message || "Failed to load sign-in methods");
  }
  return Array.isArray(result.data) ? (result.data as unknown as AuthAccount[]) : [];
}

export async function listUserSessions(): Promise<UserSession[]> {
  const result = await authClient.listSessions();
  if (result.error?.status === 403 || result.error?.code === "SESSION_NOT_FRESH") {
    throw new SessionNotFreshError();
  }
  if (result.error) {
    throw new Error(result.error.message || "Failed to load sessions");
  }
  return Array.isArray(result.data) ? (result.data as unknown as UserSession[]) : [];
}

export async function revokeOtherSessions() {
  const result = await authClient.revokeOtherSessions();
  if (result.error) {
    throw new Error(result.error.message || "Failed to sign out other sessions");
  }
  return result.data;
}
