import { signIn } from "@/auth";
import { siGoogle } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GoogleButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const googleOAuthEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  async function signInWithGoogle() {
    "use server";

    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <form action={signInWithGoogle}>
      <Button
        variant="secondary"
        className={cn(className)}
        type="submit"
        disabled={!googleOAuthEnabled}
        title={!googleOAuthEnabled ? "Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET to enable Google OAuth." : undefined}
        {...props}
      >
        <SimpleIcon icon={siGoogle} className="size-4" />
        Continue with Google
      </Button>
    </form>
  );
}
