#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
#
# Hash data using multiple algorithms via the Modern Hash command.
# Demonstrates SHA-256, SHA-3-256, BLAKE2b, and BLAKE3.
#
# Run: bash examples/hash.sh

set -euo pipefail

echo "=== crypto-cli — hash ==="
echo ""

DATA="Hello, Crypto CLI!"

echo "Input: \"$DATA\""
echo ""

# SHA-256
echo "1) SHA-256:"
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'sha256', data: '$DATA' });
  console.log('   Digest:', r.digest);
"
echo ""

# SHA-3-256
echo "2) SHA-3-256:"
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'sha3-256', data: '$DATA' });
  console.log('   Digest:', r.digest);
"
echo ""

# SHA-512
echo "3) SHA-512:"
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'sha512', data: '$DATA' });
  console.log('   Digest:', r.digest);
"
echo ""

# BLAKE2b
echo "4) BLAKE2b:"
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'blake2b', data: '$DATA' });
  console.log('   Digest:', r.digest);
"
echo ""

# BLAKE3
echo "5) BLAKE3:"
node -e "
  const { hash } = require('@sebastienrousseau/crypto-lib/dist/modern/hash');
  const r = hash({ algorithm: 'blake3', data: '$DATA' });
  console.log('   Digest:', r.digest);
"

echo ""
echo "Done."
