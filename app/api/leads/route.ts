import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { listLeads } from "@/backend/repositories";
import { createManualLead } from "@/backend/services/leads/create-manual-lead";
import { requireApiSession } from "@/lib/auth/api";
import { scheduleSecondBrainRefresh } from "@/backend/services/ai/schedule-second-brain-refresh";

export async function GET() {
  const auth = await requireApiSession(["owner", "admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const leads = await listLeads();

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.leads.list",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const lead = await createManualLead({
      customerName: String(body.customerName ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      title: String(body.title ?? ""),
      request: String(body.request ?? ""),
      profileId: auth.session.profile.id,
    });
    scheduleSecondBrainRefresh("lead", lead.id, auth.session.profile.id);
    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.leads.create_manual",
      error,
      status: 400,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
