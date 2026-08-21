#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Hash and verify passwords using Argon2 (id, i, d variants).
# Run: bash examples/password.sh

set -euo pipefail

echo ""
echo "  crypto-cli -- password"
echo ""

PASSWORD="super-secret-passphrase-2026"

# Argon2id (recommended)
node -e "
  const { hashPassword, verifyPasswordPhc } = require('@sebastienrousseau/crypto-lib/dist/modern/password');
  const result = hashPassword({ password: '$PASSWORD', variant: 'argon2id' });
  const check = verifyPasswordPhc({ password: '$PASSWORD', phc: result.phc });
  if (!check.valid) throw new Error('verification failed');
"
echo "  ✓ Argon2id hash + verify"

# Argon2i (side-channel resistant)
node -e "
  const { hashPassword, verifyPasswordPhc } = require('@sebastienrousseau/crypto-lib/dist/modern/password');
  const result = hashPassword({ password: '$PASSWORD', variant: 'argon2i' });
  const check = verifyPasswordPhc({ password: '$PASSWORD', phc: result.phc });
  if (!check.valid) throw new Error('verification failed');
"
echo "  ✓ Argon2i hash + verify"

# Argon2d (GPU resistant)
node -e "
  const { hashPassword, verifyPasswordPhc } = require('@sebastienrousseau/crypto-lib/dist/modern/password');
  const result = hashPassword({ password: '$PASSWORD', variant: 'argon2d' });
  const check = verifyPasswordPhc({ password: '$PASSWORD', phc: result.phc });
  if (!check.valid) throw new Error('verification failed');
"
echo "  ✓ Argon2d hash + verify"

echo ""
echo "  ✓ 3 operations completed."
echo ""
