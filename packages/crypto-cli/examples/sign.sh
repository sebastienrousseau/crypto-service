#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Sign and verify messages using modern algorithms.
# Run: bash examples/sign.sh

set -euo pipefail

echo ""
echo "  crypto-cli -- sign"
echo ""

MESSAGE="Authenticate this message"

# Ed25519 sign + verify
node -e "
  const { crypto } = require('@sebastienrousseau/crypto-lib/dist/crypto');
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ed25519');
  const sig = crypto.sign('ed25519', kp.privateKey, '$MESSAGE');
  const valid = crypto.verify('ed25519', kp.publicKey, '$MESSAGE', sig);
  if (!valid) throw new Error('verification failed');
"
echo "  ✓ Ed25519 sign + verify"

# ECDSA-P256 sign + verify
node -e "
  const { crypto } = require('@sebastienrousseau/crypto-lib/dist/crypto');
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('p256');
  const sig = crypto.sign('ecdsa-p256', kp.privateKey, '$MESSAGE');
  const valid = crypto.verify('ecdsa-p256', kp.publicKey, '$MESSAGE', sig);
  if (!valid) throw new Error('verification failed');
"
echo "  ✓ ECDSA-P256 sign + verify"

# ML-DSA-65 post-quantum sign + verify
node -e "
  const { crypto } = require('@sebastienrousseau/crypto-lib/dist/crypto');
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');
  const kp = generateKeyPair('ml-dsa-65');
  const sig = crypto.sign('ml-dsa-65', kp.privateKey, '$MESSAGE');
  const valid = crypto.verify('ml-dsa-65', kp.publicKey, '$MESSAGE', sig);
  if (!valid) throw new Error('verification failed');
"
echo "  ✓ ML-DSA-65 post-quantum sign + verify"

echo ""
echo "  ✓ 3 operations completed."
echo ""
