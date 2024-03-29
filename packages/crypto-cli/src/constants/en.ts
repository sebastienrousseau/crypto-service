// CLI constants
export const translations = {
  CLI_TITLE: "🔐 Crypto CLI",
  CLI_DESCRIPTION:
    "Crypto CLI is a simple, yet powerful, command line interface that can be used to perform common cryptographic operations from the command prompt or terminal.",
  CLI_FN_1_TTL: "Generate",
  CLI_FN_1_DES: "Generates a new OpenPGP key pair. Supports RSA and ECC keys.",
  CLI_FN_1_LG_DES: "🔍 Select this option to get help on the generate command.",
  CLI_FN_2_TTL: "Encrypt",
  CLI_FN_2_DES: "Encrypts a message.",
  CLI_FN_2_LG_DES: "🔍 Select this option to get help on the encrypt command.",
  CLI_FN_3_TTL: "Decrypt",
  CLI_FN_3_DES: "Decrypts a message.",
  CLI_FN_3_LG_DES: "🔍 Select this option to get help on the decrypt command.",
  CLI_FN_4_TTL: "Reformat",
  CLI_FN_4_DES: "Reformats signature packets for a key.",
  CLI_FN_4_LG_DES: "🔍 Select this option to get help on the reformat command.",
  CLI_FN_5_TTL: "Revoke",
  CLI_FN_5_DES: "Revokes a key.",
  CLI_FN_5_LG_DES: "🔍 Select this option to get help on the revoke command.",
  CLI_FN_6_TTL: "Session",
  CLI_FN_6_DES: "Generate a new session key object.",
  CLI_FN_6_LG_DES: "🔍 Select this option to get help on the session command.",
  CLI_FN_7_TTL: "Sign",
  CLI_FN_7_DES: "Signs a message.",
  CLI_FN_7_LG_DES: "🔍 Select this option to get help on the sign command.",
  CLI_FN_8_TTL: "Verify",
  CLI_FN_8_DES: "Verifies signatures of cleartext signed message.",
  CLI_FN_8_LG_DES: "🔍 Select this option to get help on the verify command.",
  CLI_FN_9_TTL: "Help",
  CLI_FN_9_DES: "Get help on a command.",
  CLI_FN_9_LG_DES: "",
  CLI_HDL_1_DES: "We need you to provide us with the following information:",
  PROMPT_SELECT_TTL: "Selection",
  PROMPT_SELECT_DES: "Select a function to execute.",
  PROMPT_SELECT_DES_HLP:
    "Let us help you on the Crypto Command Line Interface (CLI). Please select a command to learn more about.",
  PROMPT_HLP_DEC_DES:
    "This function decrypts a message with the user's private key, a session key or a password. One of decryptionKeys, session keys or passwords must be specified (passing a combination of these options is not supported).",
  PROMPT_HLP_DEC_USAGE: "Usage: decrypt [options]",
  PROMPT_HLP_DEC_OPTIONS: "Options:",
  PROMPT_HLP_DEC_OPT_1:
    "  <encryptedMessage> - The message object with the encrypted data.",
  PROMPT_HLP_DEC_OPT_2:
    "  <passphrase> - Passphrase / Passwords to decrypt the message",
  PROMPT_HLP_DEC_OPT_3:
    "  <publicKey> - Public key enumeration base64 encoded.",
  PROMPT_HLP_ENC_DES:
    "This function encrypts a message using public keys, passwords or both at once. At least one of encryptionKeys or passwords must be specified. If signing keys are specified, those will be used to sign the message.",
  PROMPT_HLP_ENC_USAGE: "Usage: encrypt [options]",
  PROMPT_HLP_ENC_OPTIONS: "Options:",
  PROMPT_HLP_ENC_OPT_1: "  <message> - The message to be encrypted.",
  PROMPT_HLP_ENC_OPT_2: "  <passphrase> - Passphrase to encrypt the message.",
  PROMPT_HLP_ENC_OPT_3:
    "  <publicKey> - Public key enumeration base64 encoded.",
  PROMPT_HLP_GEN_DES:
    "This function generates a new OpenPGP key pair. Supports RSA and ECC keys. By default, primary and subkeys will be of same type. The generated primary key will have signing capabilities. By default, one subkey with encryption capabilities is also generated.",
  PROMPT_HLP_GEN_USAGE: "Usage: generate [options]",
  PROMPT_HLP_GEN_OPTIONS: "Options:",
  PROMPT_HLP_GEN_OPT_1: "  <name> - Name of the user.",
  PROMPT_HLP_GEN_OPT_2: "  <email> - Email of the user.",
  PROMPT_HLP_GEN_OPT_3:
    "  <passphrase> - The passphrase used to encrypt the generated private key. If omitted or empty, the key won't be encrypted.",
  PROMPT_HLP_GEN_OPT_4:
    "  <type> - The primary key algorithm type: ECC (default) or RSA.",
  PROMPT_HLP_GEN_OPT_5:
    "  <curve> - Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1.",
  PROMPT_HLP_GEN_OPT_6: "  <rsaBits> - Number of bits for RSA keys.",
  PROMPT_HLP_GEN_OPT_7:
    "  <keyExpirationTime> - Number of seconds from the key creation time after which the key expires.",
  PROMPT_HLP_GEN_OPT_8:
    "  <format> - Format of the output keys: 'armored' | 'binary' | 'object'",
  PROMPT_HLP_REF_DES:
    "This function reformats signature packets for a key and rewraps key object.",
  PROMPT_HLP_REF_USAGE: "Usage: reformat [options]",
  PROMPT_HLP_REF_OPTIONS: "Options:",
  PROMPT_HLP_REF_OPT_1: "  <email> - Email of the user.",
  PROMPT_HLP_REF_OPT_2:
    "  <expirationTime> - Number of seconds from the key creation time after which the key expires.",
  PROMPT_HLP_REF_OPT_3: "  <name> - Name of the user.",
  PROMPT_HLP_REF_OPT_4:
    "  <passphrase> - The passphrase used to encrypt the reformatted private key. If omitted or empty, the key won't be encrypted.",
  PROMPT_HLP_REF_OPT_5:
    "  <publicKey> - Public key enumeration base64 encoded.",
  PROMPT_HLP_RVK_DES:
    "This function revokes a key. Requires either a private key or a revocation certificate. If a revocation certificate is passed, the reasonForRevocation parameter will be ignored.",
  PROMPT_HLP_RVK_USAGE: "Usage: revoke [options]",
  PROMPT_HLP_RVK_OPTIONS: "Options:",
  PROMPT_HLP_RVK_OPT_1:
    "  <flags> - Flag indicating the reason for revocation.",
  PROMPT_HLP_RVK_OPT_2:
    "  <passphrase> - Passphrase to decrypt the private key.",
  PROMPT_HLP_RVK_OPT_3: "  <reasonForRevocation> - Reason for revocation.",
  PROMPT_HLP_SES_DES:
    "This function generates a new session key object, taking the algorithm preferences of the passed public keys into account.",
  PROMPT_HLP_SES_USAGE: "Usage: session [options]",
  PROMPT_HLP_SES_OPT_1: " <name> - Name of the user.",
  PROMPT_HLP_SES_OPT_2: " <publicKey> - Public key enumeration base64 encoded.",
  PROMPT_HLP_SGN_DES: "This function signs a message.",
  PROMPT_HLP_SGN_USAGE: "Usage: sign [options]",
  PROMPT_HLP_SGN_OPT_1: " <passphrase> - Passphrase to sign the message.",
  PROMPT_HLP_SGN_OPT_2: " <message> - The message to be signed.",
  PROMPT_HLP_SGN_OPT_3:
    " <detach> - If true, the signature is detached. If false, the signature is embedded.",
  PROMPT_HLP_SGN_OPT_4: " <publicKey> - Public key enumeration base64 encoded.",
  PROMPT_HLP_SGN_OPT_5:
    " <privateKey> - Private key enumeration base64 encoded.",
  PROMPT_HLP_VRF_DES:
    "This function verifies signatures of cleartext signed message.",
  PROMPT_HLP_VRF_USAGE: "Usage: verify [options]",
  PROMPT_HLP_VRF_OPT_1: " <message> - The message to be verified.",
  PROMPT_HLP_VRF_OPT_2: " <publicKey> - Public key enumeration base64 encoded.",
  CLI_ERR_1: "🔔 You must select a command.",
  CLI_ERR_2: "🔔 You must select a valid option.",
} as const;
