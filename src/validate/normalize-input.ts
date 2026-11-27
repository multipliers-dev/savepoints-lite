/**
 * Single normalization step for every CLI payload (stdin or --input).
 *
 * Output is the canonical `{ persisted, page_id? }` input; only that output is
 * handed to `validatePersistedProperties`, which never sees raw fetch text.
 *
 * Order: JSON.parse first. A parse failure is not terminal; the raw text is
 * offered to the Notion fetch adapter. Parsed values are classified after
 * parsing: structured input passes through unchanged, a fetch envelope goes to
 * the adapter, anything else is invalid_input.
 */
import { adaptFetchText, isFetchEnvelope } from "./notion-fetch-input.js";

export type NormalizeResult =
  | { ok: true; input: unknown }
  | { ok: false; message: string };

const UNRECOGNIZED =
  'input must be {"persisted": {...}} JSON or a notion-fetch result containing a <properties> block';

export function normalizeCliInput(raw: string): NormalizeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const adapted = adaptFetchText(raw);
    return adapted.ok
      ? { ok: true, input: adapted.input }
      : { ok: false, message: UNRECOGNIZED };
  }

  if (
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Object.prototype.hasOwnProperty.call(parsed, "persisted")
  ) {
    return { ok: true, input: parsed };
  }

  if (isFetchEnvelope(parsed)) {
    const adapted = adaptFetchText(parsed.text, parsed.page_id);
    return adapted.ok
      ? { ok: true, input: adapted.input }
      : { ok: false, message: adapted.message };
  }

  return { ok: false, message: UNRECOGNIZED };
}
