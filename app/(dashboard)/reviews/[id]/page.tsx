import { redirect } from "next/navigation";

type ReviewDraftDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReviewDraftDetailPage({
  params,
}: ReviewDraftDetailPageProps) {
  const { id } = await params;
  redirect(`/inbox/reviews/${id}`);
}
