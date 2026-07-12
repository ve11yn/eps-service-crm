import "server-only";

import crypto from "node:crypto";
import { serverEnv } from "@/lib/env/server";

type VerifyChallengeInput = {
  mode: string | null;
  token: string | null;
  challenge: string | null;
};

export function verifyWhatsAppWebhookChallenge({
  mode,
  token,
  challenge,
}: VerifyChallengeInput): string | null {
  if (!serverEnv.whatsappWebhookVerifyToken) {
    throw new Error("Missing WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  }

  if (mode !== "subscribe") return null;
  if (token !== serverEnv.whatsappWebhookVerifyToken) return null;
  return challenge;
}

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret =
    serverEnv.whatsappWebhookSignatureSecret ?? serverEnv.metaAppSecret;

  if (!secret) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const normalizedSignature = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (normalizedSignature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(normalizedSignature),
    Buffer.from(expectedSignature),
  );
}
