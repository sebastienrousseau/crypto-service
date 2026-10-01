// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { CryptoAsset, CycloneDxCbom, CycloneDxComponent } from "./types";
import { VERSION } from "./version";

export interface CycloneDxOptions {
  componentName?: string;
  componentVersion?: string;
  componentType?: string;
}

/**
 * Generates a CycloneDX 1.6 Cryptographic Bill of Materials (CBOM).
 */
export function generateCycloneDxCbom(
  assets: CryptoAsset[],
  options: CycloneDxOptions = {},
): CycloneDxCbom {
  const serialNumber = `urn:uuid:${crypto.randomUUID()}`;
  const timestamp = new Date().toISOString();

  const components: CycloneDxComponent[] = assets.map((asset) => {
    return {
      type: "cryptographic-asset",
      name: asset.name,
      version: asset.standard,
      "crypto-properties": {
        assetType: asset.type,
        algorithmProperties: {
          primitive: asset.algorithm,
          mode: asset.mode,
          classicalSecurityLevel: asset.keySize,
          nistQuantumSecurityLevel: asset.quantumResistant
            ? asset.keySize && asset.keySize >= 1024
              ? 5
              : 3
            : 0,
          cryptoFunctions: [asset.type],
        },
      },
    };
  });

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber,
    version: 1,
    metadata: {
      timestamp,
      tools: [
        {
          vendor: "Sebastien Rousseau",
          name: "@sebastienrousseau/crypto-cbom",
          version: VERSION,
        },
      ],
      component: {
        name: options.componentName || "cryptographic-application",
        // CycloneDX 1.6 makes component.version optional: omit it rather
        // than invent a version for an application we did not analyse.
        ...(options.componentVersion
          ? { version: options.componentVersion }
          : {}),
        type: options.componentType || "application",
      },
    },
    components,
  };
}
