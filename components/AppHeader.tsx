"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { getGreeting } from "@/lib/constants";
import type { Profile } from "@/lib/queries";

const USER_NAV = [
  { href: "/form", label: "Form Temuan" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monthly", label: "Monthly Report" },
] as const;

export function AppHeader({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const subtitle =
    USER_NAV.find((n) => pathname.startsWith(n.href))?.label || "SIGAP HSE";

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-mark">S</div>
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
        <button type="button" className="button button-secondary" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
