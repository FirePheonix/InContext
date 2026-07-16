import { siGithub } from "simple-icons";

import { signIn } from "@/auth";
import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GithubButtonProps = React.ComponentProps<typeof Button> & {
  redirectTo?: string;
};

export function GithubButton({ className, redirectTo = "/dashboard", ...props }: GithubButtonProps) {
  const githubOAuthEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

  async function signInWithGithub() {
    "use server";

    await signIn("github", { redirectTo });
  }

  return (
    <form action={signInWithGithub}>
      <Button
        variant="secondary"
        className={cn(className)}
        type="submit"
        disabled={!githubOAuthEnabled}
        title={!githubOAuthEnabled ? "Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET to enable GitHub OAuth." : undefined}
        {...props}
      >
        <SimpleIcon icon={siGithub} className="size-4" />
        Continue with GitHub
      </Button>
    </form>
  );
}
