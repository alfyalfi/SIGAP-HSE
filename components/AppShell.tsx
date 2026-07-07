"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { ClientProviders } from "./ClientProviders";
import type { Profile } from "@/lib/queries";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <ClientProviders>{children}</ClientProviders>;
  }

  return (
    <ClientProviders>
      <AppHeader profile={profile} />
      <main className="app-main">{children}</main>
    </ClientProviders>
  );
}
