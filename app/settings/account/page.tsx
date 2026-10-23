"use client";

import { ProjectsLoading } from "@/app/projects/_components/projects-loading";
import dynamic from "next/dynamic";

const AccountSettings = dynamic(
  () =>
    import("@/app/settings/_components/account-settings").then(
      (mod) => mod.AccountSettings,
    ),
  { ssr: false, loading: () => <ProjectsLoading /> },
);

export default function AccountSettingsPage() {
  return <AccountSettings />;
}
