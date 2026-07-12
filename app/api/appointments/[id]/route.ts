import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { type AppointmentInput, updateAppointment } from "@/backend/services/schedule/appointment-operations";
import { requireApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const payload = await request.json() as AppointmentInput;
    const appointment = await updateAppointment(id, {
      ...payload,
      performedByProfileId: auth.session.profile.id,
    });
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.appointments.update",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
