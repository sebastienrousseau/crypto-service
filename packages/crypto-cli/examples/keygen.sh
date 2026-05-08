#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Generate key pairs using the Modern Keygen command.
# Run: bash examples/keygen.sh

set -euo pipefail

echo ""
echo "  crypto-cli -- keygen"
echo ""

# Ed25519 signing key pair
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ed25519', { use: 'sig' });
  if (!kp.publicKey || !kp.privateKey) throw new Error('missing keys');
"
echo "  ✓ Ed25519 key pair generated"

# P-256 key pair
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('p256', { use: 'sig' });
  if (!kp.publicKey || !kp.privateKey) throw new Error('missing keys');
"
echo "  ✓ P-256 key pair generated"

# ML-KEM-768 post-quantum key pair
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ml-kem-768', { use: 'enc' });
  if (!kp.publicKey || !kp.privateKey) throw new Error('missing keys');
"
echo "  ✓ ML-KEM-768 post-quantum key pair generated"

# ML-DSA-65 post-quantum signing key pair
node -e "
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ml-dsa-65', { use: 'sig' });
  if (!kp.publicKey || !kp.privateKey) throw new Error('missing keys');
"
echo "  ✓ ML-DSA-65 post-quantum signing key pair generated"

echo ""
echo "  ✓ 4 operations completed."
echo ""
