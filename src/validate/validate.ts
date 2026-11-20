import type {
  MappingDocument,
  SchemaDocument,
  ValidatePersistedInput,
  ValidationIssue,
  ValidationResult,
} from "./types.js";

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

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
 */
export function validatePersistedProperties(
  input: unknown,
  schema: SchemaDocument,
  mapping: MappingDocument,
): ValidationResult {
  const issues: ValidationIssue[] = [];

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

    const value = propertyValue(persisted, mapEntry.property);
    if (!isNonEmptyString(value)) {
      issues.push({
        kind: "missing_persisted_property",
        field,
        property: mapEntry.property,
        message: `required field "${field}" mapped to "${mapEntry.property}" is missing or empty`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    page_id: pageId,
  };
}
