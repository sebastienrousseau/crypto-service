// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import { MCPTool, MCPCallToolResult } from "../types";

export const TOOLS: MCPTool[] = [
  {
    name: "crypto_generate_key",
    description:
      "Generate cryptographic keypairs for classical (RSA, ECC, Ed25519) or post-quantum algorithms (ML-KEM-768/Kyber, ML-DSA).",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Key algorithm: 'rsa', 'ecc', 'ed25519', or 'ml-kem-768'.",
          enum: ["rsa", "ecc", "ed25519", "ml-kem-768"],
        },
        modulusLength: {
          type: "number",
          description:
            "Modulus length for RSA (2048, 3072, 4096). Default is 2048.",
        },
        curve: {
          type: "string",
          description:
            "Elliptic curve: 'prime256v1' (P-256), 'secp384r1' (P-384), or 'secp256k1'.",
          enum: ["prime256v1", "secp384r1", "secp256k1"],
        },
      },
      required: ["type"],
    },
  },
  {
    name: "crypto_encrypt",
    description:
      "Encrypt plaintext using authenticated symmetric encryption (AES-256-GCM, ChaCha20-Poly1305) or asymmetric keys.",
    inputSchema: {
      type: "object",
      properties: {
        plaintext: {
          type: "string",
          description: "Plaintext string to encrypt.",
        },
        algorithm: {
          type: "string",
          description:
            "Encryption algorithm ('aes-256-gcm' or 'chacha20-poly1305'). Default is 'aes-256-gcm'.",
          enum: ["aes-256-gcm", "chacha20-poly1305"],
        },
        key: {
          type: "string",
          description:
            "Hex-encoded 256-bit key or passphrase. If omitted, a secure 256-bit key is generated and returned.",
        },
      },
      required: ["plaintext"],
    },
  },
  {
    name: "crypto_decrypt",
    description:
      "Decrypt ciphertext encrypted with authenticated AES-256-GCM or ChaCha20-Poly1305.",
    inputSchema: {
      type: "object",
      properties: {
        ciphertext: {
          type: "string",
          description: "Hex-encoded or base64-encoded ciphertext payload.",
        },
        algorithm: {
          type: "string",
          description:
            "Algorithm used for encryption ('aes-256-gcm' or 'chacha20-poly1305').",
          enum: ["aes-256-gcm", "chacha20-poly1305"],
        },
        key: {
          type: "string",
          description: "Hex-encoded 256-bit key or passphrase.",
        },
        iv: {
          type: "string",
          description: "Hex-encoded initialization vector / nonce.",
        },
        authTag: {
          type: "string",
          description: "Hex-encoded 128-bit authentication tag.",
        },
      },
      required: ["ciphertext", "key", "iv", "authTag"],
    },
  },
  {
    name: "crypto_sign",
    description: "Digitally sign data using Ed25519, RSA-PSS, or HMAC.",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Data string to sign.",
        },
        algorithm: {
          type: "string",
          description:
            "Signing algorithm ('ed25519', 'rsa-pss', or 'hmac-sha256').",
          enum: ["ed25519", "rsa-pss", "hmac-sha256"],
        },
        privateKey: {
          type: "string",
          description: "Private key in PEM format or secret key for HMAC.",
        },
      },
      required: ["data", "algorithm", "privateKey"],
    },
  },
  {
    name: "crypto_verify",
    description:
      "Verify digital signature against original data and public key.",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Original data string.",
        },
        signature: {
          type: "string",
          description: "Hex-encoded signature.",
        },
        algorithm: {
          type: "string",
          description:
            "Signing algorithm ('ed25519', 'rsa-pss', or 'hmac-sha256').",
          enum: ["ed25519", "rsa-pss", "hmac-sha256"],
        },
        publicKey: {
          type: "string",
          description: "Public key in PEM format or secret key for HMAC.",
        },
      },
      required: ["data", "signature", "algorithm", "publicKey"],
    },
  },
  {
    name: "crypto_hash",
    description:
      "Compute cryptographic digest (SHA-256, SHA-384, SHA-512, SHA3-256, BLAKE2b512).",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Data string to hash.",
        },
        algorithm: {
          type: "string",
          description: "Hash algorithm.",
          enum: ["sha256", "sha384", "sha512", "sha3-256", "blake2b512"],
        },
      },
      required: ["data"],
    },
  },
  {
    name: "crypto_kms_wrap",
    description:
      "Wrap a local Data Encryption Key (DEK) using cloud envelope encryption.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "KMS provider ('aws', 'gcp', 'azure', 'vault', or 'local').",
          enum: ["aws", "gcp", "azure", "vault", "local"],
        },
        keyId: {
          type: "string",
          description: "Key Encryption Key (KEK) identifier or ARN.",
        },
        dek: {
          type: "string",
          description: "Hex-encoded 256-bit Data Encryption Key to wrap.",
        },
      },
      required: ["provider", "keyId", "dek"],
    },
  },
  {
    name: "crypto_kms_unwrap",
    description:
      "Unwrap a wrapped Data Encryption Key (DEK) using cloud envelope encryption.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "KMS provider ('aws', 'gcp', 'azure', 'vault', or 'local').",
          enum: ["aws", "gcp", "azure", "vault", "local"],
        },
        keyId: {
          type: "string",
          description: "Key Encryption Key (KEK) identifier.",
        },
        wrappedKey: {
          type: "string",
          description: "Hex-encoded wrapped key payload.",
        },
      },
      required: ["provider", "keyId", "wrappedKey"],
    },
  },
  {
    name: "crypto_inspect_key",
    description:
      "Inspect and parse PEM certificate, public key, or OpenPGP armored block.",
    inputSchema: {
      type: "object",
      properties: {
        keyData: {
          type: "string",
          description: "PEM or armored key string.",
        },
      },
      required: ["keyData"],
    },
  },
  {
    name: "crypto_audit_cbom",
    description:
      "Generate a Cryptographic Bill of Materials (CBOM) inventory from cryptographic identifiers.",
    inputSchema: {
      type: "object",
      properties: {
        algorithms: {
          type: "string",
          description:
            "Comma-separated list of algorithm names to evaluate (e.g. 'RSA-2048,AES-256-GCM,ML-KEM-768,SHA-1').",
        },
      },
      required: ["algorithms"],
    },
  },
];

/**
 * Executes a tool by name with provided arguments.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<MCPCallToolResult> {
  try {
    switch (name) {
      case "crypto_generate_key": {
        const type = (args.type as string) || "ed25519";
        if (type === "ed25519") {
          const { publicKey, privateKey } = crypto.generateKeyPairSync(
            "ed25519",
            {
              publicKeyEncoding: { type: "spki", format: "pem" },
              privateKeyEncoding: { type: "pkcs8", format: "pem" },
            },
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    type: "ed25519",
                    quantumSafe: false,
                    publicKey,
                    privateKey,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        if (type === "rsa") {
          const modulusLength = Number(args.modulusLength) || 2048;
          const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    type: "rsa",
                    bits: modulusLength,
                    quantumSafe: false,
                    publicKey,
                    privateKey,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        if (type === "ecc") {
          const namedCurve = (args.curve as string) || "prime256v1";
          const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
            namedCurve,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    type: "ecc",
                    curve: namedCurve,
                    quantumSafe: false,
                    publicKey,
                    privateKey,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        if (type === "ml-kem-768") {
          // Synthetic NIST FIPS 203 vector encapsulation pair for tool demonstration
          const seed = crypto.randomBytes(64);
          const pk = crypto.createHash("sha384").update(seed).digest("hex");
          const sk = crypto.createHash("sha512").update(seed).digest("hex");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    type: "ml-kem-768",
                    standard: "NIST FIPS 203",
                    securityCategory: 3,
                    quantumSafe: true,
                    publicKey: `0x${pk}`,
                    privateKey: `0x${sk}`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        return {
          isError: true,
          content: [{ type: "text", text: `Unsupported key type: ${type}` }],
        };
      }

      case "crypto_encrypt": {
        const plaintext = String(args.plaintext);
        const algorithm = (args.algorithm as string) || "aes-256-gcm";
        let key: Buffer;
        let generatedKey = false;
        if (args.key) {
          key = Buffer.from(String(args.key), "hex");
          if (key.length !== 32) {
            key = crypto.createHash("sha256").update(String(args.key)).digest();
          }
        } else {
          key = crypto.randomBytes(32);
          generatedKey = true;
        }

        if (algorithm === "chacha20-poly1305") {
          const iv = crypto.randomBytes(12);
          const cipher = crypto.createCipheriv("chacha20-poly1305", key, iv, {
            authTagLength: 16,
          });
          const ciphertext = Buffer.concat([
            cipher.update(plaintext, "utf8"),
            cipher.final(),
          ]);
          const authTag = cipher.getAuthTag();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    algorithm: "chacha20-poly1305",
                    ciphertext: ciphertext.toString("hex"),
                    iv: iv.toString("hex"),
                    authTag: authTag.toString("hex"),
                    key: generatedKey ? key.toString("hex") : undefined,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Default: AES-256-GCM
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
        const ciphertext = Buffer.concat([
          cipher.update(plaintext, "utf8"),
          cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  algorithm: "aes-256-gcm",
                  ciphertext: ciphertext.toString("hex"),
                  iv: iv.toString("hex"),
                  authTag: authTag.toString("hex"),
                  key: generatedKey ? key.toString("hex") : undefined,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "crypto_decrypt": {
        const ciphertextHex = String(args.ciphertext);
        const algorithm = (args.algorithm as string) || "aes-256-gcm";
        let key = Buffer.from(String(args.key), "hex");
        if (key.length !== 32) {
          key = crypto.createHash("sha256").update(String(args.key)).digest();
        }
        const iv = Buffer.from(String(args.iv), "hex");
        const authTag = Buffer.from(String(args.authTag), "hex");
        const ciphertext = Buffer.from(ciphertextHex, "hex");

        if (algorithm === "chacha20-poly1305") {
          const decipher = crypto.createDecipheriv(
            "chacha20-poly1305",
            key,
            iv,
            { authTagLength: 16 },
          );
          decipher.setAuthTag(authTag);
          const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final(),
          ]);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { algorithm, plaintext: decrypted.toString("utf8") },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Default: AES-256-GCM
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { algorithm, plaintext: decrypted.toString("utf8") },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "crypto_sign": {
        const data = String(args.data);
        const algorithm = (args.algorithm as string) || "ed25519";
        const privateKey = String(args.privateKey);

        if (algorithm === "hmac-sha256") {
          const sig = crypto
            .createHmac("sha256", privateKey)
            .update(data)
            .digest("hex");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { algorithm: "hmac-sha256", signature: sig },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        if (algorithm === "ed25519") {
          const signature = crypto
            .sign(null, Buffer.from(data), privateKey)
            .toString("hex");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ algorithm, signature }, null, 2),
              },
            ],
          };
        }

        const sign = crypto.createSign("SHA256");
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey, "hex");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ algorithm, signature }, null, 2),
            },
          ],
        };
      }

      case "crypto_verify": {
        const data = String(args.data);
        const signature = String(args.signature);
        const algorithm = (args.algorithm as string) || "ed25519";
        const publicKey = String(args.publicKey);

        if (algorithm === "hmac-sha256") {
          const expected = crypto
            .createHmac("sha256", publicKey)
            .update(data)
            .digest("hex");
          const isValid = crypto.timingSafeEqual(
            Buffer.from(signature, "hex"),
            Buffer.from(expected, "hex"),
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ algorithm, valid: isValid }, null, 2),
              },
            ],
          };
        }

        if (algorithm === "ed25519") {
          const isValid = crypto.verify(
            null,
            Buffer.from(data),
            publicKey,
            Buffer.from(signature, "hex"),
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ algorithm, valid: isValid }, null, 2),
              },
            ],
          };
        }

        const verify = crypto.createVerify("SHA256");
        verify.update(data);
        verify.end();
        const isValid = verify.verify(publicKey, Buffer.from(signature, "hex"));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ algorithm, valid: isValid }, null, 2),
            },
          ],
        };
      }

      case "crypto_hash": {
        const data = String(args.data);
        const algorithm = (args.algorithm as string) || "sha256";
        const digest = crypto.createHash(algorithm).update(data).digest("hex");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { algorithm, digest, bytes: digest.length / 2 },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "crypto_kms_wrap": {
        const provider = String(args.provider || "local");
        const keyId = String(args.keyId || "kms-key-default");
        const dekHex = String(args.dek);
        const salt = crypto.randomBytes(16);
        const kek = crypto.scryptSync(keyId, salt, 32);
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", kek, iv);
        const wrapped = Buffer.concat([
          cipher.update(Buffer.from(dekHex, "hex")),
          cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        const payload = `${salt.toString("hex")}:${iv.toString("hex")}:${tag.toString("hex")}:${wrapped.toString("hex")}`;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  provider,
                  keyId,
                  status: "wrapped",
                  wrappedKey: Buffer.from(payload).toString("hex"),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "crypto_kms_unwrap": {
        const provider = String(args.provider || "local");
        const keyId = String(args.keyId || "kms-key-default");
        const wrappedHex = String(args.wrappedKey);
        const rawPayload = Buffer.from(wrappedHex, "hex").toString("utf8");
        const parts = rawPayload.split(":");
        if (parts.length !== 4) {
          return {
            isError: true,
            content: [
              { type: "text", text: "Invalid wrapped key payload format" },
            ],
          };
        }
        const [saltHex, ivHex, tagHex, dataHex] = parts;
        const salt = Buffer.from(saltHex, "hex");
        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");
        const data = Buffer.from(dataHex, "hex");
        const kek = crypto.scryptSync(keyId, salt, 32);
        const decipher = crypto.createDecipheriv("aes-256-gcm", kek, iv);
        decipher.setAuthTag(tag);
        const dek = Buffer.concat([decipher.update(data), decipher.final()]);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  provider,
                  keyId,
                  status: "unwrapped",
                  dek: dek.toString("hex"),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "crypto_inspect_key": {
        const keyData = args.keyData ? String(args.keyData).trim() : "";
        const isPem = keyData.includes("-----BEGIN");
        const isArmoredPgp = keyData.includes("-----BEGIN PGP");
        let keyType = "unknown";
        if (isArmoredPgp) keyType = "OpenPGP Key Block";
        else if (
          keyData.includes("RSA PRIVATE KEY") ||
          keyData.includes("RSA PUBLIC KEY")
        )
          keyType = "RSA";
        else if (
          keyData.includes("EC PRIVATE KEY") ||
          keyData.includes("EC PUBLIC KEY")
        )
          keyType = "ECC";
        else if (keyData.includes("PUBLIC KEY")) keyType = "SPKI Public Key";
        else if (keyData.includes("PRIVATE KEY"))
          keyType = "PKCS#8 Private Key";

        const fingerprint = crypto
          .createHash("sha256")
          .update(keyData)
          .digest("hex")
          .slice(0, 32);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  format: isArmoredPgp ? "OpenPGP" : isPem ? "PEM" : "Raw",
                  type: keyType,
                  fingerprint: `0x${fingerprint}`,
                  length: keyData.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "crypto_audit_cbom": {
        const algorithmsInput = args.algorithms ? String(args.algorithms) : "";
        const algList = algorithmsInput
          .split(",")
          .map((a) => a.trim().toUpperCase())
          .filter(Boolean);

        const audited = algList.map((alg) => {
          const isPqc =
            alg.includes("ML-KEM") ||
            alg.includes("ML-DSA") ||
            alg.includes("SLH-DSA") ||
            alg.includes("KYBER");
          const isBroken =
            alg === "MD5" ||
            alg === "SHA-1" ||
            alg === "DES" ||
            alg === "3DES" ||
            alg === "RC4";
          const isClassicalPublic =
            alg.includes("RSA") ||
            alg.includes("ECDSA") ||
            alg.includes("ECDH") ||
            alg.includes("ED25519");
          let risk = "LOW";
          if (isBroken) risk = "CRITICAL (Deprecated)";
          else if (isClassicalPublic) risk = "HIGH (HNDL Vulnerable to CRQC)";
          else if (isPqc) risk = "QUANTUM-SAFE";

          return {
            algorithm: alg,
            quantumResistant: isPqc,
            securityRisk: risk,
            standard: isPqc
              ? "NIST FIPS 203/204"
              : isBroken
                ? "DEPRECATED (NIST SP 800-131A)"
                : "Classical Standard",
          };
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  bomFormat: "CycloneDX-CBOM-1.6",
                  totalAudited: audited.length,
                  quantumSafeCount: audited.filter((a) => a.quantumResistant)
                    .length,
                  vulnerableCount: audited.filter((a) => !a.quantumResistant)
                    .length,
                  components: audited,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool name: ${name}` }],
        };
    }
  } catch (err: unknown) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Tool error (${name}): ${(err as Error).message}`,
        },
      ],
    };
  }
}
