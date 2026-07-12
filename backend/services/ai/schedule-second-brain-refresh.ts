import "server-only";

import { after } from "next/server";
import { logSystemError } from "@/backend/observability/errors";
import { refreshSecondBrain, type SecondBrainEntityType } from "@/backend/services/ai/second-brain";

export function scheduleSecondBrainRefresh(
  entityType: SecondBrainEntityType,
  entityId: string,
  profileId?: string | null,
) {
  after(async () => {
    try {
      await refreshSecondBrain(entityType, entityId, profileId);
    } catch (error) {
      await logSystemError({
        scope: "second_brain.background_refresh",
        error,
        severity: "warning",
        details: { entity_type: entityType, entity_id: entityId },
      });
    }
  });
}
