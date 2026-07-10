"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  FolderKanban,
  Home,
  Inbox,
  ListChecks,
  LogOut,
  ReceiptText,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/frontend/components/auth/logout-button";
import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";

const items: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
}> = [
  { href: "/", label: "Dashboard", icon: Home, roles: ["owner", "admin", "coordinator"] },
  { href: "/inbox", label: "Inbox", icon: Inbox, roles: ["owner", "admin"] },
  { href: "/leads", label: "Leads", icon: ListChecks, roles: ["owner", "admin"] },
  { href: "/quotes", label: "Quotes", icon: ReceiptText, roles: ["owner", "admin"] },
  { href: "/projects", label: "Jobs / Projects", icon: FolderKanban, roles: ["owner", "admin", "coordinator"] },
  { href: "/schedule", label: "Calendar", icon: CalendarDays, roles: ["owner", "admin", "coordinator"] },
  { href: "/customers", label: "Customers & Properties", icon: Users, roles: ["owner", "admin"] },
  { href: "/finance", label: "Finance", icon: CircleDollarSign, roles: ["owner", "admin"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["owner"] },
];

const footerItems: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
}> = [
  { href: "/team", label: "Team", icon: Users, roles: ["owner", "admin", "coordinator"] },
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
  roleCode,
}: {
  displayName?: string;
  roleLabel?: string;
  roleCode: AppRole;
}) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => item.roles.includes(roleCode));

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
        {visibleItems.map((item) => {
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
        {footerItems
          .filter((item) => item.roles.includes(roleCode))
          .map((item) => {
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
        <LogoutButton icon={LogOut} />
      </div>
    </aside>
  );
}
