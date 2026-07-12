import { listContacts, listProperties } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { formatDateTime } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";
import Link from "next/link";
import { CustomerForm, PropertyForm } from "@/frontend/components/customers/customer-property-forms";

export default async function CustomersPage() {
  await requireAppSession(["owner", "admin"]);
  const [contacts, properties] = await Promise.all([
    listContacts(),
    listProperties(),
  ]);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <h1>Customers &amp; Properties</h1>
        </div>
      </section>
      <section className="report-two-column"><article className="panel"><div className="panel-header"><h2>Create customer</h2></div><CustomerForm /></article><article className="panel"><div className="panel-header"><h2>Create property</h2></div><PropertyForm /></article></section>

      <section className="report-two-column">
        <article className="panel table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Customers</p>
              <h2>{contacts.length} contacts</h2>
            </div>
          </div>
          {contacts.length === 0 ? (
            <EmptyState
              title="No customers yet"
              description="Contacts are created from WhatsApp intake and lead review."
            />
          ) : (
            <div className="review-draft-list customer-record-list">
              {contacts.map((contact) => (
                <Link key={contact.id} href={`/customers/${contact.id}`} className="customer-record-row">
                  <div className="customer-record-main">
                    <strong>{contact.full_name}</strong>
                    <span>{contact.email ?? "No email"}</span>
                  </div>
                  <span className="customer-record-phone">
                    {contact.whatsapp_number ?? contact.primary_phone ?? "No phone"}
                  </span>
                  <span className="customer-record-date">{formatDateTime(contact.updated_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="panel table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Properties</p>
              <h2>{properties.length} properties</h2>
            </div>
          </div>
          {properties.length === 0 ? (
            <EmptyState
              title="No properties yet"
              description="Properties are captured during lead qualification."
            />
          ) : (
            <div className="review-draft-list customer-record-list">
              {properties.map((property) => (
                <Link key={property.id} href={`/properties/${property.id}`} className="customer-record-row property-record-row">
                  <div className="customer-record-main">
                    <strong>{property.property_name ?? property.address_line_1}</strong>
                    <span>{property.access_notes ?? "No access notes"}</span>
                  </div>
                  <span className="customer-record-phone">{property.unit_no ?? "No unit"}</span>
                  <span className="customer-record-date">{property.postal_code ?? property.country_code}</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
