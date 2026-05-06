#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
#
# Hash and verify passwords using Argon2 (id, i, d variants).
# Demonstrates PHC string output and verification.
#
# Run: bash examples/password.sh

set -euo pipefail

echo "=== crypto-cli — password ==="
echo ""

PASSWORD="super-secret-passphrase-2026"

echo "Password: \"$PASSWORD\""
echo ""

# Argon2id (recommended)
echo "1) Argon2id hash + verify:"
node -e "
  const { hashPassword, verifyPasswordPhc } = require('@sebastienrousseau/crypto-lib/dist/modern/password');

  const result = hashPassword({ password: '$PASSWORD', variant: 'argon2id' });
  console.log('   PHC string: ', result.phc);
  console.log('   Algorithm:  ', result.algorithm);

  const check = verifyPasswordPhc({ password: '$PASSWORD', phc: result.phc });
  console.log('   Verified:   ', check.valid);
"
echo ""

# Argon2i (side-channel resistant)
echo "2) Argon2i hash + verify:"
node -e "
  const { hashPassword, verifyPasswordPhc } = require('@sebastienrousseau/crypto-lib/dist/modern/password');

  const result = hashPassword({ password: '$PASSWORD', variant: 'argon2i' });
  console.log('   PHC string: ', result.phc);
  console.log('   Algorithm:  ', result.algorithm);

  const check = verifyPasswordPhc({ password: '$PASSWORD', phc: result.phc });
  console.log('   Verified:   ', check.valid);
"
echo ""

# Argon2d (GPU resistant)
echo "3) Argon2d hash + verify:"
node -e "
  const { hashPassword, verifyPasswordPhc } = require('@sebastienrousseau/crypto-lib/dist/modern/password');

  const result = hashPassword({ password: '$PASSWORD', variant: 'argon2d' });
  console.log('   PHC string: ', result.phc);
  console.log('   Algorithm:  ', result.algorithm);

  const check = verifyPasswordPhc({ password: '$PASSWORD', phc: result.phc });
  console.log('   Verified:   ', check.valid);
"

echo ""
echo "Done."
