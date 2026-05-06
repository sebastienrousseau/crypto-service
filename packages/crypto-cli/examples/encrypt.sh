#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
#
# Encrypt and decrypt data using modern AEAD ciphers.
# Demonstrates XChaCha20-Poly1305, AES-256-GCM, and AES-256-GCM-SIV.
#
# Run: bash examples/encrypt.sh

set -euo pipefail

echo "=== crypto-cli — encrypt ==="
echo ""

PLAINTEXT="Top secret message from Crypto CLI"

echo "Plaintext: \"$PLAINTEXT\""
echo ""

# XChaCha20-Poly1305
echo "1) XChaCha20-Poly1305 encrypt + decrypt:"
node -e "
  const { aeadEncrypt, aeadDecrypt } = require('@sebastienrousseau/crypto-lib/dist/modern/aead');
  const enc = aeadEncrypt({ plaintext: '$PLAINTEXT' });
  console.log('   Key:        ', enc.key);
  console.log('   Nonce:      ', enc.nonce);
  console.log('   Ciphertext: ', enc.ciphertext.substring(0, 48) + '...');
  const dec = aeadDecrypt({ key: enc.key, nonce: enc.nonce, ciphertext: enc.ciphertext });
  console.log('   Decrypted:  ', dec.plaintext);
"
echo ""

# AES-256-GCM
echo "2) AES-256-GCM encrypt + decrypt:"
node -e "
  const { aesGcmEncrypt, aesGcmDecrypt } = require('@sebastienrousseau/crypto-lib/dist/modern/aes');
  const enc = aesGcmEncrypt({ plaintext: '$PLAINTEXT' });
  console.log('   Key:        ', enc.key);
  console.log('   Nonce:      ', enc.nonce);
  console.log('   Ciphertext: ', enc.ciphertext.substring(0, 48) + '...');
  const dec = aesGcmDecrypt({ key: enc.key, nonce: enc.nonce, ciphertext: enc.ciphertext });
  console.log('   Decrypted:  ', dec.plaintext);
"
echo ""

# AES-256-GCM-SIV (nonce-misuse resistant)
echo "3) AES-256-GCM-SIV encrypt + decrypt (nonce-misuse resistant):"
node -e "
  const { aesGcmSivEncrypt, aesGcmSivDecrypt } = require('@sebastienrousseau/crypto-lib/dist/modern/aes');
  const enc = aesGcmSivEncrypt({ plaintext: '$PLAINTEXT' });
  console.log('   Key:        ', enc.key);
  console.log('   Nonce:      ', enc.nonce);
  console.log('   Ciphertext: ', enc.ciphertext.substring(0, 48) + '...');
  const dec = aesGcmSivDecrypt({ key: enc.key, nonce: enc.nonce, ciphertext: enc.ciphertext });
  console.log('   Decrypted:  ', dec.plaintext);
"

echo ""
echo "Done."
