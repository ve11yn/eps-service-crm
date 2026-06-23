import { EmptyState } from "@/frontend/components/dashboard/empty-state";

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
        </div>
        <p className="page-header-copy">
          This page can later hold business profile, integrations, templates, and user access settings.
        </p>
      </section>

      <section className="panel">
        <EmptyState
          title="Settings are not built yet"
          description="The dashboard shell is ready; this page is reserved for future configuration work."
        />
      </section>
    </div>
  );
}
