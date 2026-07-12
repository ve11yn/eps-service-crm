import Link from "next/link";

const configurationItems = [
  { key: "pricing", href: "/settings?section=pricing", label: "Pricing Catalogue" },
  { key: "stages", href: "/settings?section=stages", label: "Project Stages" },
  { key: "availability", href: "/settings?section=availability", label: "Worker Availability" },
  { key: "team", href: "/team", label: "Team" },
  { key: "audit", href: "/audit", label: "Audit Log" },
] as const;

export function ConfigurationMenu({ activeSection }: { activeSection: string }) {
  return (
    <nav className="configuration-menu" aria-label="Configuration sections">
      <p className="configuration-menu-label">Configuration</p>
      {configurationItems.map((item) => (
        <Link
          key={item.key}
          className={activeSection === item.key ? "is-active" : ""}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
