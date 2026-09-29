"use server";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

function appOrigin(headerList: Headers) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function requestPasswordReset(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Email is required." };
  }

  const origin = appOrigin(await headers());
  const { error } = await auth.requestPasswordReset({
    email,
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message || "Could not send reset email." };
  }

  return { ok: true };
}
