export type IssueKind =
  | "missing_persisted_property"
  | "unsupported_property_shape"
  | "contract_mismatch"
  | "invalid_input";

export type ValidationIssue = {
  kind: IssueKind;
  field?: string;
  property?: string;
  message: string;
};

export type WarningKind = "repository_format";

/** Advisory only: never affects `ok`, `issues`, or the exit code. */
export type ValidationWarning = {
  kind: WarningKind;
  field?: string;
  property?: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  page_id?: string;
  /** Omitted when empty. */
  warnings?: ValidationWarning[];
};

export type SchemaField = {
  required: boolean;
  fields?: Record<string, SchemaField>;
};

export type SchemaDocument = {
  fields: Record<string, SchemaField>;
};

export type MappingField = {
  property: string;
  type: string;
  set_on_create: "always" | "when_known" | false;
};

export type MappingDocument = {
  provider: string;
  fields: Record<string, MappingField>;
  system?: Record<string, unknown>;
};

export type ValidatePersistedInput = {
  persisted: Record<string, unknown>;
  page_id?: string;
};
