/**
 * Deterministic extraction of a non-empty plain-text string from Notion
 * property values as returned by notion-fetch / create tools.
 *
 * Supported shapes (title, rich_text / text):
 * - plain string
 * - rich-text / title item arrays (`plain_text` or `text.content`)
 * - Notion property objects `{ type, title|rich_text|…: … }`
 *
 * Returns:
 * - `{ kind: "present", text }` when a non-empty string can be derived
 * - `{ kind: "absent" }` when missing, null, empty string, or empty arrays
 * - `{ kind: "unsupported" }` when the key is present but the shape is not
 *   one of the supported representations (not treated as missing → no repair)
 */

export type NotionValueOutcome =
  | { kind: "present"; text: string }
  | { kind: "absent" }
  | { kind: "unsupported" };

function textFromRichItem(item: unknown): string | undefined {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return undefined;
  }
  const obj = item as Record<string, unknown>;
  if (typeof obj.plain_text === "string") {
    return obj.plain_text;
  }
  const text = obj.text;
  if (text !== null && typeof text === "object" && !Array.isArray(text)) {
    const content = (text as Record<string, unknown>).content;
    if (typeof content === "string") {
      return content;
    }
  }
  return undefined;
}

function joinRichArray(items: unknown[]): string | undefined {
  const parts: string[] = [];
  for (const item of items) {
    const part = textFromRichItem(item);
    if (part === undefined) {
      return undefined;
    }
    parts.push(part);
  }
  return parts.join("");
}

function fromRichArray(value: unknown): NotionValueOutcome | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  if (value.length === 0) {
    return { kind: "absent" };
  }
  const joined = joinRichArray(value);
  if (joined === undefined) {
    return { kind: "unsupported" };
  }
  const trimmed = joined.trim();
  return trimmed.length > 0
    ? { kind: "present", text: trimmed }
    : { kind: "absent" };
}

const RICH_KEYS = ["title", "rich_text", "text"] as const;

function preferredKeys(type: unknown): readonly (typeof RICH_KEYS)[number][] {
  if (type === "title") return ["title"];
  if (type === "rich_text" || type === "text") return ["rich_text", "text"];
  return RICH_KEYS;
}

function fromPropertyObject(value: Record<string, unknown>): NotionValueOutcome {
  for (const key of preferredKeys(value.type)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const fromArray = fromRichArray(value[key]);
    if (fromArray) return fromArray;
  }

  for (const key of RICH_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const fromArray = fromRichArray(value[key]);
    if (fromArray) return fromArray;
  }

  return { kind: "unsupported" };
}

/**
 * Interpret a single Notion property value from a persisted properties map.
 */
export function interpretNotionPropertyValue(value: unknown): NotionValueOutcome {
  if (value === undefined || value === null) {
    return { kind: "absent" };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0
      ? { kind: "present", text: trimmed }
      : { kind: "absent" };
  }

  if (Array.isArray(value)) {
    return fromRichArray(value) ?? { kind: "unsupported" };
  }

  if (typeof value === "object") {
    return fromPropertyObject(value as Record<string, unknown>);
  }

  return { kind: "unsupported" };
}
