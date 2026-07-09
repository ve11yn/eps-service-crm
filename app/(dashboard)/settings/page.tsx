import { getSettingsOverview } from "@/backend/services/settings/get-settings-overview";
import { requireAppSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  await requireAppSession(["owner", "admin"]);
  const settings = await getSettingsOverview();

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Settings</h1>
        </div>
      </section>

      <section className="settings-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Service Catalog</p>
              <h2>Pricing</h2>
            </div>
            <span className="helper-text">{settings.serviceCatalog.activeCatalogs} active catalogs</span>
          </div>
          <div className="summary-grid">
            <div>
              <span className="summary-label">Active Items</span>
              <p>{settings.serviceCatalog.activePricingItems}</p>
            </div>
            <div>
              <span className="summary-label">Latest Item</span>
              <p>{settings.serviceCatalog.latestItemTitle ?? "No pricing items"}</p>
            </div>
            <div>
              <span className="summary-label">Catalog</span>
              <p>{settings.serviceCatalog.latestCatalogCode ?? "No catalog"}</p>
            </div>
            <div>
              <span className="summary-label">Domain</span>
              <p>{settings.serviceCatalog.latestServiceDomain ?? "No domain"}</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Messaging</p>
              <h2>WhatsApp API</h2>
            </div>
            <span className="helper-text">{settings.whatsapp.configured ? "Configured" : "Missing config"}</span>
          </div>
          <div className="summary-grid">
            <div>
              <span className="summary-label">Threads</span>
              <p>{settings.whatsapp.threadCount}</p>
            </div>
            <div>
              <span className="summary-label">Messages</span>
              <p>{settings.whatsapp.messageCount}</p>
            </div>
            <div>
              <span className="summary-label">Webhook Token</span>
              <p>{settings.whatsapp.configured ? "Set" : "Missing"}</p>
            </div>
            <div>
              <span className="summary-label">Signature Secret</span>
              <p>{settings.whatsapp.hasSignatureSecret ? "Set" : "Missing"}</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Access</p>
              <h2>Roles &amp; Permissions</h2>
            </div>
            <span className="helper-text">{settings.access.activeProfiles} active users</span>
          </div>
          <div className="summary-grid">
            <div>
              <span className="summary-label">Active Roles</span>
              <p>{settings.access.activeRoles}</p>
            </div>
            <div>
              <span className="summary-label">Active Profiles</span>
              <p>{settings.access.activeProfiles}</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ownership</p>
              <h2>Handover</h2>
            </div>
            <span className="helper-text">{settings.ownership.supabaseConfigured ? "Database connected" : "Database config missing"}</span>
          </div>
          <div className="summary-grid">
            <div>
              <span className="summary-label">Audit Logs</span>
              <p>{settings.ownership.auditLogCount}</p>
            </div>
            <div>
              <span className="summary-label">Open Errors</span>
              <p>{settings.ownership.unresolvedErrorCount}</p>
            </div>
            <div>
              <span className="summary-label">AI API</span>
              <p>{settings.ownership.aiConfigured ? "Configured" : "Missing"}</p>
            </div>
            <div>
              <span className="summary-label">Supabase</span>
              <p>{settings.ownership.supabaseConfigured ? "Configured" : "Missing"}</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
