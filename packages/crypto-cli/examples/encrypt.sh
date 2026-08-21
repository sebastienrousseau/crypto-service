#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Encrypt and decrypt data using modern AEAD ciphers.
# Run: bash examples/encrypt.sh

set -euo pipefail

echo ""
echo "  crypto-cli -- encrypt"
echo ""

PLAINTEXT="Top secret message from Crypto CLI"

# XChaCha20-Poly1305
node -e "
  const { aeadEncrypt, aeadDecrypt } = require('@sebastienrousseau/crypto-lib/dist/modern/aead');
  const enc = aeadEncrypt({ plaintext: '$PLAINTEXT' });
  const dec = aeadDecrypt({ key: enc.key, nonce: enc.nonce, ciphertext: enc.ciphertext });
  if (dec.plaintext !== '$PLAINTEXT') throw new Error('decrypt mismatch');
"
echo "  ✓ XChaCha20-Poly1305 encrypt + decrypt"

# AES-256-GCM
node -e "
  const { aesGcmEncrypt, aesGcmDecrypt } = require('@sebastienrousseau/crypto-lib/dist/modern/aes');
  const enc = aesGcmEncrypt({ plaintext: '$PLAINTEXT' });
  const dec = aesGcmDecrypt({ key: enc.key, nonce: enc.nonce, ciphertext: enc.ciphertext });
  if (dec.plaintext !== '$PLAINTEXT') throw new Error('decrypt mismatch');
"
echo "  ✓ AES-256-GCM encrypt + decrypt"

# AES-256-GCM-SIV (nonce-misuse resistant)
node -e "
  const { aesGcmSivEncrypt, aesGcmSivDecrypt } = require('@sebastienrousseau/crypto-lib/dist/modern/aes');
  const enc = aesGcmSivEncrypt({ plaintext: '$PLAINTEXT' });
  const dec = aesGcmSivDecrypt({ key: enc.key, nonce: enc.nonce, ciphertext: enc.ciphertext });
  if (dec.plaintext !== '$PLAINTEXT') throw new Error('decrypt mismatch');
"
echo "  ✓ AES-256-GCM-SIV encrypt + decrypt (nonce-misuse resistant)"

echo ""
echo "  ✓ 3 operations completed."
echo ""
