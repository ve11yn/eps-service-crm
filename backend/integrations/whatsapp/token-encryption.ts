import "server-only";

import crypto from "node:crypto";
import { serverEnv } from "@/lib/env/server";

function getEncryptionKey(): Buffer {
  const configuredKey = serverEnv.whatsappTokenEncryptionKey;

  if (!configuredKey) {
    throw new Error("Missing WHATSAPP_TOKEN_ENCRYPTION_KEY");
  }

  const key = /^[a-f\d]{64}$/i.test(configuredKey)
    ? Buffer.from(configuredKey, "hex")
    : Buffer.from(configuredKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex value",
    );
  }

  return key;
}

export function encryptWhatsAppToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptWhatsAppToken(envelope: string): string {
  const [version, ivValue, tagValue, encryptedValue] = envelope.split(".");

  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored WhatsApp access token has an invalid format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
