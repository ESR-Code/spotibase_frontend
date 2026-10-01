"use client";

import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthVanillaAdapter } from "@neondatabase/auth/vanilla/adapters";

function authBaseUrl() {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000");
  return `${origin}/gateway/auth`;
}

export const authClient = createAuthClient(authBaseUrl(), {
  adapter: BetterAuthVanillaAdapter({
    fetchOptions: {
      credentials: "include",
    },
  }),
});
