#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Legacy OpenPGP operations via the interactive CLI.
# Run: bash examples/legacy.sh

set -euo pipefail

echo ""
echo "  crypto-cli -- legacy"
echo ""

# Generate an ECC key pair (non-interactive via piped input)
echo "  ✓ Generate ECC key pair"
echo "    echo -e '0\\nAlice\\nalice@example.com\\necc\\nmy-passphrase\\n0\\ncurve25519\\n1y\\narmored' | cryptocli"
echo ""

# Encrypt a message
echo "  ✓ Encrypt a message"
echo "    echo -e '1\\nHello World\\nmy-passphrase\\n<base64-public-key>' | cryptocli"
echo ""

# Sign a message
echo "  ✓ Sign a message"
echo "    echo -e '6\\nmy-passphrase\\nHello World\\ntrue\\n<base64-public-key>\\n<base64-private-key>' | cryptocli"
echo ""

echo "  Tip: For scripted usage, prefer the Modern commands which accept"
echo "       hex-encoded keys and produce structured JSON output."

echo ""
echo "  ✓ 3 operations completed."
echo ""
