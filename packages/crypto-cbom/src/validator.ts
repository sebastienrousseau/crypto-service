// SPDX-License-Identifier: Apache-2.0 OR MIT

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a CBOM document against schema constraints.
 */
export function validateCbom(doc: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof doc !== "object" || doc === null) {
    return { valid: false, errors: ["Document must be a non-null object"] };
  }

  const record = doc as Record<string, unknown>;

  // Check if CycloneDX
  if (record.bomFormat === "CycloneDX") {
    if (record.specVersion !== "1.6") {
      errors.push(
        `Expected specVersion '1.6', got '${String(record.specVersion)}'`,
      );
    }
    if (!record.serialNumber || typeof record.serialNumber !== "string") {
      errors.push("Missing or invalid 'serialNumber'");
    }
    if (!Array.isArray(record.components)) {
      errors.push("Missing or invalid 'components' array");
    } else {
      for (let i = 0; i < record.components.length; i++) {
        const comp = record.components[i] as Record<string, unknown>;
        if (!comp || comp.type !== "cryptographic-asset") {
          errors.push(
            `Component at index ${i} must have type 'cryptographic-asset'`,
          );
        }
        if (!comp || !comp.name) {
          errors.push(`Component at index ${i} is missing 'name'`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // Check if SPDX
  if (
    typeof record.spdxVersion === "string" &&
    record.spdxVersion.startsWith("SPDX-")
  ) {
    if (!record.spdxId || typeof record.spdxId !== "string") {
      errors.push("Missing or invalid 'spdxId'");
    }
    if (!Array.isArray(record.elements)) {
      errors.push("Missing or invalid 'elements' array");
    }
    return { valid: errors.length === 0, errors };
  }

  return {
    valid: false,
    errors: ["Unsupported document format. Expected CycloneDX 1.6 or SPDX 3.0"],
  };
}
