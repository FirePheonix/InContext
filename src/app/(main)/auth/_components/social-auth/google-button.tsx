import { siGoogle } from "simple-icons";

import { signIn } from "@/auth";
import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GoogleButtonProps = React.ComponentProps<typeof Button> & {
  redirectTo?: string;
};

export function GoogleButton({ className, redirectTo = "/dashboard", ...props }: GoogleButtonProps) {
  const googleOAuthEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  async function signInWithGoogle() {
    "use server";

    await signIn("google", { redirectTo });
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
