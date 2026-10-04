/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command, Option } from "commander";
import {
  type KmsProvider,
  LocalKmsProvider,
  AwsKmsProvider,
  GcpKmsProvider,
  VaultKmsProvider,
  AzureKmsProvider,
} from "@sebastienrousseau/crypto-kms";
import { emit, readInput, valueOrJsonField, type RunContext } from "./io";

const providerRegistry = new Map<string, KmsProvider>();
providerRegistry.set("local", new LocalKmsProvider());

/** Register or replace a KMS provider for CLI operations. */
export function registerCliKmsProvider(
  name: string,
  provider: KmsProvider,
): void {
  providerRegistry.set(name.toLowerCase(), provider);
}

/** Reset CLI KMS providers to default. */
export function resetCliKmsProviders(): void {
  providerRegistry.clear();
  providerRegistry.set("local", new LocalKmsProvider());
}

const DEFAULT_FACTORIES: Record<string, () => KmsProvider> = {
  aws: () =>
    new AwsKmsProvider({
      region: process.env["AWS_REGION"] ?? "us-east-1",
    }),
  gcp: () =>
    new GcpKmsProvider({
      projectId: process.env["GCP_PROJECT_ID"] ?? "test-project",
      locationId: process.env["GCP_LOCATION_ID"] ?? "global",
      keyRingId: process.env["GCP_KEY_RING_ID"] ?? "test-ring",
      token: process.env["GCP_AUTH_TOKEN"] ?? "test-token",
    }),
  vault: () =>
    new VaultKmsProvider({
      address: process.env["VAULT_ADDR"] ?? "http://localhost:8200",
      token: process.env["VAULT_TOKEN"] ?? "test-token",
    }),
  azure: () =>
    new AzureKmsProvider({
      vaultUrl:
        process.env["AZURE_VAULT_URL"] ?? "https://my-vault.vault.azure.net",
    }),
};

/** Resolve KMS provider for CLI execution. */
export function resolveCliKmsProvider(name?: string): KmsProvider {
  const key = (name ?? "local").toLowerCase();
  const existing = providerRegistry.get(key);
  if (existing) return existing;

  const factory = DEFAULT_FACTORIES[key];
  if (factory) {
    const provider = factory();
    providerRegistry.set(key, provider);
    return provider;
  }
  throw new Error(`Unsupported KMS provider: ${name}`);
}

function parseBytes(text: string): Uint8Array {
  const isHex = /^[0-9a-fA-F]*$/.test(text) && text.length % 2 === 0;
  return isHex
    ? new Uint8Array(Buffer.from(text, "hex"))
    : new Uint8Array(Buffer.from(text, "utf8"));
}

interface CreateKeyOptions {
  algorithm: string;
  usage: "encrypt" | "sign" | "wrap";
  provider?: string;
  json?: boolean;
}

interface WrapOptions {
  keyId: string;
  key?: string;
  provider?: string;
  json?: boolean;
}

interface UnwrapOptions {
  keyId: string;
  wrappedKey?: string;
  provider?: string;
  json?: boolean;
}

interface DataKeyOptions {
  keyId: string;
  provider?: string;
  keySpec?: string;
  json?: boolean;
}

interface EncryptOptions {
  keyId: string;
  data?: string;
  provider?: string;
  json?: boolean;
}

interface DecryptOptions {
  keyId: string;
  ciphertext?: string;
  provider?: string;
  json?: boolean;
}

async function executeCreateKey(
  opts: CreateKeyOptions,
  ctx: RunContext,
): Promise<void> {
  const provider = resolveCliKmsProvider(opts.provider);
  const meta = await provider.createKey(opts.algorithm, opts.usage);
  const desc = [
    `Key ID:    ${meta.keyId}`,
    `Algorithm: ${meta.algorithm}`,
    `Usage:     ${meta.usage}`,
    `Provider:  ${meta.provider}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), meta, desc);
}

async function executeWrap(
  file: string | undefined,
  opts: WrapOptions,
  ctx: RunContext,
): Promise<void> {
  const rawKey = opts.key
    ? Buffer.from(opts.key, "utf8")
    : await readInput(file, ctx.io);
  const text = valueOrJsonField(rawKey, "key").trim();
  const bytes = parseBytes(text);
  const provider = resolveCliKmsProvider(opts.provider);
  if (!provider.wrapKey) {
    throw new Error(`Provider ${provider.name} does not support wrapKey`);
  }
  const res = await provider.wrapKey(opts.keyId, bytes);
  const desc = [
    `Key ID:      ${res.keyId}`,
    `Wrapped Key: ${res.wrappedKey}`,
    `Provider:    ${provider.name}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), { ...res, provider: provider.name }, desc);
}

async function executeUnwrap(
  file: string | undefined,
  opts: UnwrapOptions,
  ctx: RunContext,
): Promise<void> {
  const rawWk = opts.wrappedKey
    ? Buffer.from(opts.wrappedKey, "utf8")
    : await readInput(file, ctx.io);
  const wrappedKey = valueOrJsonField(rawWk, "wrappedKey").trim();
  const provider = resolveCliKmsProvider(opts.provider);
  if (!provider.unwrapKey) {
    throw new Error(`Provider ${provider.name} does not support unwrapKey`);
  }
  const res = await provider.unwrapKey(opts.keyId, wrappedKey);
  const hex = Buffer.from(res.unwrappedKey).toString("hex");
  const data = { unwrappedKey: hex, keyId: res.keyId, provider: provider.name };
  const desc = [
    `Key ID:        ${res.keyId}`,
    `Unwrapped Key: ${hex}`,
    `Provider:      ${provider.name}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), data, desc);
}

async function executeDataKey(
  opts: DataKeyOptions,
  ctx: RunContext,
): Promise<void> {
  const provider = resolveCliKmsProvider(opts.provider);
  const res = await provider.generateDataKey(opts.keyId, opts.keySpec);
  const hex = Buffer.from(res.plaintext).toString("hex");
  const data = {
    plaintext: hex,
    ciphertext: res.ciphertext,
    keyId: opts.keyId,
    provider: provider.name,
  };
  const desc = [
    `Key ID:     ${opts.keyId}`,
    `Plaintext:  ${hex}`,
    `Ciphertext: ${res.ciphertext}`,
    `Provider:   ${provider.name}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), data, desc);
}

async function executeEncrypt(
  file: string | undefined,
  opts: EncryptOptions,
  ctx: RunContext,
): Promise<void> {
  const raw = opts.data
    ? Buffer.from(opts.data, "utf8")
    : await readInput(file, ctx.io);
  const text = valueOrJsonField(raw, "data").trim();
  const bytes = parseBytes(text);
  const provider = resolveCliKmsProvider(opts.provider);
  const res = await provider.encrypt(opts.keyId, bytes);
  const data = { ...res, provider: provider.name };
  const desc = [
    `Key ID:     ${res.keyId}`,
    `Ciphertext: ${res.ciphertext}`,
    `Provider:   ${provider.name}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), data, desc);
}

async function executeDecrypt(
  file: string | undefined,
  opts: DecryptOptions,
  ctx: RunContext,
): Promise<void> {
  const raw = opts.ciphertext
    ? Buffer.from(opts.ciphertext, "utf8")
    : await readInput(file, ctx.io);
  const ct = valueOrJsonField(raw, "ciphertext").trim();
  const provider = resolveCliKmsProvider(opts.provider);
  const res = await provider.decrypt(opts.keyId, ct);
  const text = Buffer.from(res.plaintext).toString("utf8");
  const hex = Buffer.from(res.plaintext).toString("hex");
  const data = {
    plaintext: text,
    hex,
    keyId: res.keyId,
    provider: provider.name,
  };
  emit(ctx.io, Boolean(opts.json), data, text);
}

function registerKmsKeyOps(kms: Command, ctx: RunContext): void {
  kms
    .command("create-key")
    .description("Create a new managed key in KMS")
    .option("-a, --algorithm <alg>", "Key algorithm", "aes-256-gcm")
    .addOption(
      new Option("-u, --usage <usage>", "Key usage")
        .choices(["encrypt", "sign", "wrap"])
        .default("encrypt"),
    )
    .option(
      "-p, --provider <name>",
      "KMS provider (local, aws, gcp, vault, azure)",
      "local",
    )
    .option("--json", "Emit output as JSON")
    .action(async (opts: CreateKeyOptions) => {
      await executeCreateKey(opts, ctx);
    });

  kms
    .command("generate-data-key")
    .description("Generate a Data Encryption Key (DEK) via KMS")
    .requiredOption("-k, --key-id <id>", "Key ID")
    .option("-s, --key-spec <spec>", "Key spec (e.g. AES_256)", "AES_256")
    .option("-p, --provider <name>", "KMS provider", "local")
    .option("--json", "Emit output as JSON")
    .action(async (opts: DataKeyOptions) => {
      await executeDataKey(opts, ctx);
    });
}

function registerKmsWrapOps(kms: Command, ctx: RunContext): void {
  kms
    .command("wrap [file]")
    .description("Wrap (encrypt) a key using a KMS key")
    .requiredOption("-k, --key-id <id>", "Wrapping Key ID")
    .option("-w, --key <hex>", "Raw key material to wrap")
    .option("-p, --provider <name>", "KMS provider", "local")
    .option("--json", "Emit output as JSON")
    .action(async (file: string | undefined, opts: WrapOptions) => {
      await executeWrap(file, opts, ctx);
    });

  kms
    .command("unwrap [file]")
    .description("Unwrap a wrapped key using a KMS key")
    .requiredOption("-k, --key-id <id>", "Wrapping Key ID")
    .option("-w, --wrapped-key <str>", "Wrapped key string")
    .option("-p, --provider <name>", "KMS provider", "local")
    .option("--json", "Emit output as JSON")
    .action(async (file: string | undefined, opts: UnwrapOptions) => {
      await executeUnwrap(file, opts, ctx);
    });
}

function registerKmsCipherOps(kms: Command, ctx: RunContext): void {
  kms
    .command("encrypt [file]")
    .description("Encrypt data using a KMS key")
    .requiredOption("-k, --key-id <id>", "Key ID")
    .option("-d, --data <text>", "Plaintext data to encrypt")
    .option("-p, --provider <name>", "KMS provider", "local")
    .option("--json", "Emit output as JSON")
    .action(async (file: string | undefined, opts: EncryptOptions) => {
      await executeEncrypt(file, opts, ctx);
    });

  kms
    .command("decrypt [file]")
    .description("Decrypt ciphertext using a KMS key")
    .requiredOption("-k, --key-id <id>", "Key ID")
    .option("-c, --ciphertext <str>", "Ciphertext to decrypt")
    .option("-p, --provider <name>", "KMS provider", "local")
    .option("--json", "Emit output as JSON")
    .action(async (file: string | undefined, opts: DecryptOptions) => {
      await executeDecrypt(file, opts, ctx);
    });
}

export function registerKms(program: Command, ctx: RunContext): void {
  const kms = program
    .command("kms")
    .description(
      "Key Management Service (KMS) operations across native cloud providers",
    );
  registerKmsKeyOps(kms, ctx);
  registerKmsWrapOps(kms, ctx);
  registerKmsCipherOps(kms, ctx);
}
