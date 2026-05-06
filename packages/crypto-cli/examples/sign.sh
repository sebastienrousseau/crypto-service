#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
#
# Sign and verify messages using modern algorithms.
# Demonstrates Ed25519, ECDSA-P256, and ML-DSA-65 (post-quantum).
#
# Run: bash examples/sign.sh

set -euo pipefail

echo "=== crypto-cli — sign ==="
echo ""

MESSAGE="Authenticate this message"

echo "Message: \"$MESSAGE\""
echo ""

# Ed25519 sign + verify
echo "1) Ed25519 sign + verify:"
node -e "
  const { crypto } = require('@sebastienrousseau/crypto-lib/dist/crypto');
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');

  const kp = generateKeyPair('ed25519');
  const sig = crypto.sign('ed25519', kp.privateKey, '$MESSAGE');
  const valid = crypto.verify('ed25519', kp.publicKey, '$MESSAGE', sig);

  console.log('   Public key: ', kp.publicKey);
  console.log('   Signature:  ', sig.substring(0, 48) + '...');
  console.log('   Valid:      ', valid);
"
echo ""

# ECDSA-P256 sign + verify
echo "2) ECDSA-P256 sign + verify:"
node -e "
  const { crypto } = require('@sebastienrousseau/crypto-lib/dist/crypto');
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');

  const kp = generateKeyPair('p256');
  const sig = crypto.sign('ecdsa-p256', kp.privateKey, '$MESSAGE');
  const valid = crypto.verify('ecdsa-p256', kp.publicKey, '$MESSAGE', sig);

  console.log('   Public key: ', kp.publicKey.substring(0, 48) + '...');
  console.log('   Signature:  ', sig.substring(0, 48) + '...');
  console.log('   Valid:      ', valid);
"
echo ""

# ML-DSA-65 post-quantum sign + verify
echo "3) ML-DSA-65 sign + verify (post-quantum):"
node -e "
  const { crypto } = require('@sebastienrousseau/crypto-lib/dist/crypto');
  const { generateKeyPair } = require('@sebastienrousseau/crypto-lib/dist/keys/keygen');

  const kp = generateKeyPair('ml-dsa-65');
  const sig = crypto.sign('ml-dsa-65', kp.privateKey, '$MESSAGE');
  const valid = crypto.verify('ml-dsa-65', kp.publicKey, '$MESSAGE', sig);

  console.log('   Algorithm:  ml-dsa-65 (NIST Level 3)');
  console.log('   Public key: ', kp.publicKey.substring(0, 48) + '...');
  console.log('   Signature:  ', sig.substring(0, 48) + '...');
  console.log('   Valid:      ', valid);
"

echo ""
echo "Done."
