// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/** @file AWS KMS adapter. Requires `@aws-sdk/client-kms` as a peer dependency. */

import type {
  KmsProvider,
  KmsKeyMetadata,
  KmsEncryptResult,
  KmsDecryptResult,
  KmsSignResult,
} from "../types";

/** Configuration for the AWS KMS provider. */
export interface AwsKmsOptions {
  /** AWS region (e.g. "us-east-1"). */
  region: string;
  /** Optional AWS credentials override. */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  /** Optional endpoint override (for LocalStack, etc.). */
  endpoint?: string;
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
  readonly name = "aws";
  private readonly options: AwsKmsOptions;
  private client: unknown;

  constructor(options: AwsKmsOptions) {
    this.options = options;
    this.client = null; // Lazy-loaded from peer dependency
  }

  private async getClient(): Promise<any> {
    if (!this.client) {
      try {
        const mod = await import("@aws-sdk/client-kms");
        const config: any = { region: this.options.region };
        if (this.options.credentials) {
          config.credentials = this.options.credentials;
        }
        if (this.options.endpoint) {
          config.endpoint = this.options.endpoint;
        }
        this.client = new mod.KMSClient(config);
      } catch {
        throw new Error(
          "AWS KMS requires @aws-sdk/client-kms. Install it: npm install @aws-sdk/client-kms",
        );
      }
    }
    return this.client;
  }

  async listKeys(_filters?: {
    usage?: string;
    enabled?: boolean;
  }): Promise<KmsKeyMetadata[]> {
    const client = await this.getClient();
    const { ListKeysCommand } = await import("@aws-sdk/client-kms");
    const result = await client.send(new ListKeysCommand({}));
    return (result.Keys ?? []).map((k: any) => ({
      keyId: k.KeyId ?? "",
      algorithm: "unknown",
      usage: "encrypt" as const,
      createdAt: new Date().toISOString(),
      enabled: true,
      provider: "aws",
    }));
  }

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

  async createKey(
    algorithm: string,
    usage: "encrypt" | "sign" | "wrap",
    metadata?: Record<string, string>,
  ): Promise<KmsKeyMetadata> {
    const client = await this.getClient();
    const { CreateKeyCommand } = await import("@aws-sdk/client-kms");
    const input: any = {
      KeyUsage: usage === "sign" ? "SIGN_VERIFY" : "ENCRYPT_DECRYPT",
      KeySpec: algorithm.toUpperCase().replace(/-/g, "_"),
    };
    if (metadata) {
      input.Tags = Object.entries(metadata).map(([k, v]) => ({
        TagKey: k,
        TagValue: v,
      }));
    }
    const result = await client.send(new CreateKeyCommand(input));
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

  async enableKey(keyId: string): Promise<void> {
    const client = await this.getClient();
    const { EnableKeyCommand } = await import("@aws-sdk/client-kms");
    await client.send(new EnableKeyCommand({ KeyId: keyId }));
  }

  async disableKey(keyId: string): Promise<void> {
    const client = await this.getClient();
    const { DisableKeyCommand } = await import("@aws-sdk/client-kms");
    await client.send(new DisableKeyCommand({ KeyId: keyId }));
  }

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

  async encrypt(
    keyId: string,
    plaintext: Uint8Array,
    context?: Record<string, string>,
  ): Promise<KmsEncryptResult> {
    const client = await this.getClient();
    const { EncryptCommand } = await import("@aws-sdk/client-kms");
    const input: any = { KeyId: keyId, Plaintext: plaintext };
    if (context) {
      input.EncryptionContext = context;
    }
    const result = await client.send(new EncryptCommand(input));
    const out: KmsEncryptResult = {
      ciphertext: Buffer.from(result.CiphertextBlob!).toString("base64"),
      keyId: result.KeyId ?? keyId,
    };
    if (context) {
      out.context = context;
    }
    return out;
  }

  async decrypt(
    keyId: string,
    ciphertext: string,
    context?: Record<string, string>,
  ): Promise<KmsDecryptResult> {
    const client = await this.getClient();
    const { DecryptCommand } = await import("@aws-sdk/client-kms");
    const input: any = {
      KeyId: keyId,
      CiphertextBlob: Buffer.from(ciphertext, "base64"),
    };
    if (context) {
      input.EncryptionContext = context;
    }
    const result = await client.send(new DecryptCommand(input));
    return {
      plaintext: new Uint8Array(result.Plaintext!),
      keyId: result.KeyId ?? keyId,
    };
  }

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

  async rotateKey(keyId: string): Promise<KmsKeyMetadata> {
    const client = await this.getClient();
    const { EnableKeyRotationCommand } = await import("@aws-sdk/client-kms");
    await client.send(new EnableKeyRotationCommand({ KeyId: keyId }));
    return this.getKey(keyId);
  }

  async generateDataKey(
    keyId: string,
    keySpec = "AES_256",
  ): Promise<{ plaintext: Uint8Array; ciphertext: string }> {
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
