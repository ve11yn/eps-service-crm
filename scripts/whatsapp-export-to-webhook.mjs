#!/usr/bin/env node
import { createHmac } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { exportFolderToMetaWebhook } from "./lib/whatsapp-export-webhook.mjs";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const folder = option("--folder");
if (!folder) {
  console.error("Usage: npm run whatsapp:fixture -- --folder <export-folder> [--output <file>] [--text-only]");
  process.exit(1);
}

const output = option("--output", "/tmp/whatsapp-meta-webhook.json");
const limit = Number(option("--limit", "0")) || undefined;
const result = await exportFolderToMetaWebhook(path.resolve(folder), {
  textOnly: process.argv.includes("--text-only"),
  customerPhone: option("--customer-phone", "6590000001"),
  contactName: option("--contact-name", "Tai Keng Gardens webhook test"),
  limit,
});

await writeFile(output, `${JSON.stringify(result.payload, null, 2)}\n`, "utf8");
const postUrl = option("--post");
let webhookResult;
if (postUrl) {
  const url = new URL(postUrl);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Fixture posting is restricted to localhost.");
  }

  const localEnv = {};
  for (const envFile of [".env", ".env.local"]) {
    try {
      const contents = await readFile(path.resolve(envFile), "utf8");
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!match) continue;
        localEnv[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
      }
    } catch {}
  }

  const rawBody = JSON.stringify(result.payload);
  const secret =
    process.env.WHATSAPP_WEBHOOK_SIGNATURE_SECRET ||
    localEnv.WHATSAPP_WEBHOOK_SIGNATURE_SECRET ||
    process.env.META_APP_SECRET ||
    localEnv.META_APP_SECRET;
  const headers = { "content-type": "application/json" };
  if (secret) {
    headers["x-hub-signature-256"] = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  }

  const response = await fetch(url, { method: "POST", headers, body: rawBody });
  const body = await response.json().catch(() => ({}));
  webhookResult = {
    status: response.status,
    success: response.ok && body.success === true,
    processed: body.processed ?? 0,
    aiConversationsQueued: body.aiConversationsQueued ?? 0,
    error: body.error,
    leadId: body.results?.[0]?.leadId,
    threadId: body.results?.[0]?.threadId,
  };
  if (!response.ok) process.exitCode = 1;
}

console.log(JSON.stringify({ output, ...result.stats, webhookResult }, null, 2));
