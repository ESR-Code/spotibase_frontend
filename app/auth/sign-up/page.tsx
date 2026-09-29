import { AuthLinks, AuthShell } from "@/app/auth/_components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  return (
    <AuthShell title="Create an account">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        New signups are disabled. Ask an admin to create your account, then sign
        in.
      </p>
      <form className="flex flex-col gap-4" aria-disabled="true">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" type="text" disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" disabled />
        </div>
        <Button
          type="button"
          disabled
          className="w-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign up unavailable
        </Button>
      </form>
      <AuthLinks current="sign-up" />
    </AuthShell>
  );
}
