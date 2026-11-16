import { AuthField, AuthLinks, AuthShell, AuthSubmit } from "@/app/auth/_components/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your Spotibase account"
      subtitle="New signups are currently invite-only"
    >
      <p className="mb-5 rounded-[10px] border border-[var(--studio-line-strong)] bg-[var(--studio-sub)] px-3 py-2.5 text-sm text-[var(--studio-fg-2)]">
        Ask an admin to create your account, then sign in.
      </p>
      <form className="flex flex-col gap-4" aria-disabled="true">
        <AuthField label="Name" id="name" type="text" disabled />
        <AuthField label="Email" id="email" type="email" disabled />
        <AuthField label="Password" id="password" type="password" disabled />
        <AuthSubmit type="button" disabled>
          Sign up unavailable
        </AuthSubmit>
      </form>
      <AuthLinks current="sign-up" />
    </AuthShell>
  );
}
