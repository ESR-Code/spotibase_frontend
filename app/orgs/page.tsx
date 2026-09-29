import { signOut } from "@/app/orgs/actions";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrgsPlaceholderPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-4 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500">Signed in as {session.user.email}</p>
      <h1 className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Organizations &amp; projects
      </h1>
      <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
        Placeholder. Org and project lists will go here.
      </p>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          className="text-zinc-700 dark:text-zinc-300"
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
