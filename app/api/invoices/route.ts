import { NextResponse } from "next/server";
import { createInvoiceFromProject } from "@/backend/services/finance/invoice-operations";
import { routeErrorResponse } from "@/backend/observability/errors";
import { requireApiSession } from "@/lib/auth/api";

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]); if (!auth.ok) return auth.response;
  try {
    const { projectId } = (await request.json()) as { projectId?: string };
    if (!projectId) return NextResponse.json({ success: false, error: "projectId is required." }, { status: 400 });
    const invoice = await createInvoiceFromProject({ projectId, profileId: auth.session.profile.id });
    return NextResponse.json({ success: true, invoice, invoiceId: invoice?.id ?? null });
  } catch (error) { return routeErrorResponse({ scope: "api.invoices.create", error, status: 400, details: { performedByProfileId: auth.session.profile.id } }); }
}
