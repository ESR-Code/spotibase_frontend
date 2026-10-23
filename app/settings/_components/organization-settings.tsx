"use client";

import { OrgAvatar } from "@/app/projects/_components/org-selector";
import { StudioField, FormError } from "@/app/projects/_components/studio-dialog";
import {
  errorMessage,
  formatDate,
  initialsOf,
  SavedNote,
  SettingsEmpty,
  SettingsError,
  SettingsSection,
  SettingsShell,
  SettingsSkeleton,
} from "@/app/settings/_components/settings-shell";
import { useCurrentAccount } from "@/lib/auth/hooks";
import {
  useActiveMemberRole,
  useActiveOrganizationId,
  useOrganizationMembers,
  useOrganizations,
  useRemoveOrganizationLogo,
  useUpdateOrganization,
  useUploadOrganizationLogo,
} from "@/lib/projects/hooks";
import { MAX_THUMBNAIL_SOURCE_BYTES, organizationLogoSrc } from "@/lib/projects/storage";
import type { OrganizationSummary } from "@/lib/projects/types";
import { Building2, Check, CloudUpload, Copy, KeyRound, LoaderCircle, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

const MANAGER_ROLES = new Set(["owner", "admin"]);

function formatRole(role: string | null | undefined) {
  if (!role) return "—";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[10px] bg-[var(--studio-sub)] px-3.5 py-3">
      <dt className="studio-eyebrow">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-bold text-[var(--studio-fg-2)]">{children}</dd>
    </div>
  );
}

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 truncate text-xs">{value}</code>
      <button
        type="button"
        className="studio-icon-btn h-7 w-7 shrink-0"
        aria-label="Copy organization ID"
        title="Copy organization ID"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Check /> : <Copy />}
      </button>
    </span>
  );
}

function LogoField({ org, canManage }: { org: OrganizationSummary; canManage: boolean }) {
  const upload = useUploadOrganizationLogo();
  const remove = useRemoveOrganizationLogo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = upload.isPending || remove.isPending;
  const src = organizationLogoSrc(org);

  async function onFile(file: File | undefined) {
    if (!file || pending) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (JPG, PNG, WebP, …).");
      return;
    }
    if (file.size > MAX_THUMBNAIL_SOURCE_BYTES) {
      setError("Image must be 20 MB or smaller.");
      return;
    }
    try {
      await upload.mutateAsync({ organizationId: org.id, file });
    } catch (e) {
      setError(errorMessage(e, "Failed to upload logo"));
    }
  }

  async function onRemove() {
    setError(null);
    try {
      await remove.mutateAsync(org.id);
    } catch (e) {
      setError(errorMessage(e, "Failed to remove logo"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <OrgAvatar name={org.name} logo={src} size={72} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <p className="studio-label m-0">Organization logo</p>
            <p className="text-xs font-semibold text-[var(--studio-muted)]">
              Square image, cropped and saved as 512×512 WebP.
            </p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="studio-btn studio-btn-ghost"
                onClick={() => inputRef.current?.click()}
                disabled={pending}
              >
                {upload.isPending ? <LoaderCircle className="animate-spin" /> : <CloudUpload />}
                {upload.isPending ? "Uploading…" : src ? "Replace logo" : "Upload logo"}
              </button>
              {src ? (
                <button
                  type="button"
                  className="studio-btn studio-btn-ghost"
                  onClick={() => void onRemove()}
                  disabled={pending}
                >
                  {remove.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  Remove
                </button>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void onFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      <FormError error={error} />
    </div>
  );
}

function GeneralSection({
  org,
  role,
  roleLoading,
}: {
  org: OrganizationSummary;
  role: string | null | undefined;
  roleLoading: boolean;
}) {
  const update = useUpdateOrganization();
  const [name, setName] = useState(org.name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const canManage = Boolean(role && MANAGER_ROLES.has(role));
  const dirty = name.trim() !== org.name;
  const pending = update.isPending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !name.trim() || !dirty) return;
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ organizationId: org.id, name });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, "Failed to update organization"));
    }
  }

  return (
    <SettingsSection id="general" title="General" subtitle="Organization name, logo, and details">
      <LogoField org={org} canManage={canManage} />
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <StudioField label="Organization name" htmlFor="org-name">
          <input
            id="org-name"
            required
            maxLength={80}
            value={name}
            disabled={!canManage || pending}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            className="studio-input"
            autoComplete="organization"
          />
        </StudioField>
        {!canManage && !roleLoading ? (
          <p className="-mt-2 text-xs font-semibold text-[var(--studio-muted)]">
            Only owners and admins can change the organization name and logo.
          </p>
        ) : null}

        <FormError error={error} />

        {canManage ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {saved && !dirty ? (
              <SavedNote>
                <Check className="h-3.5 w-3.5" />
                Organization updated
              </SavedNote>
            ) : null}
            <button
              type="button"
              className="studio-btn studio-btn-ghost"
              onClick={() => {
                setName(org.name);
                setError(null);
              }}
              disabled={!dirty || pending}
            >
              Cancel changes
            </button>
            <button type="submit" className="studio-btn studio-btn-primary" disabled={!dirty || !name.trim() || pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : null}
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : null}
      </form>

      <dl className="mt-6 grid gap-2.5 sm:grid-cols-2">
        <DetailRow label="Slug">@{org.slug}</DetailRow>
        <DetailRow label="Your role">{roleLoading ? "…" : formatRole(role)}</DetailRow>
        <DetailRow label="Created">{formatDate(org.createdAt)}</DetailRow>
        <DetailRow label="Organization ID">
          <CopyId value={org.id} />
        </DetailRow>
      </dl>
    </SettingsSection>
  );
}

function MembersSection({ orgId }: { orgId: string }) {
  const members = useOrganizationMembers(orgId);
  const account = useCurrentAccount();
  const myId = account.data?.user.id;
  const rows = members.data ?? [];

  return (
    <SettingsSection
      id="members"
      title="Members"
      subtitle="People with access to this organization's projects"
      aside={members.data ? <span className="studio-pill">{rows.length}</span> : null}
    >
      {members.isLoading ? (
        <SettingsSkeleton rows={3} />
      ) : members.isError ? (
        <SettingsError
          message={errorMessage(members.error, "Failed to load members")}
          onRetry={() => void members.refetch()}
        />
      ) : rows.length === 0 ? (
        <SettingsEmpty icon={<Users />}>No members found.</SettingsEmpty>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--studio-line)]">
          {rows.map((member) => {
            const label = member.user?.name || member.user?.email || "Unknown user";
            return (
              <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fd4f6a] to-[#4c3ba8] text-xs font-extrabold text-white">
                  {initialsOf(label)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-[var(--studio-fg)]">
                    <span className="truncate">{label}</span>
                    {member.userId === myId ? <span className="studio-pill shrink-0 text-[10px]">You</span> : null}
                  </p>
                  <p className="truncate text-xs font-semibold text-[var(--studio-muted)]">
                    {member.user?.email ?? "—"}
                    <span className="hidden sm:inline"> · Joined {formatDate(member.createdAt)}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-[rgba(253,79,106,0.16)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--studio-accent-2)]">
                  {formatRole(member.role)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs font-semibold text-[var(--studio-muted)]">
        Inviting members and changing roles isn&apos;t available yet.
      </p>
    </SettingsSection>
  );
}

function ApiSecretsSection() {
  return (
    <SettingsSection
      id="api-secrets"
      title="API secrets"
      subtitle="Server-to-server credentials for this organization"
      aside={<span className="studio-pill">Coming soon</span>}
    >
      <SettingsEmpty icon={<KeyRound />}>API secret management will be available here in a future release.</SettingsEmpty>
    </SettingsSection>
  );
}

export function OrganizationSettings() {
  const orgsQuery = useOrganizations();
  const activeQuery = useActiveOrganizationId();
  const orgs = orgsQuery.data ?? [];
  const orgId = activeQuery.data ?? orgs[0]?.id ?? null;
  const org = orgs.find((o) => o.id === orgId) ?? orgs[0] ?? null;
  const roleQuery = useActiveMemberRole(org?.id);

  const loading = orgsQuery.isLoading || activeQuery.isLoading;

  return (
    <SettingsShell
      area="organization"
      title="Organization settings"
      description={
        org ? (
          <>
            Manage <span className="text-[var(--studio-fg-2)]">{org.name}</span>. Switch organizations from the
            Projects page.
          </>
        ) : (
          "Manage your organization's details and members."
        )
      }
    >
      {loading ? (
        <section className="studio-panel p-5 sm:p-6">
          <SettingsSkeleton rows={4} />
        </section>
      ) : orgsQuery.isError ? (
        <SettingsError
          message={errorMessage(orgsQuery.error, "Failed to load organizations")}
          onRetry={() => void orgsQuery.refetch()}
        />
      ) : !org ? (
        <section className="studio-panel p-5 sm:p-6">
          <SettingsEmpty icon={<Building2 />}>
            <span>You&apos;re not a member of any organization yet.</span>
            <Link href="/projects" className="studio-btn studio-btn-primary mt-2">
              Go to Projects
            </Link>
          </SettingsEmpty>
        </section>
      ) : (
        <>
          <GeneralSection key={org.id} org={org} role={roleQuery.data} roleLoading={roleQuery.isLoading} />
          <MembersSection orgId={org.id} />
          <ApiSecretsSection />
        </>
      )}
    </SettingsShell>
  );
}
