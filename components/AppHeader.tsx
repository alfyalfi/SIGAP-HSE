"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import type { Profile } from "@/lib/queries";

type NavItem = { href: string; label: string };

const USER_NAV: NavItem[] = [
  { href: "/form", label: "Form Temuan" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monthly", label: "Monthly Report" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/approval", label: "Approval" },
];

export function AppHeader({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = profile.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : USER_NAV;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const subtitle = nav.find((n) => pathname.startsWith(n.href))?.label || "SIGAP HSE";

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-mark">S</div>
        <div>
          <strong>SIGAP HSE</strong>
          <p>{subtitle}</p>
        </div>
      </div>

      <nav className="main-nav">
        {nav.map((item) => (
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
            <p>{isAdmin ? "Administrator" : "PIC"}</p>
          </div>
        </div>
        <button type="button" className="button button-secondary" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
