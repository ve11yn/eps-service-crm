import { NextResponse } from "next/server";
import { routeErrorResponse } from "@/backend/observability/errors";
import {
  connectWhatsApp,
  retryWhatsAppConnection,
  type WhatsAppOnboardingType,
} from "@/backend/services/integrations/connect-whatsapp";
import { requireApiSession } from "@/lib/auth/api";

type ConnectPayload = {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
  onboardingType?: WhatsAppOnboardingType;
  pin?: string;
  retry?: boolean;
};

function publicConnection(connection: {
  id: string;
  status: string;
  onboarding_type: string;
  display_phone_number: string | null;
  verified_name: string | null;
  history_sync_requested_at: string | null;
  last_error: string | null;
}) {
  return {
    id: connection.id,
    status: connection.status,
    onboardingType: connection.onboarding_type,
    displayPhoneNumber: connection.display_phone_number,
    verifiedName: connection.verified_name,
    historySyncRequestedAt: connection.history_sync_requested_at,
    lastError: connection.last_error,
  };
}

export async function POST(request: Request) {
  const auth = await requireApiSession(["owner", "admin"]);
  if (!auth.ok) return auth.response;

  try {
    const payload = (await request.json()) as ConnectPayload;

    if (payload.retry) {
      const connection = await retryWhatsAppConnection({
        pin: payload.pin,
        performedByProfileId: auth.session.profile.id,
      });
      return NextResponse.json({
        success: true,
        connection: publicConnection(connection),
      });
    }

    if (!payload.code || !payload.wabaId) {
      return NextResponse.json(
        { success: false, error: "code and wabaId are required" },
        { status: 400 },
      );
    }

    const connection = await connectWhatsApp({
      code: payload.code,
      wabaId: payload.wabaId,
      phoneNumberId: payload.phoneNumberId,
      businessId: payload.businessId,
      onboardingType:
        payload.onboardingType === "coexistence" ? "coexistence" : "standard",
      pin: payload.pin,
      performedByProfileId: auth.session.profile.id,
    });

    return NextResponse.json({
      success: true,
      connection: publicConnection(connection),
    });
  } catch (error) {
    return routeErrorResponse({
      scope: "api.integrations.whatsapp.connection",
      error,
      details: { performedByProfileId: auth.session.profile.id },
      status: 502,
    });
  }
}
