/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { Command, Option } from "commander";
import {
  hpkeGenerateKeyPair,
  hpkeSeal,
  hpkeOpen,
} from "@sebastienrousseau/crypto-lib/modern";
import { emit, readInput, valueOrJsonField, type RunContext } from "./io";

type KemChoice = "x25519-ml-kem-768" | "x25519" | "p256";
type AeadChoice = "chacha20-poly1305" | "aes-128-gcm";

const KEM_CHOICES: readonly KemChoice[] = [
  "x25519-ml-kem-768",
  "x25519",
  "p256",
];

const AEAD_CHOICES: readonly AeadChoice[] = [
  "chacha20-poly1305",
  "aes-128-gcm",
];

interface HpkeKeygenOptions {
  kem: KemChoice;
  json?: boolean;
}

interface HpkeSealOptions {
  publicKey: string;
  kem: KemChoice;
  aead: AeadChoice;
  info?: string;
  aad?: string;
  json?: boolean;
}

interface HpkeOpenOptions {
  secretKey: string;
  encapsulatedKey: string;
  kem: KemChoice;
  aead: AeadChoice;
  info?: string;
  aad?: string;
  json?: boolean;
}

function stringToHex(text: string): string {
  const isHex = /^[0-9a-fA-F]*$/.test(text) && text.length % 2 === 0;
  return isHex ? text : Buffer.from(text, "utf8").toString("hex");
}

function executeKeygen(opts: HpkeKeygenOptions, ctx: RunContext): void {
  const kp = hpkeGenerateKeyPair(opts.kem);
  const data = {
    kem: opts.kem,
    publicKey: kp.publicKey,
    privateKey: kp.privateKey,
  };
  const desc = [
    `Algorithm:   ${opts.kem}`,
    `Public Key:  ${kp.publicKey}`,
    `Private Key: ${kp.privateKey}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), data, desc);
}

async function executeSeal(
  file: string | undefined,
  opts: HpkeSealOptions,
  ctx: RunContext,
): Promise<void> {
  const raw = await readInput(file, ctx.io);
  const plaintextHex = raw.toString("hex");
  const res = hpkeSeal({
    recipientPublicKey: opts.publicKey,
    plaintext: plaintextHex,
    suite: { kem: opts.kem, aead: opts.aead },
    ...(opts.info !== undefined ? { info: stringToHex(opts.info) } : {}),
    ...(opts.aad !== undefined ? { aad: stringToHex(opts.aad) } : {}),
  });
  const data = {
    encapsulatedKey: res.encapsulatedKey,
    ciphertext: res.ciphertext,
  };
  const desc = [
    `Encapsulated: ${res.encapsulatedKey}`,
    `Ciphertext:   ${res.ciphertext}`,
  ].join("\n");
  emit(ctx.io, Boolean(opts.json), data, desc);
}

async function executeOpen(
  file: string | undefined,
  opts: HpkeOpenOptions,
  ctx: RunContext,
): Promise<void> {
  const raw = await readInput(file, ctx.io);
  const ciphertext = valueOrJsonField(raw, "ciphertext").trim();
  const res = hpkeOpen({
    recipientPrivateKey: opts.secretKey,
    encapsulatedKey: opts.encapsulatedKey,
    ciphertext,
    suite: { kem: opts.kem, aead: opts.aead },
    ...(opts.info !== undefined ? { info: stringToHex(opts.info) } : {}),
    ...(opts.aad !== undefined ? { aad: stringToHex(opts.aad) } : {}),
  });
  const plaintext = Buffer.from(res.plaintext, "hex").toString("utf8");
  const data = { plaintext, hex: res.plaintext };
  emit(ctx.io, Boolean(opts.json), data, plaintext);
}

export function registerHpke(program: Command, ctx: RunContext): void {
  const hpke = program
    .command("hpke")
    .description("Hybrid Public Key Encryption (HPKE RFC 9180 and PQ hybrid)");

  hpke
    .command("keygen")
    .description("Generate an HPKE key pair")
    .addOption(
      new Option("-k, --kem <kem>", "key encapsulation mechanism")
        .choices(KEM_CHOICES)
        .default("x25519-ml-kem-768"),
    )
    .option("--json", "print key pair as JSON")
    .action((opts: HpkeKeygenOptions) => executeKeygen(opts, ctx));

  hpke
    .command("seal [file]")
    .description("Encrypt a message using HPKE")
    .requiredOption("-p, --public-key <hex>", "recipient public key (hex)")
    .addOption(
      new Option("-k, --kem <kem>", "key encapsulation mechanism")
        .choices(KEM_CHOICES)
        .default("x25519-ml-kem-768"),
    )
    .addOption(
      new Option("-a, --aead <aead>", "authenticated encryption algorithm")
        .choices(AEAD_CHOICES)
        .default("chacha20-poly1305"),
    )
    .option("--info <info>", "application-supplied info string")
    .option("--aad <aad>", "additional authenticated data")
    .option("--json", "print ciphertext and encapsulated key as JSON")
    .action((file: string | undefined, opts: HpkeSealOptions) =>
      executeSeal(file, opts, ctx),
    );

  hpke
    .command("open [file]")
    .description("Decrypt an HPKE ciphertext")
    .requiredOption("-s, --secret-key <hex>", "recipient private key (hex)")
    .requiredOption("-e, --encapsulated-key <hex>", "encapsulated key (hex)")
    .addOption(
      new Option("-k, --kem <kem>", "key encapsulation mechanism")
        .choices(KEM_CHOICES)
        .default("x25519-ml-kem-768"),
    )
    .addOption(
      new Option("-a, --aead <aead>", "authenticated encryption algorithm")
        .choices(AEAD_CHOICES)
        .default("chacha20-poly1305"),
    )
    .option("--info <info>", "application-supplied info string")
    .option("--aad <aad>", "additional authenticated data")
    .option("--json", "print plaintext and hex as JSON")
    .action((file: string | undefined, opts: HpkeOpenOptions) =>
      executeOpen(file, opts, ctx),
    );
}
