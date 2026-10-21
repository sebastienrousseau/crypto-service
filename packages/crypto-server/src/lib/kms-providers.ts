/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks KMS providers the server may use: an operator allowlist.
 *
 * `KMS_PROVIDERS` (comma-separated, default `local`) names the providers
 * requests may select. Each enabled provider is built once from its own
 * settings; a missing setting, an unknown name or the Azure stub stops the
 * server from starting. A request for any other provider is refused
 * before a provider is contacted, so a caller cannot make the server act
 * with its cloud identity on a backend the operator did not enable.
 */

import {
  AwsKmsProvider,
  GcpKmsProvider,
  LocalKmsProvider,
  VaultKmsProvider,
  type KmsProvider,
} from "@sebastienrousseau/crypto-kms";

/** Settings each provider needs, by provider name. */
const REQUIRED_SETTINGS: Readonly<Record<string, readonly string[]>> = {
  local: [],
  aws: ["AWS_REGION"],
  gcp: [
    "GCP_PROJECT_ID",
    "GCP_LOCATION_ID",
    "GCP_KEY_RING_ID",
    "GCP_AUTH_TOKEN",
  ],
  vault: ["VAULT_ADDR", "VAULT_TOKEN"],
};

/** Raised for a provider that is not in `KMS_PROVIDERS`. */
export class KmsProviderNotEnabledError extends Error {
  override readonly name = "KmsProviderNotEnabledError";
  constructor(readonly provider: string) {
    super(`KMS provider "${provider}" is not enabled`);
  }
}

/** Provider names listed in `KMS_PROVIDERS`, lower-cased. */
export function kmsProviderNames(env: NodeJS.ProcessEnv): string[] {
  const raw = env["KMS_PROVIDERS"]?.trim() || "local";
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

/** Why one provider name cannot be enabled, or null. */
function providerError(name: string, env: NodeJS.ProcessEnv): string | null {
  if (name === "azure") {
    return 'KMS_PROVIDERS: "azure" is a stub provider and cannot be enabled';
  }
  const required = REQUIRED_SETTINGS[name];
  if (!required) {
    return `KMS_PROVIDERS: unknown provider "${name}" (use local, aws, gcp or vault)`;
  }
  const missing = required.filter((k) => !env[k]);
  return missing.length > 0
    ? `KMS_PROVIDERS: "${name}" needs ${missing.join(", ")}`
    : null;
}

/** The first problem with the KMS provider settings, or null. */
export function kmsConfigError(env: NodeJS.ProcessEnv): string | null {
  for (const name of kmsProviderNames(env)) {
    const error = providerError(name, env);
    if (error) return error;
  }
  return null;
}

/** Build one enabled provider from its settings. */
function buildProvider(name: string, env: NodeJS.ProcessEnv): KmsProvider {
  const get = (k: string): string => env[k] as string;
  switch (name) {
    case "aws":
      return new AwsKmsProvider({ region: get("AWS_REGION") });
    case "gcp":
      return new GcpKmsProvider({
        projectId: get("GCP_PROJECT_ID"),
        locationId: get("GCP_LOCATION_ID"),
        keyRingId: get("GCP_KEY_RING_ID"),
        token: get("GCP_AUTH_TOKEN"),
      });
    case "vault":
      return new VaultKmsProvider({
        address: get("VAULT_ADDR"),
        token: get("VAULT_TOKEN"),
      });
    default:
      return new LocalKmsProvider();
  }
}

/** The enabled KMS providers of one server instance. */
export class KmsRegistry {
  private readonly providers = new Map<string, KmsProvider>();

  /** Build every provider `env` enables; throws on invalid settings. */
  constructor(env: NodeJS.ProcessEnv) {
    const error = kmsConfigError(env);
    if (error) throw new Error(error);
    for (const name of kmsProviderNames(env)) {
      this.providers.set(name, buildProvider(name, env));
    }
  }

  /** The enabled provider called `name` (default `local`). */
  get(name: string = "local"): KmsProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) throw new KmsProviderNotEnabledError(name);
    return provider;
  }

  /** Enable `provider` under `name`, replacing any provider of that name. */
  register(name: string, provider: KmsProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }
}
