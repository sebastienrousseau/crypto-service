// SPDX-License-Identifier: Apache-2.0 OR MIT

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type Doc = Record<string, unknown>;

const result = (errors: string[]): ValidationResult => ({
  valid: errors.length === 0,
  errors,
});

/** Errors for each component that is not a named cryptographic asset. */
function componentErrors(components: unknown[]): string[] {
  return components.flatMap((component, i) => {
    const comp = component as Doc | null;
    const errors: string[] = [];
    if (!comp || comp.type !== "cryptographic-asset") {
      errors.push(
        `Component at index ${i} must have type 'cryptographic-asset'`,
      );
    }
    if (!comp || !comp.name) {
      errors.push(`Component at index ${i} is missing 'name'`);
    }
    return errors;
  });
}

/** A string field that is present and not empty. */
const isNonEmptyString = (value: unknown): boolean =>
  typeof value === "string" && value !== "";

function validateCycloneDx(record: Doc): ValidationResult {
  const errors: string[] = [];
  if (record.specVersion !== "1.6") {
    errors.push(
      `Expected specVersion '1.6', got '${String(record.specVersion)}'`,
    );
  }
  if (!isNonEmptyString(record.serialNumber)) {
    errors.push("Missing or invalid 'serialNumber'");
  }
  if (Array.isArray(record.components)) {
    errors.push(...componentErrors(record.components));
  } else {
    errors.push("Missing or invalid 'components' array");
  }
  return result(errors);
}

function validateSpdx(record: Doc): ValidationResult {
  const errors: string[] = [];
  if (!isNonEmptyString(record.spdxId)) {
    errors.push("Missing or invalid 'spdxId'");
  }
  if (!Array.isArray(record.elements)) {
    errors.push("Missing or invalid 'elements' array");
  }
  return result(errors);
}

const isSpdx = (record: Doc): boolean =>
  typeof record.spdxVersion === "string" &&
  record.spdxVersion.startsWith("SPDX-");

/**
 * Validates a CBOM document against schema constraints.
 */
export function validateCbom(doc: unknown): ValidationResult {
  if (typeof doc !== "object" || doc === null) {
    return { valid: false, errors: ["Document must be a non-null object"] };
  }
  const record = doc as Doc;
  if (record.bomFormat === "CycloneDX") return validateCycloneDx(record);
  if (isSpdx(record)) return validateSpdx(record);
  return {
    valid: false,
    errors: ["Unsupported document format. Expected CycloneDX 1.6 or SPDX 3.0"],
  };
}
