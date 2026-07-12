import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { deleteManagedProjectItem, performProjectItemAction, updateManagedProjectItem } from "@/backend/services/projects/project-management";
import { requireApiSession } from "@/lib/auth/api";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]); if (!auth.ok) return auth.response;
  try { const { id } = await params; const body = await request.json() as Record<string, unknown>; const item = body.action ? await performProjectItemAction(id, String(body.action), typeof body.reason === "string" ? body.reason.trim() || null : null, auth.session.profile.id) : await updateManagedProjectItem(id, body, auth.session.profile.id); return NextResponse.json({ success: true, item }); }
  catch (error) { return routeErrorResponse({ scope: "api.project_items.manage", error, details: { performedByProfileId: auth.session.profile.id } }); }
}
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireApiSession(["owner", "admin"]); if (!auth.ok) return auth.response;
  try { const { id } = await params; await deleteManagedProjectItem(id, auth.session.profile.id); return NextResponse.json({ success: true }); }
  catch (error) { return routeErrorResponse({ scope: "api.project_items.delete", error, details: { performedByProfileId: auth.session.profile.id } }); }
}
