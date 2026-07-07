"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/frontend/components/auth/logout-button";

const items = [
  { href: "/", label: "Home" },
  { href: "/inbox", label: "Inbox" },
  { href: "/projects", label: "Projects" },
  { href: "/schedule", label: "Schedule" },
  { href: "/reports", label: "Reports" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  displayName,
  roleLabel,
}: {
  displayName?: string;
  roleLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-brand">
        <Image
          src="/eps-logo.png"
          alt="Gage Handyman & Cleaning Service"
          width={58}
          height={58}
          className="dashboard-brand-logo"
          priority
        />
        <div>
          <p className="dashboard-brand-subtitle">
            {displayName ? `${displayName} · ${roleLabel ?? "Staff"}` : "Business Dashboard"}
          </p>
        </div>
      </div>

      <nav className="dashboard-nav">
        {items.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dashboard-nav-link ${active ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="dashboard-sidebar-footer">
        <Link href="/settings" className="dashboard-nav-link">
          Settings
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
