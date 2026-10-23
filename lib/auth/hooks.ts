"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changePassword,
  getCurrentAccount,
  listAuthAccounts,
  listUserSessions,
  revokeOtherSessions,
  SessionNotFreshError,
  updateProfileName,
} from "@/lib/auth/account";
import { orgKeys } from "@/lib/projects/hooks";

export const accountKeys = {
  current: ["account"] as const,
  methods: ["account", "methods"] as const,
  sessions: ["account", "sessions"] as const,
};

export function useCurrentAccount() {
  return useQuery({ queryKey: accountKeys.current, queryFn: getCurrentAccount });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfileName,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: accountKeys.current, exact: true });
      // Member lists embed the user's name.
      void qc.invalidateQueries({ queryKey: orgKeys.allMembers });
    },
  });
}

export function useAuthAccounts() {
  return useQuery({ queryKey: accountKeys.methods, queryFn: listAuthAccounts });
}

export function useUserSessions() {
  return useQuery({
    queryKey: accountKeys.sessions,
    queryFn: listUserSessions,
    retry: (count, error) => !(error instanceof SessionNotFreshError) && count < 3,
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    onSuccess: async (_data, input) => {
      if (input.revokeOtherSessions) {
        await qc.invalidateQueries({ queryKey: accountKeys.sessions });
      }
    },
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: accountKeys.sessions });
    },
  });
}
