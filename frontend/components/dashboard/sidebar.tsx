"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FolderKanban,
  Home,
  Inbox,
  ListChecks,
  LogOut,
  ReceiptText,
  Settings,
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
  { href: "/finance", label: "Finance", icon: CircleDollarSign, roles: ["owner", "admin"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["owner"] },
];

const footerItems: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
}> = [
  { href: "/settings", label: "Configuration", icon: Settings, roles: ["owner", "admin"] },
];

const sidebarStorageKey = "crm-sidebar-collapsed";
const sidebarChangeEvent = "crm-sidebar-change";

function subscribeToSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(sidebarChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(sidebarChangeEvent, callback);
  };
}

function getSidebarSnapshot() {
  return window.localStorage.getItem(sidebarStorageKey) === "true";
}

function getServerSidebarSnapshot() {
  return false;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/settings" && ["/team", "/audit"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
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
  const isCollapsed = useSyncExternalStore(
    subscribeToSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot,
  );
  const visibleItems = items.filter((item) => item.roles.includes(roleCode));

  function toggleSidebar() {
    window.localStorage.setItem(sidebarStorageKey, String(!isCollapsed));
    window.dispatchEvent(new Event(sidebarChangeEvent));
  }

  return (
    <aside className={`dashboard-sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="dashboard-brand">
        <Image
          src="/eps-logo.png"
          alt="Gage Handyman & Cleaning Service"
          width={58}
          height={58}
          className="dashboard-brand-logo"
          priority
        />
        <div className="dashboard-brand-copy">
          <p className="dashboard-brand-subtitle">
            {displayName ? `${displayName} · ${roleLabel ?? "Staff"}` : "Business Dashboard"}
          </p>
        </div>
        <button
          type="button"
          className="dashboard-sidebar-toggle"
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={toggleSidebar}
        >
          {isCollapsed ? <ChevronRight aria-hidden="true" size={20} /> : <ChevronLeft aria-hidden="true" size={20} />}
        </button>
      </div>

      <nav className="dashboard-nav" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dashboard-nav-link ${active ? "is-active" : ""}`}
              data-label={item.label}
              title={isCollapsed ? item.label : undefined}
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
                data-label={item.label}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="dashboard-nav-icon" aria-hidden="true" size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        <LogoutButton icon={LogOut} collapsed={isCollapsed} />
      </div>
    </aside>
  );
}
