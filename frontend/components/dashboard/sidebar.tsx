"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/inbox", label: "Inbox" },
  { href: "/projects", label: "Projects" },
  { href: "/schedule", label: "Schedule" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-brand">
        <div className="dashboard-brand-mark">EP</div>
        <div>
          <p className="dashboard-brand-title">EPS Services</p>
          <p className="dashboard-brand-subtitle">Business Dashboard</p>
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
      </div>
    </aside>
  );
}
