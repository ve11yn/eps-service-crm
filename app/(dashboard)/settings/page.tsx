import { getConfigurationWorkspace } from "@/backend/services/settings/configuration-management";
import { ConfigurationMenu } from "@/frontend/components/settings/configuration-menu";
import { ConfigurationWorkspace } from "@/frontend/components/settings/configuration-workspace";
import { requireAppSession } from "@/lib/auth/session";

const sections = new Set(["pricing", "stages", "availability"]);

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireAppSession(["owner", "admin"]);
  const { section } = await searchParams;
  const activeSection = section && sections.has(section) ? section : "pricing";
  const data = await getConfigurationWorkspace();
  return <div className="page-stack"><section className="page-header"><div><h1>Configuration</h1><p className="helper-text">Choose a menu to manage that part of the system.</p></div></section><div className="configuration-menu-layout"><ConfigurationMenu activeSection={activeSection}/><ConfigurationWorkspace catalogs={data.catalogs} items={data.pricingItems} stages={data.projectStages} workers={data.workers} activeSection={activeSection}/></div></div>;
}
