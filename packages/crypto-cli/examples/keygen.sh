#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
#
# Generate key pairs using the Modern Keygen command.
# Demonstrates Ed25519, P-256, and ML-KEM key generation via the crypto-lib API.
#
# Run: bash examples/keygen.sh

set -euo pipefail

echo "=== crypto-cli — keygen ==="
echo ""

# Ensure crypto-lib is built and available
CRYPTO_LIB="node_modules/@sebastienrousseau/crypto-lib/dist/keys/keygen.js"
if [ ! -f "$CRYPTO_LIB" ]; then
  echo "Building workspace..."
  pnpm --filter @sebastienrousseau/crypto-lib build
fi

# Generate an Ed25519 signing key pair
echo "1) Generating Ed25519 key pair..."
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ed25519', { use: 'sig' });
  console.log(JSON.stringify(kp, null, 2));
"
echo ""

# Generate a P-256 key pair
echo "2) Generating P-256 key pair..."
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('p256', { use: 'sig' });
  console.log(JSON.stringify(kp, null, 2));
"
echo ""

# Generate an ML-KEM-768 post-quantum key pair
echo "3) Generating ML-KEM-768 key pair (post-quantum)..."
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ml-kem-768', { use: 'enc' });
  console.log('Algorithm:', kp.algorithm);
  console.log('Key ID:   ', kp.kid);
  console.log('Public:   ', kp.publicKey.substring(0, 64) + '...');
  console.log('Private:  ', kp.privateKey.substring(0, 64) + '...');
"
echo ""

# Generate an ML-DSA-65 post-quantum signing key pair
echo "4) Generating ML-DSA-65 key pair (post-quantum signing)..."
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ml-dsa-65', { use: 'sig' });
  console.log('Algorithm:', kp.algorithm);
  console.log('Key ID:   ', kp.kid);
  console.log('Public:   ', kp.publicKey.substring(0, 64) + '...');
"

echo ""
echo "Done."
