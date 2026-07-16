"use client";

import { useEffect } from "react";

type CliAuthorizeRedirectProps = {
  href: string;
};

export function CliAuthorizeRedirect({ href }: CliAuthorizeRedirectProps) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return null;
}
