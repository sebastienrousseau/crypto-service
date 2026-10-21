// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @remarks AWS KMS adapter. Requires `@aws-sdk/client-kms` as a peer dependency. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";
import type {
  DataKeySpec,
  KeySpec,
  SigningAlgorithmSpec,
} from "@aws-sdk/client-kms";
import { KmsError } from "../errors";
import { AWS_ALGORITHMS, resolveAlgorithm } from "./algorithms";

/** Signing algorithm used by default for each AWS key spec. */
const DEFAULT_SIGNING_ALGORITHM: Readonly<Record<string, string>> = {
  ECC_NIST_P256: "ECDSA_SHA_256",
  ECC_NIST_P384: "ECDSA_SHA_384",
  ECC_NIST_P521: "ECDSA_SHA_512",
  ECC_SECG_P256K1: "ECDSA_SHA_256",
  ECC_NIST_EDWARDS25519: "ED25519_SHA_512",
  RSA_2048: "RSASSA_PSS_SHA_256",
  RSA_3072: "RSASSA_PSS_SHA_256",
  RSA_4096: "RSASSA_PSS_SHA_256",
  ML_DSA_44: "ML_DSA_SHAKE_256",
  ML_DSA_65: "ML_DSA_SHAKE_256",
  ML_DSA_87: "ML_DSA_SHAKE_256",
};

/** Message raised when the optional AWS SDK peer dependency is absent. */
const AWS_SDK_MISSING =
  "AWS KMS requires @aws-sdk/client-kms. Install it: npm install @aws-sdk/client-kms";

/**
 * Configuration for the AWS KMS provider.
 *
 * @example
 * ```ts
 * const opts: AwsKmsOptions = {
 *   region: "us-east-1",
 *   credentials: { accessKeyId: "AKIA...", secretAccessKey: "wJal..." },
 * };
 * ```
 */
export interface AwsKmsOptions {
  /** AWS region (e.g. "us-east-1"). */
  region: string;
  /** Optional AWS credentials override. */
  credentials?: {
    /** AWS access key ID. */
    accessKeyId: string;
    /** AWS secret access key. */
    secretAccessKey: string;
    /** Optional AWS session token for temporary credentials. */
    sessionToken?: string;
  };
  /** Optional endpoint override (for LocalStack, etc.). */
  endpoint?: string;
}

/** Minimal interface for the AWS KMS SDK client (peer dependency). */
interface AwsKmsClient {
  /** Send a command to the AWS KMS service. */
  send(command: unknown): Promise<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * AWS KMS adapter.
 *
 * Wraps the `@aws-sdk/client-kms` SDK to provide the unified KmsProvider
 * interface. Install `@aws-sdk/client-kms` as a peer dependency.
 *
 * @example
 * ```ts
 * const provider = new AwsKmsProvider({ region: "us-east-1" });
 * const key = await provider.createKey("aes-256-gcm", "encrypt");
 * const encrypted = await provider.encrypt(key.keyId, plaintext);
 * ```
 */
export class AwsKmsProvider implements KmsProvider {
  /** Provider identifier. */
  readonly name = "aws";
  /** AWS KMS configuration options. */
  private readonly options: AwsKmsOptions;
  /** Lazily-loaded AWS KMS SDK client instance. */
  private client: AwsKmsClient | null;

  /** Create an AWS KMS provider with the given options. */
  constructor(options: AwsKmsOptions) {
    this.options = options;
    this.client = null; // Lazy-loaded from peer dependency
  }

  /** Lazily initialise and return the AWS KMS SDK client. */
  private async getClient(): Promise<AwsKmsClient> {
    if (!this.client) {
      try {
        const mod = await import("@aws-sdk/client-kms");
        const config: Record<string, unknown> = { region: this.options.region };
        if (this.options.credentials) {
          config.credentials = this.options.credentials;
        }
        if (this.options.endpoint) {
          config.endpoint = this.options.endpoint;
        }
        this.client = new mod.KMSClient(config) as unknown as AwsKmsClient;
        /* c8 ignore next 5 -- peer dep not installed in test env */
      } catch {
        throw new KmsError("DEPENDENCY_MISSING", AWS_SDK_MISSING);
      }
    }
    return this.client;
  }

  /** List all KMS keys, optionally filtered by usage or enabled state. */
  async listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    const client = await this.getClient();
    const { ListKeysCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(new ListKeysCommand({}));
    return (result.Keys ?? []).map((k: Record<string, unknown>) => ({
      keyId: k.KeyId ?? "",
      algorithm: "unknown",
      usage: "encrypt" as const,
      createdAt: new Date().toISOString(),
      enabled: true,
      provider: "aws",
    }));
  }

  /** Retrieve metadata for a specific KMS key by ID. */
  async getKey(keyId: string): Promise<KmsKeyMetadata> {
    const client = await this.getClient();
    const { DescribeKeyCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(new DescribeKeyCommand({ KeyId: keyId }));
    const meta: Partial<NonNullable<typeof result.KeyMetadata>> =
      result.KeyMetadata ?? {};
    return {
      keyId: meta.KeyId ?? keyId,
      algorithm: meta.KeySpec ?? "unknown",
      usage: meta.KeyUsage === "SIGN_VERIFY" ? "sign" : "encrypt",
      createdAt: meta.CreationDate?.toISOString() ?? new Date().toISOString(),
      enabled: meta.Enabled ?? true,
      provider: "aws",
    };
  }

  /** Create a new KMS key with the given algorithm and usage. */
  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const keySpec = resolveAlgorithm(
      "AwsKmsProvider",
      AWS_ALGORITHMS,
      algorithm,
      usage,
    );
    const client = await this.getClient();
    const { CreateKeyCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(
      new CreateKeyCommand({
        KeyUsage: usage === "sign" ? "SIGN_VERIFY" : "ENCRYPT_DECRYPT",
        KeySpec: keySpec as KeySpec,
        ...(metadata
          ? {
              Tags: Object.entries(metadata).map(([k, v]) => ({
                TagKey: k,
                TagValue: v,
              })),
            }
          : {}),
      }),
    );
    return {
      keyId: result.KeyMetadata?.KeyId ?? "",
      algorithm: keySpec,
      usage,
      createdAt:
        result.KeyMetadata?.CreationDate?.toISOString() ??
        new Date().toISOString(),
      enabled: true,
      provider: "aws",
    };
  }

  /** Enable a previously disabled KMS key. */
  async enableKey(keyId: string): Promise<void> {
    const client = await this.getClient();
    const { EnableKeyCommand } = await import("@aws-sdk/client-kms");
    await client.send(new EnableKeyCommand({ KeyId: keyId }));
  }

  /** Disable a KMS key so it cannot be used for operations. */
  async disableKey(keyId: string): Promise<void> {
    const client = await this.getClient();
    const { DisableKeyCommand } = await import("@aws-sdk/client-kms");
    await client.send(new DisableKeyCommand({ KeyId: keyId }));
  }

  /** Schedule a KMS key for deletion after a pending window. */
  async scheduleKeyDeletion(
    keyId: string,
    pendingWindowDays = 30,
  ): Promise<void> {
    const client = await this.getClient();
    const { ScheduleKeyDeletionCommand } = await import("@aws-sdk/client-kms");
    await client.send(
      new ScheduleKeyDeletionCommand({
        KeyId: keyId,
        PendingWindowInDays: pendingWindowDays,
      }),
    );
  }

  /** Encrypt plaintext using a KMS key, with optional encryption context. */
  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const client = await this.getClient();
    const { EncryptCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(
      new EncryptCommand({
        KeyId: keyId,
        Plaintext: plaintext,
        ...(context ? { EncryptionContext: context } : {}),
      }),
    );
    const out: KmsEncryptResult = {
      ciphertext: Buffer.from(result.CiphertextBlob!).toString("base64"),
      keyId: result.KeyId ?? keyId,
    };
    if (context) {
      out.context = context;
    }
    return out;
  }

  /** Decrypt ciphertext using a KMS key, with optional encryption context. */
  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const client = await this.getClient();
    const { DecryptCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(
      new DecryptCommand({
        KeyId: keyId,
        CiphertextBlob: Buffer.from(ciphertext, "base64"),
        ...(context ? { EncryptionContext: context } : {}),
      }),
    );
    return {
      plaintext: new Uint8Array(result.Plaintext!),
      keyId: result.KeyId ?? keyId,
    };
  }

  /**
   * The signing algorithm for a key: the caller's, or the one matching
   * the key spec reported by DescribeKey (ECDSA with the curve's hash,
   * Ed25519, RSA-PSS SHA-256, ML-DSA), else the first the key lists.
   */
  private async signingAlgorithm(
    keyId: string,
    algorithm: string | undefined,
  ): Promise<string> {
    if (algorithm) return algorithm;
    const client = await this.getClient();
    const { DescribeKeyCommand } = await import("@aws-sdk/client-kms");
    const res = await client.send(new DescribeKeyCommand({ KeyId: keyId }));
    const meta = res.KeyMetadata;
    const chosen =
      DEFAULT_SIGNING_ALGORITHM[meta?.KeySpec ?? ""] ??
      meta?.SigningAlgorithms?.[0];
    if (!chosen) {
      throw new KmsError("INVALID_USAGE", `Key ${keyId} cannot sign`, keyId);
    }
    return chosen;
  }

  /** Sign data using a KMS signing key. */
  async sign(
    keyId: string,
    data: Uint8Array,
    algorithm?: string,
  ): Promise<KmsSignResult> {
    const signingAlgorithm = await this.signingAlgorithm(keyId, algorithm);
    const client = await this.getClient();
    const { SignCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(
      new SignCommand({
        KeyId: keyId,
        Message: data,
        MessageType: "RAW",
        SigningAlgorithm: signingAlgorithm as SigningAlgorithmSpec,
      }),
    );
    return {
      signature: Buffer.from(result.Signature!).toString("base64"),
      keyId: result.KeyId ?? keyId,
      algorithm: result.SigningAlgorithm ?? signingAlgorithm,
    };
  }

  /**
   * Verify a signature. AWS KMS reports a signature that does not match
   * by throwing KMSInvalidSignatureException; that is returned as false.
   * Other errors are thrown.
   */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    algorithm?: string,
  ): Promise<boolean> {
    const signingAlgorithm = await this.signingAlgorithm(keyId, algorithm);
    const client = await this.getClient();
    const { VerifyCommand } = await import("@aws-sdk/client-kms");
    try {
      const result = await client.send(
        new VerifyCommand({
          KeyId: keyId,
          Message: data,
          MessageType: "RAW",
          Signature: Buffer.from(signature, "base64"),
          SigningAlgorithm: signingAlgorithm as SigningAlgorithmSpec,
        }),
      );
      return result.SignatureValid === true;
    } catch (err) {
      if ((err as Error).name === "KMSInvalidSignatureException") return false;
      throw err;
    }
  }

  /**
   * Rotate a key now with RotateKeyOnDemand: AWS creates new key material
   * and keeps earlier material for decryption. (EnableKeyRotation would
   * only schedule automatic yearly rotation.) AWS supports on-demand
   * rotation for symmetric keys only.
   */
  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const client = await this.getClient();
    const { RotateKeyOnDemandCommand } = await import("@aws-sdk/client-kms");
    await client.send(new RotateKeyOnDemandCommand({ KeyId: keyId }));
    return this.getKey(keyId);
  }

  /** Generate a data encryption key (DEK) wrapped by the managed key. */
  async generateDataKey(
    keyId: string,
    keySpec = "AES_256",
  ): Promise<{
    /** Plaintext data key bytes. */
    plaintext: Uint8Array;
    /** Encrypted (wrapped) data key. */
    ciphertext: string;
  }> {
    const client = await this.getClient();
    const { GenerateDataKeyCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(
      new GenerateDataKeyCommand({
        KeyId: keyId,
        KeySpec: keySpec as DataKeySpec,
      }),
    );
    return {
      plaintext: new Uint8Array(result.Plaintext!),
      ciphertext: Buffer.from(result.CiphertextBlob!).toString("base64"),
    };
  }

  /** Wrap an existing key with the managed key. */
  async wrapKey(
    keyId: string,
    unwrappedKey: Uint8Array,
    context?: Record<string, string>,
  ): Promise<{ wrappedKey: string; keyId: string }> {
    const enc = await this.encrypt(keyId, unwrappedKey, context);
    return { wrappedKey: enc.ciphertext, keyId: enc.keyId };
  }

  /** Unwrap a wrapped key with the managed key. */
  async unwrapKey(
    keyId: string,
    wrappedKey: string,
    context?: Record<string, string>,
  ): Promise<{ unwrappedKey: Uint8Array; keyId: string }> {
    const dec = await this.decrypt(keyId, wrappedKey, context);
    return { unwrappedKey: dec.plaintext, keyId: dec.keyId };
  }
}
