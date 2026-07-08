import { notFound } from "next/navigation";
import { getReviewDraftById } from "@/backend/repositories";
import { ReviewDraftEditor } from "@/frontend/components/dashboard/review-draft-editor";

type ReviewDraftDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReviewDraftDetailPage({
  params,
}: ReviewDraftDetailPageProps) {
  const { id } = await params;
  const draft = await getReviewDraftById(id);

  if (!draft) {
    notFound();
  }

  return (
    <div className="page-stack">
      <ReviewDraftEditor draft={draft} />
    </div>
  );
}
