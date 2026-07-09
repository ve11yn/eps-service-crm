import Link from "next/link";
import { listQuotes } from "@/backend/repositories";
import { EmptyState } from "@/frontend/components/dashboard/empty-state";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { formatDateTime, formatMoney } from "@/frontend/lib/format";
import { requireAppSession } from "@/lib/auth/session";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

function getLeadGroupKey(quote: QuoteListItem) {
  return quote.lead_id ?? `unlinked-${quote.id}`;
}

function getLeadTitle(quote: QuoteListItem) {
  const lead = Array.isArray(quote.leads) ? quote.leads[0] : quote.leads;
  return lead?.title ?? "Unlinked quote";
}

function getLeadCode(quote: QuoteListItem) {
  const lead = Array.isArray(quote.leads) ? quote.leads[0] : quote.leads;
  return lead?.lead_code ?? "No lead";
}

export default async function QuotesPage() {
  await requireAppSession(["owner", "admin"]);
  const quotes = await listQuotes();
  const quoteGroups = Array.from(
    quotes.reduce((groups, quote) => {
      const key = getLeadGroupKey(quote);
      const existing = groups.get(key) ?? [];
      existing.push(quote);
      groups.set(key, existing);
      return groups;
    }, new Map<string, QuoteListItem[]>()),
  )
    .map(([key, groupQuotes]) => {
      const sortedQuotes = [...groupQuotes].sort((left, right) => {
        if (right.version_number !== left.version_number) {
          return right.version_number - left.version_number;
        }

        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      });
      const latestQuote = sortedQuotes[0];

      return {
        key,
        latestQuote,
        quotes: sortedQuotes,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.latestQuote.updated_at).getTime() -
        new Date(left.latestQuote.updated_at).getTime(),
    );

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Commercial</p>
          <h1>Quotes</h1>
          <p className="page-header-copy">
            Quote queue grouped by Lead, with each Lead keeping its own quote versions.
          </p>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quote Pipeline</p>
            <h2>{quoteGroups.length} lead quote stacks</h2>
          </div>
        </div>

        {quoteGroups.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Create draft quotes from a Lead. Quote versions will stay grouped under that Lead."
          />
        ) : (
          <div className="review-draft-list">
            <div className="review-draft-list-head" aria-hidden="true">
              <span>Lead / Latest Quote</span>
              <span>Versions</span>
              <span>Latest Status</span>
              <span>Updated</span>
              <span>Latest Total</span>
            </div>

            {quoteGroups.map(({ key, latestQuote, quotes: groupQuotes }) => (
              <Link
                key={key}
                href={latestQuote.lead_id ? `/leads/${latestQuote.lead_id}` : `/quotes/${latestQuote.id}`}
                className="review-draft-row"
              >
                <div>
                  <strong>{getLeadTitle(latestQuote)}</strong>
                  <span>
                    {getLeadCode(latestQuote)} · Latest {latestQuote.quote_number}
                  </span>
                </div>
                <span>{groupQuotes.length} version{groupQuotes.length === 1 ? "" : "s"}</span>
                <StatusBadge status={latestQuote.status_code} />
                <span>{formatDateTime(latestQuote.updated_at)}</span>
                <span>{formatMoney(latestQuote.total_amount)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
