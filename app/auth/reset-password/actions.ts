"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export async function resetPassword(
  _prev: { error: string } | null,
  formData: FormData,
) {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("password") ?? "");
  if (!token) {
    return { error: "This reset link is missing a token. Request a new one." };
  }
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const { error } = await auth.resetPassword({
    newPassword,
    token,
  });

  if (error) {
    return { error: error.message || "Could not reset password." };
  }

  redirect("/auth/sign-in");
}
