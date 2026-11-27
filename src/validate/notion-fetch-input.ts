/**
 * Input adapter: Notion `notion-fetch` result -> canonical validator input.
 *
 * An agent convenience, not the integration contract. The contract remains the
 * structured `{ "persisted": {...}, "page_id"?: "..." }` JSON. This module only
 * recognizes a fetch result (a `<properties>...</properties>` block, either raw
 * or inside a JSON envelope's string `text`) and rewrites it to that shape. It
 * knows nothing about requiredness, mapping, or repair.
 */
import type { ValidatePersistedInput } from "./types.js";

export type FetchEnvelope = { text: string; page_id?: unknown };

export type AdaptResult =
  | { ok: true; input: ValidatePersistedInput }
  | { ok: false; message: string };

const PROPERTIES_BLOCK = /<properties>([\s\S]*?)<\/properties>/;

export function hasPropertiesBlock(text: string): boolean {
  return PROPERTIES_BLOCK.test(text);
}

/** A JSON object whose string `text` contains a `<properties>` block. */
export function isFetchEnvelope(value: unknown): value is FetchEnvelope {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const text = (value as Record<string, unknown>).text;
  return typeof text === "string" && hasPropertiesBlock(text);
}

/**
 * Extract and parse the `<properties>` block. `page_id` is kept only when the
 * caller passes an explicit string (the envelope's top-level `page_id`); no
 * URL or text heuristics.
 */
export function adaptFetchText(text: string, pageId?: unknown): AdaptResult {
  const match = PROPERTIES_BLOCK.exec(text);
  if (!match) {
    return { ok: false, message: "no <properties> block found in input" };
  }

  let persisted: unknown;
  try {
    persisted = JSON.parse(match[1]);
  } catch {
    return {
      ok: false,
      message: "<properties> block does not contain valid JSON",
    };
  }
  if (
    persisted === null ||
    typeof persisted !== "object" ||
    Array.isArray(persisted)
  ) {
    return {
      ok: false,
      message: "<properties> block must contain a JSON object",
    };
  }

  const input: ValidatePersistedInput = {
    persisted: persisted as Record<string, unknown>,
  };
  if (typeof pageId === "string" && pageId.trim()) {
    input.page_id = pageId.trim();
  }
  return { ok: true, input };
}
