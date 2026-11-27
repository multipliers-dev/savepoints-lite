import { interpretNotionPropertyValue } from "./notion-value.js";
import type {
  MappingDocument,
  SchemaDocument,
  ValidatePersistedInput,
  ValidationIssue,
  ValidationResult,
  ValidationWarning,
} from "./types.js";

/** Advisory `owner/repo` shape; a folder-name fallback is legitimate without an origin remote. */
const REPOSITORY_FORMAT = /^[^\s/]+\/[^\s/]+$/;

function propertyValue(
  persisted: Record<string, unknown>,
  property: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(persisted, property)) {
    return persisted[property];
  }
  return undefined;
}

/**
 * Deterministic post-write check: required top-level schema fields vs Notion
 * persisted properties via the provider mapping. Does not call Notion.
 *
 * Accepts plain strings and common notion-fetch shapes for `title` /
 * `rich_text` / `text` (see notion-value.ts). Unsupported shapes yield
 * `unsupported_property_shape` (not `missing_persisted_property`) so agents
 * must not treat them as repairable gaps.
 */
export function validatePersistedProperties(
  input: unknown,
  schema: SchemaDocument,
  mapping: MappingDocument,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationWarning[] = [];

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      issues: [
        {
          kind: "invalid_input",
          message: "input must be an object with a persisted properties map",
        },
      ],
    };
  }

  const body = input as ValidatePersistedInput;
  const pageId =
    typeof body.page_id === "string" && body.page_id.trim()
      ? body.page_id.trim()
      : undefined;

  if (
    body.persisted === null ||
    typeof body.persisted !== "object" ||
    Array.isArray(body.persisted)
  ) {
    return {
      ok: false,
      page_id: pageId,
      issues: [
        {
          kind: "invalid_input",
          message: "persisted must be a plain object of Notion property values",
        },
      ],
    };
  }

  const persisted = body.persisted as Record<string, unknown>;
  const topLevel = schema.fields ?? {};

  for (const [field, def] of Object.entries(topLevel)) {
    if (field === "content") continue;
    if (!def || def.required !== true) continue;

    const mapEntry = mapping.fields?.[field];
    if (!mapEntry || typeof mapEntry.property !== "string") {
      issues.push({
        kind: "contract_mismatch",
        field,
        message: `required schema field "${field}" has no Notion mapping`,
      });
      continue;
    }

    const raw = propertyValue(persisted, mapEntry.property);
    const outcome = interpretNotionPropertyValue(raw);
    if (outcome.kind === "present") {
      if (field === "repository" && !REPOSITORY_FORMAT.test(outcome.text)) {
        warnings.push({
          kind: "repository_format",
          field,
          property: mapEntry.property,
          message: `"${mapEntry.property}" is not in owner/repo form (advisory; not repaired)`,
        });
      }
      continue;
    }
    if (outcome.kind === "unsupported") {
      issues.push({
        kind: "unsupported_property_shape",
        field,
        property: mapEntry.property,
        message: `required field "${field}" mapped to "${mapEntry.property}" has an unsupported Notion property shape (not treated as missing)`,
      });
      continue;
    }
    issues.push({
      kind: "missing_persisted_property",
      field,
      property: mapEntry.property,
      message: `required field "${field}" mapped to "${mapEntry.property}" is missing or empty`,
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    page_id: pageId,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
