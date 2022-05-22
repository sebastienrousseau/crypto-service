![Banner representing Crypto Service](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-core-logo.svg)

[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](/assets/made-with-love.svg)

# Key Generation API

Most cryptographic operations involve a mathematical formula (algorithm) and
secret data (key). The Key Generation APIs allow you to generate random key
values for both symmetric and asymmetric (PKA) algorithms.

The Key Generation APIs include:

- Calculate Diffie-Hellman Secret Key (QC3CALDS, Qc3CalculateDHSecretKey)
calculates a Diffie-Hellman shared secret key.

- Generate Diffie-Hellman Key Pair (QC3GENDK, Qc3GenDHKeyPair) generates a
Diffie-Hellman (D-H) private public key pair needed for calculating a
Diffie-Hellman shared secret key.

- Generate Diffie-Hellman Parameters (QC3GENDP, Qc3GenDHParms) generates the
parameters needed for generating a Diffie-Hellman key pair.

- Generate ECC Key Pair (QC3GENECC, Qc3GenECCKeyPair) generates a random ECC
key pair given a set of domain parameters to be used with elliptic curve
cryptographic algorithms.

- Generate Elliptic Curve Diffie-Hellman Key Pair
(QC3GENECDK, Qc3GenECDKeyPair) generates a Diffie-Hellman (D-H) private/public
key pair needed for calculating a Diffie-Hellman shared secret key.

- Generate PKA Key Pair (QC3GENPK, Qc3GenPKAKeyPair) generates a random PKA
key pair.

- Generate Symmetric Key (QC3GENSK, Qc3GenSymmetricKey) generates a random key
value that can be used with a symmetric cipher algorithm.

***
