"use client";

import { Avatar } from "@/app/projects/_components/avatar";
import { OrgAvatar } from "@/app/projects/_components/org-selector";
import { formatRole, RoleBadge } from "@/app/projects/_components/role-badge";
import { DialogActions, FormError, StudioDialog, StudioField } from "@/app/projects/_components/studio-dialog";
import {
  StudioMenu,
  StudioMenuContent,
  StudioMenuLabel,
  StudioMenuRadioGroup,
  StudioMenuRadioItem,
  StudioMenuTrigger,
} from "@/app/projects/_components/studio-menu";
import {
  errorMessage,
  formatDate,
  SavedNote,
  SettingsEmpty,
  SettingsError,
  SettingsSection,
  SettingsShell,
  SettingsSkeleton,
} from "@/app/settings/_components/settings-shell";
import type { OrganizationSection } from "@/app/settings/_components/settings-sections";
import { useSettingsOrg } from "@/app/settings/_components/use-settings-org";
import { useCurrentAccount } from "@/lib/auth/hooks";
import {
  useActiveMemberRole,
  useOrganizationMembers,
  useRemoveOrganizationLogo,
  useUpdateMemberRole,
  useUpdateOrganization,
  useUploadOrganizationLogo,
} from "@/lib/projects/hooks";
import { MAX_THUMBNAIL_SOURCE_BYTES, organizationLogoSrc } from "@/lib/projects/storage";
import type { OrganizationMember, OrganizationSummary } from "@/lib/projects/types";
import {
  Building2,
  Check,
  CloudUpload,
  Copy,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

const MANAGER_ROLES = new Set(["owner", "admin"]);

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
        <DetailRow label="Your role">{roleLoading ? "…" : role ? <RoleBadge role={role} /> : "—"}</DetailRow>
        <DetailRow label="Created">{formatDate(org.createdAt)}</DetailRow>
        <DetailRow label="Organization ID">
          <CopyId value={org.id} />
        </DetailRow>
      </dl>
    </SettingsSection>
  );
}

const ROLE_OPTIONS: { role: string; description: string }[] = [
  { role: "owner", description: "Full control, including other owners" },
  { role: "admin", description: "Manage the organization and its members" },
  { role: "member", description: "Create and edit projects" },
];

function hasRole(memberRole: string, role: string) {
  return memberRole.split(",").map((r) => r.trim()).includes(role);
}

type RoleChange = { member: OrganizationMember; label: string; role: string; self: boolean };

function RoleChangeDialog({
  change,
  orgName,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  change: RoleChange | null;
  orgName: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const description = !change ? null : change.self ? (
    <>
      Change your own role in <strong className="text-[var(--studio-fg)]">{orgName}</strong> to{" "}
      <strong className="text-[var(--studio-fg)]">{formatRole(change.role)}</strong>? You may lose access to these
      settings.
    </>
  ) : (
    <>
      Change <strong className="text-[var(--studio-fg)]">{change.label}</strong> from {formatRole(change.member.role)}{" "}
      to <strong className="text-[var(--studio-fg)]">{formatRole(change.role)}</strong>?
      {change.role === "owner" ? " Owners have full control, including over other owners." : null}
    </>
  );

  return (
    <StudioDialog open={Boolean(change)} title="Change role" description={description} icon={<ShieldCheck />} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        className="flex flex-col gap-3"
      >
        <FormError error={error} />
        <DialogActions onCancel={onClose} pending={pending} submitLabel="Change role" pendingLabel="Saving…" />
      </form>
    </StudioDialog>
  );
}

function MembersSection({
  org,
  myRole,
}: {
  org: OrganizationSummary;
  myRole: string | null | undefined;
}) {
  const members = useOrganizationMembers(org.id);
  const updateRole = useUpdateMemberRole(org.id);
  const account = useCurrentAccount();
  const [change, setChange] = useState<RoleChange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const myId = account.data?.user.id;
  const rows = members.data ?? [];

  // Mirrors Neon Auth (Better Auth) rules: owners / admins may change roles,
  // only owners may touch owners, and the last owner cannot step down.
  const iAmOwner = Boolean(myRole && hasRole(myRole, "owner"));
  const canManage = Boolean(myRole && MANAGER_ROLES.has(myRole));
  const ownerCount = rows.filter((m) => hasRole(m.role, "owner")).length;
  const options = ROLE_OPTIONS.filter((o) => iAmOwner || o.role !== "owner");

  function canEdit(member: OrganizationMember) {
    if (!canManage) return false;
    if (hasRole(member.role, "owner") && !iAmOwner) return false;
    if (member.userId === myId && hasRole(member.role, "owner") && ownerCount <= 1) return false;
    return true;
  }

  async function onConfirm() {
    if (!change) return;
    setError(null);
    try {
      await updateRole.mutateAsync({ memberId: change.member.id, role: change.role });
      setChange(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to change role"));
    }
  }

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
            const self = member.userId === myId;
            return (
              <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={label} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-[var(--studio-fg)]">
                    <span className="truncate">{label}</span>
                    {self ? <span className="studio-pill shrink-0 text-[10px]">You</span> : null}
                  </p>
                  <p className="truncate text-xs font-semibold text-[var(--studio-muted)]">
                    {member.user?.email ?? "—"}
                    <span className="hidden sm:inline"> · Joined {formatDate(member.createdAt)}</span>
                  </p>
                </div>
                {canEdit(member) ? (
                  <StudioMenu>
                    <StudioMenuTrigger
                      className="group rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)]"
                      aria-label={`Change role for ${label}`}
                    >
                      <RoleBadge
                        role={member.role}
                        chevron
                        className="group-hover:brightness-125 group-data-[state=open]:brightness-125"
                      />
                    </StudioMenuTrigger>
                    <StudioMenuContent align="end" className="w-64">
                      <StudioMenuLabel>Role</StudioMenuLabel>
                      <StudioMenuRadioGroup
                        value={member.role}
                        onValueChange={(role) => {
                          if (role === member.role) return;
                          setError(null);
                          setChange({ member, label, role, self });
                        }}
                      >
                        {options.map((option) => (
                          <StudioMenuRadioItem key={option.role} value={option.role} rich>
                            <span className="min-w-0 flex-1">
                              <span className="block">{formatRole(option.role)}</span>
                              <span className="block text-[11px] font-medium text-[var(--studio-muted)]">
                                {option.description}
                              </span>
                            </span>
                          </StudioMenuRadioItem>
                        ))}
                      </StudioMenuRadioGroup>
                    </StudioMenuContent>
                  </StudioMenu>
                ) : (
                  <RoleBadge role={member.role} />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs font-semibold text-[var(--studio-muted)]">
        {canManage
          ? iAmOwner
            ? "Select a role to change it. An organization always keeps at least one owner."
            : "Select a role to change it. Only owners can change or grant the owner role."
          : "Only owners and admins can change member roles."}{" "}
        Inviting members isn&apos;t available yet.
      </p>

      <RoleChangeDialog
        change={change}
        orgName={org.name}
        pending={updateRole.isPending}
        error={error}
        onConfirm={() => void onConfirm()}
        onClose={() => setChange(null)}
      />
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

export function OrganizationSettings({ section }: { section: OrganizationSection }) {
  const { org, orgsQuery, loading } = useSettingsOrg();
  const roleQuery = useActiveMemberRole(org?.id);

  return (
    <SettingsShell
      area="organization"
      section={section}
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
      ) : section === "general" ? (
        <GeneralSection key={org.id} org={org} role={roleQuery.data} roleLoading={roleQuery.isLoading} />
      ) : section === "members" ? (
        <MembersSection org={org} myRole={roleQuery.data} />
      ) : (
        <ApiSecretsSection />
      )}
    </SettingsShell>
  );
}
