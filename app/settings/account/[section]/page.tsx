"use client";

import { ProjectsLoading } from "@/app/projects/_components/projects-loading";
import { isAccountSection } from "@/app/settings/_components/settings-sections";
import dynamic from "next/dynamic";
import { notFound, useParams } from "next/navigation";

const AccountSettings = dynamic(
  () =>
    import("@/app/settings/_components/account-settings").then(
      (mod) => mod.AccountSettings,
    ),
  { ssr: false, loading: () => <ProjectsLoading /> },
);

export default function AccountSettingsPage() {
  const { section } = useParams<{ section: string }>();
  if (!isAccountSection(section)) notFound();
  return <AccountSettings section={section} />;
}
