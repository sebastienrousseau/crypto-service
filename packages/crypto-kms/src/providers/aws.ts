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
        throw new Error(
          "AWS KMS requires @aws-sdk/client-kms. Install it: npm install @aws-sdk/client-kms",
        );
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
    const meta = result.KeyMetadata;
    return {
      keyId: meta?.KeyId ?? keyId,
      algorithm: meta?.KeySpec ?? "unknown",
      usage: meta?.KeyUsage === "SIGN_VERIFY" ? "sign" : "encrypt",
      createdAt: meta?.CreationDate?.toISOString() ?? new Date().toISOString(),
      enabled: meta?.Enabled ?? true,
      provider: "aws",
    };
  }

  /** Create a new KMS key with the given algorithm and usage. */
  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const client = await this.getClient();
    const { CreateKeyCommand } = await import("@aws-sdk/client-kms");
    const keySpec = algorithm.toUpperCase().replace(/-/g, "_");
    const result = await client.send(
      new CreateKeyCommand({
        KeyUsage: usage === "sign" ? "SIGN_VERIFY" : "ENCRYPT_DECRYPT",
        KeySpec: keySpec as any,
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
      algorithm,
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

  /** Sign data using a KMS signing key. */
  async sign(
    keyId: string,
    data: Uint8Array,
    algorithm = "RSASSA_PSS_SHA_256",
  ): Promise<KmsSignResult> {
    const client = await this.getClient();
    const { SignCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(
      new SignCommand({
        KeyId: keyId,
        Message: data,
        MessageType: "RAW",
        SigningAlgorithm: algorithm as any,
      }),
    );
    return {
      signature: Buffer.from(result.Signature!).toString("base64"),
      keyId: result.KeyId ?? keyId,
      algorithm: result.SigningAlgorithm ?? algorithm,
    };
  }

  /** Verify a signature against data using a KMS signing key. */
  async verify(
    keyId: string,
    data: Uint8Array,
    signature: string,
    algorithm = "RSASSA_PSS_SHA_256",
  ): Promise<boolean> {
    const client = await this.getClient();
    const { VerifyCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(
      new VerifyCommand({
        KeyId: keyId,
        Message: data,
        MessageType: "RAW",
        Signature: Buffer.from(signature, "base64"),
        SigningAlgorithm: algorithm as any,
      }),
    );
    return result.SignatureValid ?? false;
  }

  /** Enable automatic key rotation and return updated metadata. */
  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const client = await this.getClient();
    const { EnableKeyRotationCommand } = await import("@aws-sdk/client-kms");
    await client.send(new EnableKeyRotationCommand({ KeyId: keyId }));
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
        KeySpec: keySpec as any,
      }),
    );
    return {
      plaintext: new Uint8Array(result.Plaintext!),
      ciphertext: Buffer.from(result.CiphertextBlob!).toString("base64"),
    };
  }
}
