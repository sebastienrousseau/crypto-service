// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau
//
// Fetches an IETF draft's text for the vector extractors and checks it
// against the SHA-256 pinned when the fixtures were generated, so a
// changed draft fails loudly instead of yielding different vectors.

import { createHash } from "node:crypto";

/** The draft's text at `url`, checked against `expected` (its SHA-256). */
export async function fetchDraft(url, expected, fetchImpl = fetch) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const digest = createHash("sha256").update(text).digest("hex");
  if (digest !== expected) throw new Error(`draft text changed: ${digest}`);
  return text;
}
