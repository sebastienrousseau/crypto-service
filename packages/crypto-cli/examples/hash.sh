#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Hash data using multiple algorithms via the Modern Hash command.
# Run: bash examples/hash.sh

set -euo pipefail

echo ""
echo "  crypto-cli -- hash"
echo ""

DATA="Hello, Crypto CLI!"

# SHA-256
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'sha256', data: '$DATA' });
  if (!r.digest) throw new Error('missing digest');
"
echo "  ✓ SHA-256 hash"

# SHA-3-256
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'sha3-256', data: '$DATA' });
  if (!r.digest) throw new Error('missing digest');
"
echo "  ✓ SHA-3-256 hash"

# SHA-512
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'sha512', data: '$DATA' });
  if (!r.digest) throw new Error('missing digest');
"
echo "  ✓ SHA-512 hash"

# BLAKE2b
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'blake2b', data: '$DATA' });
  if (!r.digest) throw new Error('missing digest');
"
echo "  ✓ BLAKE2b hash"

# BLAKE3
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'blake3', data: '$DATA' });
  if (!r.digest) throw new Error('missing digest');
"
echo "  ✓ BLAKE3 hash"

echo ""
echo "  ✓ 5 operations completed."
echo ""
