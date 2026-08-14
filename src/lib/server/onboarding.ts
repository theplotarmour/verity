import "server-only";

import { groqClient, isGroqConfigured, GROQ_MODELS } from "./groq";
import {
  VERTICAL_PACKS,
  modulesForPack,
  resolvePackKey,
  verticalPackOptions,
  type VerticalPackKey,
} from "@/platform/tenancy/packs";

/**
 * Onboarding — map a business description to a vertical pack (R5).
 *
 * The model picks; it does not invent. Its answer is passed through
 * `resolvePackKey`, the same validator the dashboard router trusts, so a
 * hallucinated "hospitality_pro" resolves to null and the wizard falls back to
 * letting the owner choose, rather than provisioning a pack that does not exist.
 * The set of packs the model may choose from is the real registry, listed at call
 * time — add a pack and the wizard can suggest it with no change here.
 */

export interface PackSuggestion {
  packKey: VerticalPackKey;
  label: string;
  modules: string[];
}

/**
 * Turn a raw model answer into a real suggestion, or null. Pure and exported so
 * the validation is tested without a model — the half that stops a made-up key
 * from becoming a provisioning decision.
 */
export function parseSuggestion(raw: string | null | undefined): PackSuggestion | null {
  const key = resolvePackKey((raw ?? "").trim());
  if (!key) return null;
  return { packKey: key, label: VERTICAL_PACKS[key].label, modules: modulesForPack(key) };
}

export type SuggestResult =
  | { ok: true; suggestion: PackSuggestion | null }
  | { ok: false; reason: string };

/**
 * Ask the model which pack fits a free-text business description.
 *
 * Deterministic-leaning (temperature 0) and the small model — this is a
 * classification into a closed list, not a piece of writing.
 */
export async function suggestPack(description: string): Promise<SuggestResult> {
  const text = description?.trim();
  if (!text) return { ok: false, reason: "Describe the business first." };
  if (!isGroqConfigured()) return { ok: false, reason: "The assistant is not configured on this deployment." };

  const options = verticalPackOptions();
  const list = options.map((o) => `- ${o.key}: ${o.label}`).join("\n");

  const system = [
    "You match a business to one operating pack from a fixed list.",
    "Reply with ONLY the pack key (the part before the colon), nothing else.",
    "If none fit, reply exactly: none.",
    "",
    "Packs:",
    list,
  ].join("\n");

  try {
    const completion = await groqClient().chat.completions.create({
      model: GROQ_MODELS.fast,
      temperature: 0,
      max_tokens: 16,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    return { ok: true, suggestion: parseSuggestion(raw) };
  } catch (error) {
    console.error("Pack suggestion failed", error);
    return { ok: false, reason: "Could not reach the assistant. Pick a pack manually." };
  }
}
