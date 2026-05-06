#!/usr/bin/env bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
#
# Legacy OpenPGP operations via the interactive CLI.
# Shows how to invoke the CLI non-interactively using command piping.
#
# Run: bash examples/legacy.sh

set -euo pipefail

echo "=== crypto-cli — legacy ==="
printf '\n'

echo "The legacy commands use OpenPGP (RFC 4880) via the interactive menu."
echo "Below are examples of invoking the CLI with piped input."
printf '\n'

# Generate an ECC key pair (non-interactive via piped input)
echo "1) Generate an ECC key pair:"
printf '   Command: echo -e '\''0\\nAlice\\nalice@example.com\\necc\\nmy-passphrase\\n0\\ncurve25519\\n1y\\narmored'\'' | cryptocli\n'
printf '\n'
echo "   Prompts answered:"
echo "     Selection:   0 (Generate)"
echo "     Name:        Alice"
echo "     Email:       alice@example.com"
echo "     Type:        ecc"
echo "     Passphrase:  my-passphrase"
echo "     RSA bits:    0 (not applicable)"
echo "     Curve:       curve25519"
echo "     Expiration:  1y"
echo "     Format:      armored"
printf '\n'

# Encrypt a message
echo "2) Encrypt a message:"
printf '   Command: echo -e '\''1\\nHello World\\nmy-passphrase\\n<base64-public-key>'\'' | cryptocli\n'
printf '\n'
echo "   Prompts answered:"
echo "     Selection:   1 (Encrypt)"
echo "     Message:     Hello World"
echo "     Passphrase:  my-passphrase"
echo "     Public key:  <base64-encoded OpenPGP public key>"
printf '\n'

# Sign a message
echo "3) Sign a message:"
printf '   Command: echo -e '\''6\\nmy-passphrase\\nHello World\\ntrue\\n<base64-public-key>\\n<base64-private-key>'\'' | cryptocli\n'
printf '\n'
echo "   Prompts answered:"
echo "     Selection:    6 (Sign)"
echo "     Passphrase:   my-passphrase"
echo "     Message:      Hello World"
echo "     Detach:       true"
echo "     Public key:   <base64-encoded OpenPGP public key>"
echo "     Private key:  <base64-encoded OpenPGP private key>"
printf '\n'

echo "Tip: For scripted usage, prefer the Modern commands which accept"
echo "     hex-encoded keys and produce structured JSON output."

printf '\n'
echo "Done."
