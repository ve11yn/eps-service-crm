import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import { createAppointment, type AppointmentInput } from "@/backend/services/schedule/appointment-operations";
import { requireApiSession } from "@/lib/auth/api";

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin", "coordinator"]);
  if (!auth.ok) return auth.response;
  try {
    const payload = await request.json() as AppointmentInput;
    const appointment = await createAppointment({
      ...payload,
      performedByProfileId: auth.session.profile.id,
    });
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.appointments.create",
      error,
      details: { performedByProfileId: auth.session.profile.id },
    });
  }
}
