"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppCopyright } from "./AppCopyright";
import { ClientProviders } from "./ClientProviders";
import { PicMobileNav } from "./PicMobileNav";
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
      <main className="app-main pic-main">{children}</main>
      <PicMobileNav />
      <footer className="app-footer">
        <AppCopyright centered />
      </footer>
    </ClientProviders>
  );
}
