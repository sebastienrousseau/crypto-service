// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { CryptoAsset, SpdxCbom, SpdxElement } from "./types";
import { VERSION } from "./version";

export interface SpdxOptions {
  name?: string;
  creator?: string;
}

/**
 * Generates an SPDX 3.0 Cryptographic profile document.
 */
export function generateSpdxCbom(
  assets: CryptoAsset[],
  options: SpdxOptions = {},
): SpdxCbom {
  const spdxId = `SPDXRef-CBOM-${crypto.randomUUID()}`;
  const created = new Date().toISOString();

  const elements: SpdxElement[] = assets.map((asset, index) => {
    return {
      spdxId: `SPDXRef-CryptoAsset-${index + 1}`,
      name: asset.name,
      type: asset.type,
      algorithm: asset.algorithm,
      quantumSafe: asset.quantumResistant,
      standard: asset.standard,
    };
  });

  return {
    spdxVersion: "SPDX-3.0.0",
    spdxId,
    name: options.name || "Crypto-Service-CBOM",
    creationInfo: {
      created,
      creators: [
        options.creator || `Tool: @sebastienrousseau/crypto-cbom-${VERSION}`,
      ],
    },
    elements,
  };
}
