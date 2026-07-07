import Link from "next/link";
import { formatDateTime, formatSourceChannelLabel } from "@/frontend/lib/format";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";

type ActionQueueItemProps = {
  href: string;
  title: string;
  subtitle: string;
  contextLabel: string;
  contextValue: string;
  status?: string | null;
  updatedAt?: string | null;
  finalValue: string;
};

export function ActionQueueItem({
  href,
  title,
  subtitle,
  contextLabel,
  contextValue,
  status,
  updatedAt,
  finalValue,
}: ActionQueueItemProps) {
  return (
    <Link href={href} className="review-draft-row">
      <span className="review-draft-main">
        <span className="review-draft-title">{title}</span>
        <span className="helper-text">{subtitle}</span>
      </span>

      <span className="review-draft-meta-group">
        <span className="review-draft-meta-label">{contextLabel}</span>
        <span className="review-draft-meta">{contextValue}</span>
      </span>

      <span>
        <StatusBadge status={status} />
      </span>

      <span className="review-draft-meta">{formatDateTime(updatedAt)}</span>

      <span className="review-draft-meta">{finalValue}</span>
    </Link>
  );
}

export function formatQueueSource(sourceCode?: string | null): string {
  return formatSourceChannelLabel(sourceCode);
}
