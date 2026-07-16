import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isLoopbackCallbackUrl, issueCliSession } from "@/lib/cli-auth";

import { CliAuthorizeRedirect } from "./redirect-client";

type CliAuthorizePageProps = {
  searchParams: Promise<{
    callback?: string;
    code?: string;
    hostname?: string;
    label?: string;
    platform?: string;
  }>;
};

function buildRelativeAuthorizePath(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  return `/cli/authorize?${search.toString()}`;
}

export default async function CliAuthorizePage({ searchParams }: CliAuthorizePageProps) {
  const { callback, code, hostname, label, platform } = await searchParams;

  if (!callback || !code || !isLoopbackCallbackUrl(callback)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <h1 className="font-medium text-3xl">CLI authorization failed</h1>
        <p className="mt-3 text-muted-foreground">
          InContext only redirects CLI login tokens to loopback callback URLs such as{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">http://127.0.0.1:43111/callback</code>.
        </p>
      </main>
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/auth/v2/login?next=${encodeURIComponent(buildRelativeAuthorizePath({ callback, code, hostname, label, platform }))}`,
    );
  }

  const issued = await issueCliSession(session.user.id, {
    label: label?.trim() || "InContext CLI",
    platform,
    hostname,
  });

  const callbackUrl = new URL(callback);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("token", issued.token);
  callbackUrl.searchParams.set("deviceId", issued.device.id);
  callbackUrl.searchParams.set("label", issued.device.label);

  const redirectHref = callbackUrl.toString();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="font-medium text-3xl">Authorizing InContext CLI</h1>
      <p className="mt-3 text-muted-foreground">
        You are signed in. InContext is handing a local CLI session token back to your machine.
      </p>
      <p className="mt-2 text-muted-foreground">If the redirect does not happen automatically, continue manually.</p>
      <div className="mt-6">
        <Link
          href={redirectHref}
          className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-background text-sm"
        >
          Return to InContext CLI
        </Link>
      </div>
      <CliAuthorizeRedirect href={redirectHref} />
    </main>
  );
}
