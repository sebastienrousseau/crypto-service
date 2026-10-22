/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * The README's provider table against the code. Earlier releases told
 * users the GCP and Vault providers were stubs when they were working
 * REST clients; nothing checked the claim. Each provider the table lists
 * is constructed, and its status is read from what createKey does with an
 * algorithm no provider supports: a stub rejects NOT_IMPLEMENTED, a real
 * provider rejects the algorithm itself, before any network call.
 */
import { expect } from "chai";
import { readFileSync } from "fs";
import * as path from "path";
import * as kms from "../src";
import { KmsError } from "../src/errors";

interface Row {
  provider: string;
  className: string;
  stub: boolean;
}

/** The rows of the README's provider table. */
function providerRows(): Row[] {
  const readme = readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
  return readme
    .split("\n")
    .filter((line) => /^\| \*\*[^*]+\*\* +\| `[A-Za-z0-9]+Provider`/.test(line))
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      return {
        provider: cells[1]!.replace(/\*/g, ""),
        className: cells[2]!.replace(/`/g, ""),
        stub: /\bStub\b/.test(cells[4]!),
      };
    });
}

const OPTIONS: Record<string, unknown> = {
  AwsKmsProvider: { region: "us-east-1" },
  GcpKmsProvider: {
    projectId: "p",
    locationId: "l",
    keyRingId: "r",
    accessToken: "t",
  },
  VaultKmsProvider: { address: "http://127.0.0.1:1", token: "t" },
  AzureKmsProvider: { vaultUrl: "https://example.vault.azure.net" },
  LocalKmsProvider: undefined,
  Pkcs11HsmProvider: { simulate: true },
};

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return e instanceof KmsError ? e.code : `not a KmsError: ${String(e)}`;
  }
  return "resolved";
}

describe("README provider table", () => {
  const rows = providerRows();
  const realFetch = globalThis.fetch;
  before(() => {
    globalThis.fetch = (() => {
      throw new Error("network call");
    }) as typeof fetch;
  });
  after(() => {
    globalThis.fetch = realFetch;
  });

  it("lists every exported provider", () => {
    const exported = Object.keys(kms).filter((n) => n.endsWith("Provider"));
    expect(rows.map((r) => r.className)).to.have.members(exported);
  });

  for (const row of providerRows()) {
    const expected = row.stub ? "NOT_IMPLEMENTED" : "INVALID_ARGUMENT";
    it(`${row.provider} is ${row.stub ? "a stub" : "implemented"}`, async () => {
      const Provider = (
        kms as unknown as Record<
          string,
          new (o: unknown) => {
            createKey: (a: string, u: "encrypt") => Promise<unknown>;
          }
        >
      )[row.className]!;
      const provider = new Provider(OPTIONS[row.className]);
      expect(
        await codeOf(provider.createKey("no-such-algorithm", "encrypt")),
      ).to.equal(expected);
    });
  }
});
