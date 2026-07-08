"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FolderKanban,
  Home,
  Inbox,
  ListChecks,
  LogOut,
  Settings,
} from "lucide-react";
import { LogoutButton } from "@/frontend/components/auth/logout-button";
import type { LucideIcon } from "lucide-react";

const items: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/requests", label: "Requests", icon: ListChecks },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
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
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dashboard-nav-link ${active ? "is-active" : ""}`}
            >
              <Icon className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dashboard-sidebar-footer">
        <Link href="/settings" className="dashboard-nav-link">
          <Settings className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
          <span>Settings</span>
        </Link>
        <LogoutButton icon={LogOut} />
      </div>
    </aside>
  );
}
