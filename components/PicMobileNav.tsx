"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/form", label: "Form", short: "Form" },
  { href: "/dashboard", label: "Dashboard", short: "Data" },
  { href: "/monthly", label: "Monthly", short: "Laporan" },
] as const;

export function PicMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="pic-mobile-nav" aria-label="Navigasi utama">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pic-mobile-nav-item${active ? " active" : ""}`}
          >
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
