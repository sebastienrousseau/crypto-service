#!/usr/bin/env bash
set -euo pipefail

# Crypto Service Suite — v2 API Examples
# Start the server first: pnpm start

BASE="http://localhost:3000"

echo "=== List algorithms ==="
curl -s "$BASE/v2/algorithms" | jq .

echo ""
echo "=== Hash (SHA-256) ==="
curl -s -X POST "$BASE/v2/hash" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"sha256","data":"Hello, World!"}' | jq .

echo ""
echo "=== Hash (BLAKE3) ==="
curl -s -X POST "$BASE/v2/hash" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"blake3","data":"Hello, World!"}' | jq .

echo ""
echo "=== KDF (scrypt) ==="
curl -s -X POST "$BASE/v2/kdf" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"scrypt","password":"my-secret-password","params":{"N":1024,"r":8,"p":1}}' | jq .

echo ""
echo "=== Encrypt + Decrypt (XChaCha20-Poly1305) ==="
KEY="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

ENCRYPTED=$(curl -s -X POST "$BASE/v2/encrypt" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$KEY\",\"plaintext\":\"Top secret message!\"}")
echo "Encrypted: $(echo "$ENCRYPTED" | jq -r .data.ciphertext | head -c 60)..."

CIPHERTEXT=$(echo "$ENCRYPTED" | jq -r .data.ciphertext)
curl -s -X POST "$BASE/v2/decrypt" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$KEY\",\"ciphertext\":\"$CIPHERTEXT\"}" | jq .

echo ""
echo "=== Ed25519 Sign + Verify ==="
KEYPAIR=$(curl -s -X POST "$BASE/v2/keys/generate" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"ed25519"}')
PRIVKEY=$(echo "$KEYPAIR" | jq -r .data.privateKey)
PUBKEY=$(echo "$KEYPAIR" | jq -r .data.publicKey)
echo "Public key: $PUBKEY"

SIGNED=$(curl -s -X POST "$BASE/v2/sign" \
  -H "Content-Type: application/json" \
  -d "{\"privateKey\":\"$PRIVKEY\",\"message\":\"Sign this document\"}")
SIG=$(echo "$SIGNED" | jq -r .data.signature)
echo "Signature: ${SIG:0:40}..."

curl -s -X POST "$BASE/v2/verify" \
  -H "Content-Type: application/json" \
  -d "{\"publicKey\":\"$PUBKEY\",\"message\":\"Sign this document\",\"signature\":\"$SIG\"}" | jq .

echo ""
echo "=== Post-Quantum Hybrid Key Exchange ==="
RECIPIENT=$(curl -s -X POST "$BASE/v2/pq/hybrid/keygen" \
  -H "Content-Type: application/json" -d '{}')
echo "Recipient key generated (hybrid X25519 + ML-KEM-768)"

X25519PUB=$(echo "$RECIPIENT" | jq -r .data.x25519PublicKey)
MLKEMPUB=$(echo "$RECIPIENT" | jq -r .data.mlKemPublicKey)
X25519PRIV=$(echo "$RECIPIENT" | jq -r .data.x25519PrivateKey)
MLKEMSEC=$(echo "$RECIPIENT" | jq -r .data.mlKemSecretKey)

ENCAP=$(curl -s -X POST "$BASE/v2/pq/hybrid/encapsulate" \
  -H "Content-Type: application/json" \
  -d "{\"x25519PublicKey\":\"$X25519PUB\",\"mlKemPublicKey\":\"$MLKEMPUB\"}")
SENDER_SECRET=$(echo "$ENCAP" | jq -r .data.sharedSecret)
X25519EPH=$(echo "$ENCAP" | jq -r .data.x25519EphemeralPublic)
MLKEMCT=$(echo "$ENCAP" | jq -r .data.mlKemCiphertext)
echo "Sender shared secret: ${SENDER_SECRET:0:32}..."

DECAP=$(curl -s -X POST "$BASE/v2/pq/hybrid/decapsulate" \
  -H "Content-Type: application/json" \
  -d "{\"x25519PrivateKey\":\"$X25519PRIV\",\"mlKemSecretKey\":\"$MLKEMSEC\",\"x25519EphemeralPublic\":\"$X25519EPH\",\"mlKemCiphertext\":\"$MLKEMCT\"}")
RECIPIENT_SECRET=$(echo "$DECAP" | jq -r .data.sharedSecret)
echo "Recipient shared secret: ${RECIPIENT_SECRET:0:32}..."

if [ "$SENDER_SECRET" = "$RECIPIENT_SECRET" ]; then
  echo "Shared secrets match! Hybrid PQ key exchange successful."
else
  echo "ERROR: Shared secrets do not match!"
  exit 1
fi

echo ""
echo "=== Health + Probes ==="
curl -s "$BASE/health" | jq .
curl -s "$BASE/live" | jq .
curl -s "$BASE/ready" | jq .

echo ""
echo "All examples completed successfully."
