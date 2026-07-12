import "server-only";

import { isClaudeConfigured, sendClaudeTextPrompt } from "@/backend/integrations/ai/claude-client";
import type { PricingItemWithCatalog } from "@/backend/repositories";
import { searchPricingItems } from "@/backend/services/pricing/search-pricing-items";
import type { AiExtractedWorkItem } from "@/types/integration";

export const PRICING_MATCH_CONFIDENCE_THRESHOLD = 0.72;

export type PricingMatchResult = {
  pricingItem: PricingItemWithCatalog | null;
  confidence: number;
  method: "ai" | "lexical" | "none";
  notes: string;
};

function words(value: string | null | undefined) {
  return new Set((value ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));
}

function lexicalConfidence(item: AiExtractedWorkItem, candidate: PricingItemWithCatalog) {
  const source = words([item.title, item.description, item.itemType, item.itemGroup, item.actionSummary].filter(Boolean).join(" "));
  const target = words([candidate.service_title, candidate.category, candidate.description, candidate.unit_label].filter(Boolean).join(" "));
  if (!source.size || !target.size) return 0;
  let overlap = 0;
  for (const word of source) if (target.has(word)) overlap += 1;
  const coverage = overlap / Math.min(source.size, 8);
  const exactTitle = item.title.trim().toLowerCase() === candidate.service_title.trim().toLowerCase() ? 0.35 : 0;
  return Math.min(0.95, coverage * 0.75 + exactTitle);
}

async function candidatesFor(item: AiExtractedWorkItem) {
  const queries = Array.from(new Set([
    item.title,
    item.itemType,
    item.itemGroup,
    ...item.title.split(/[^a-zA-Z0-9]+/).filter((word) => word.length >= 4),
  ].map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
  const all = new Map<string, PricingItemWithCatalog>();
  for (const query of queries.slice(0, 6)) {
    const matches = await searchPricingItems({ query, limit: 12 });
    for (const match of matches) all.set(match.id, match);
  }
  return [...all.values()]
    .map((candidate) => ({ candidate, score: lexicalConfidence(item, candidate) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 12);
}

function parseJson(text: string): { pricingItemId?: string | null; confidence?: number; reasoning?: string } {
  const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(clean) as { pricingItemId?: string | null; confidence?: number; reasoning?: string };
}

export async function matchWorkItemToPricing(item: AiExtractedWorkItem): Promise<PricingMatchResult> {
  const ranked = await candidatesFor(item);
  if (!ranked.length) return { pricingItem: null, confidence: 0, method: "none", notes: "No catalogue candidates found." };

  if (isClaudeConfigured()) {
    try {
      const response = await sendClaudeTextPrompt({
        system: "You match handyman/cleaning work to a pricing catalogue. Select only when the service scope and pricing unit are genuinely compatible. Never guess. Return JSON only: {\"pricingItemId\": string|null, \"confidence\": number, \"reasoning\": string}. Confidence must be 0 to 1.",
        user: JSON.stringify({
          workItem: {
            title: item.title,
            description: item.description,
            type: item.itemType,
            group: item.itemGroup,
            action: item.actionSummary,
          },
          candidates: ranked.map(({ candidate, score }) => ({
            id: candidate.id,
            service: candidate.service_title,
            category: candidate.category,
            description: candidate.description,
            unit: candidate.unit_label,
            price: candidate.recommended_price,
            lexicalHint: Number(score.toFixed(3)),
          })),
        }),
      });
      const decision = parseJson(response.text);
      const confidence = Math.max(0, Math.min(1, Number(decision.confidence) || 0));
      const selected = ranked.find(({ candidate }) => candidate.id === decision.pricingItemId)?.candidate ?? null;
      if (selected && confidence >= PRICING_MATCH_CONFIDENCE_THRESHOLD) {
        return { pricingItem: selected, confidence, method: "ai", notes: decision.reasoning?.trim() || "AI matched against catalogue candidates." };
      }
      return { pricingItem: null, confidence, method: "ai", notes: decision.reasoning?.trim() || "AI confidence was below the automatic-match threshold." };
    } catch (error) {
      const fallback = ranked[0];
      if (fallback.score >= 0.85) {
        return { pricingItem: fallback.candidate, confidence: fallback.score, method: "lexical", notes: "Exact/high-confidence catalogue match used while AI matching was unavailable." };
      }
      return { pricingItem: null, confidence: fallback.score, method: "none", notes: error instanceof Error ? `AI match unavailable: ${error.message}` : "AI match unavailable." };
    }
  }

  const fallback = ranked[0];
  if (fallback.score >= 0.85) return { pricingItem: fallback.candidate, confidence: fallback.score, method: "lexical", notes: "High-confidence catalogue match." };
  return { pricingItem: null, confidence: fallback.score, method: "none", notes: "No candidate met the automatic-match confidence threshold." };
}
