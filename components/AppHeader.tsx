"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SigapLogo } from "./SigapLogo";
import { ThemeToggle } from "./ThemeToggle";
import { getGreeting } from "@/lib/constants";
import { withTimeout } from "@/lib/async-utils";
import type { Profile } from "@/lib/queries";

const USER_NAV = [
  { href: "/form", label: "Form Temuan" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monthly", label: "Monthly Report" },
] as const;

export function AppHeader({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await withTimeout(fetch("/api/auth/logout", { method: "POST" }), 10000, "Keluar");
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const subtitle =
    USER_NAV.find((n) => pathname.startsWith(n.href))?.label || "SIGAP HSE";

  return (
    <header className="app-header">
      <div className="header-brand">
        <Link href="/form" className="header-brand-link" aria-label="SIGAP HSE">
          <SigapLogo size="sm" />
        </Link>
        <div>
          <strong>SIGAP HSE</strong>
          <p>{subtitle}</p>
          {profile.full_name && (
            <p className="hero-greeting">{getGreeting(profile.full_name)}</p>
          )}
        </div>
      </div>

      <nav className="main-nav">
        {USER_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${pathname.startsWith(item.href) ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <ThemeToggle />
        <div className="user-pill">
          <div className="avatar">{(profile.full_name || "U").slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{profile.full_name}</strong>
            <p>PIC</p>
          </div>
        </div>
        <button type="button" className="button button-secondary button-loading" onClick={logout} disabled={loggingOut}>
          {loggingOut ? (
            <>
              <span className="button-spinner" aria-hidden />
              Keluar...
            </>
          ) : (
            "Logout"
          )}
        </button>
      </div>
    </header>
  );
}
