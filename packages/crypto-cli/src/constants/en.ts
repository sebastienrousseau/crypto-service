/** English (en) translation strings for the CLI interface. */
export const translations = {
  /** Main title shown in the CLI banner. */
  CLI_TITLE: "🔐 Crypto CLI",
  /** Description of the CLI application. */
  CLI_DESCRIPTION:
    "Crypto CLI is a simple, yet powerful, command line interface that can be used to perform common cryptographic operations from the command prompt or terminal.",
  /** Title for the Generate command. */
  CLI_FN_1_TTL: "Generate",
  /** Short description for the Generate command. */
  CLI_FN_1_DES: "Generates a new OpenPGP key pair. Supports RSA and ECC keys.",
  /** Help-menu description for the Generate command. */
  CLI_FN_1_LG_DES: "🔍 Select this option to get help on the generate command.",
  /** Title for the Encrypt command. */
  CLI_FN_2_TTL: "Encrypt",
  /** Short description for the Encrypt command. */
  CLI_FN_2_DES: "Encrypts a message.",
  /** Help-menu description for the Encrypt command. */
  CLI_FN_2_LG_DES: "🔍 Select this option to get help on the encrypt command.",
  /** Title for the Decrypt command. */
  CLI_FN_3_TTL: "Decrypt",
  /** Short description for the Decrypt command. */
  CLI_FN_3_DES: "Decrypts a message.",
  /** Help-menu description for the Decrypt command. */
  CLI_FN_3_LG_DES: "🔍 Select this option to get help on the decrypt command.",
  /** Title for the Reformat command. */
  CLI_FN_4_TTL: "Reformat",
  /** Short description for the Reformat command. */
  CLI_FN_4_DES: "Reformats signature packets for a key.",
  /** Help-menu description for the Reformat command. */
  CLI_FN_4_LG_DES: "🔍 Select this option to get help on the reformat command.",
  /** Title for the Revoke command. */
  CLI_FN_5_TTL: "Revoke",
  /** Short description for the Revoke command. */
  CLI_FN_5_DES: "Revokes a key.",
  /** Help-menu description for the Revoke command. */
  CLI_FN_5_LG_DES: "🔍 Select this option to get help on the revoke command.",
  /** Title for the Session command. */
  CLI_FN_6_TTL: "Session",
  /** Short description for the Session command. */
  CLI_FN_6_DES: "Generate a new session key object.",
  /** Help-menu description for the Session command. */
  CLI_FN_6_LG_DES: "🔍 Select this option to get help on the session command.",
  /** Title for the Sign command. */
  CLI_FN_7_TTL: "Sign",
  /** Short description for the Sign command. */
  CLI_FN_7_DES: "Signs a message.",
  /** Help-menu description for the Sign command. */
  CLI_FN_7_LG_DES: "🔍 Select this option to get help on the sign command.",
  /** Title for the Verify command. */
  CLI_FN_8_TTL: "Verify",
  /** Short description for the Verify command. */
  CLI_FN_8_DES: "Verifies signatures of cleartext signed message.",
  /** Help-menu description for the Verify command. */
  CLI_FN_8_LG_DES: "🔍 Select this option to get help on the verify command.",
  /** Title for the Help command. */
  CLI_FN_9_TTL: "Help",
  /** Short description for the Help command. */
  CLI_FN_9_DES: "Get help on a command.",
  /** Extended description for the Help command (empty). */
  CLI_FN_9_LG_DES: "",
  /** Prompt text shown before command-specific input collection. */
  CLI_HDL_1_DES: "We need you to provide us with the following information:",
  /** Prompt field name for user selection. */
  PROMPT_SELECT_TTL: "Selection",
  /** Prompt message for the main command selector. */
  PROMPT_SELECT_DES: "Select a function to execute.",
  /** Prompt message for the help command selector. */
  PROMPT_SELECT_DES_HLP:
    "Let us help you on the Crypto Command Line Interface (CLI). Please select a command to learn more about.",
  /** Help text: decrypt command description. */
  PROMPT_HLP_DEC_DES:
    "This function decrypts a message with the user's private key, a session key or a password. One of decryptionKeys, session keys or passwords must be specified (passing a combination of these options is not supported).",
  /** Help text: decrypt command usage. */
  PROMPT_HLP_DEC_USAGE: "Usage: decrypt [options]",
  /** Help text: decrypt command options header. */
  PROMPT_HLP_DEC_OPTIONS: "Options:",
  /** Help text: decrypt encryptedMessage option. */
  PROMPT_HLP_DEC_OPT_1:
    "  <encryptedMessage> - The message object with the encrypted data.",
  /** Help text: decrypt passphrase option. */
  PROMPT_HLP_DEC_OPT_2:
    "  <passphrase> - Passphrase / Passwords to decrypt the message",
  /** Help text: decrypt publicKey option. */
  PROMPT_HLP_DEC_OPT_3:
    "  <publicKey> - Public key enumeration base64 encoded.",
  /** Help text: encrypt command description. */
  PROMPT_HLP_ENC_DES:
    "This function encrypts a message using public keys, passwords or both at once. At least one of encryptionKeys or passwords must be specified. If signing keys are specified, those will be used to sign the message.",
  /** Help text: encrypt command usage. */
  PROMPT_HLP_ENC_USAGE: "Usage: encrypt [options]",
  /** Help text: encrypt command options header. */
  PROMPT_HLP_ENC_OPTIONS: "Options:",
  /** Help text: encrypt message option. */
  PROMPT_HLP_ENC_OPT_1: "  <message> - The message to be encrypted.",
  /** Help text: encrypt passphrase option. */
  PROMPT_HLP_ENC_OPT_2: "  <passphrase> - Passphrase to encrypt the message.",
  /** Help text: encrypt publicKey option. */
  PROMPT_HLP_ENC_OPT_3:
    "  <publicKey> - Public key enumeration base64 encoded.",
  /** Help text: generate command description. */
  PROMPT_HLP_GEN_DES:
    "This function generates a new OpenPGP key pair. Supports RSA and ECC keys. By default, primary and subkeys will be of same type. The generated primary key will have signing capabilities. By default, one subkey with encryption capabilities is also generated.",
  /** Help text: generate command usage. */
  PROMPT_HLP_GEN_USAGE: "Usage: generate [options]",
  /** Help text: generate command options header. */
  PROMPT_HLP_GEN_OPTIONS: "Options:",
  /** Help text: generate name option. */
  PROMPT_HLP_GEN_OPT_1: "  <name> - Name of the user.",
  /** Help text: generate email option. */
  PROMPT_HLP_GEN_OPT_2: "  <email> - Email of the user.",
  /** Help text: generate passphrase option. */
  PROMPT_HLP_GEN_OPT_3:
    "  <passphrase> - The passphrase used to encrypt the generated private key. If omitted or empty, the key won't be encrypted.",
  /** Help text: generate type option. */
  PROMPT_HLP_GEN_OPT_4:
    "  <type> - The primary key algorithm type: ECC (default) or RSA.",
  /** Help text: generate curve option. */
  PROMPT_HLP_GEN_OPT_5:
    "  <curve> - Elliptic curve for ECC keys: curve25519 (default), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, or brainpoolP512r1.",
  /** Help text: generate rsaBits option. */
  PROMPT_HLP_GEN_OPT_6: "  <rsaBits> - Number of bits for RSA keys.",
  /** Help text: generate keyExpirationTime option. */
  PROMPT_HLP_GEN_OPT_7:
    "  <keyExpirationTime> - Number of seconds from the key creation time after which the key expires.",
  /** Help text: generate format option. */
  PROMPT_HLP_GEN_OPT_8:
    "  <format> - Format of the output keys: 'armored' | 'binary' | 'object'",
  /** Help text: reformat command description. */
  PROMPT_HLP_REF_DES:
    "This function reformats signature packets for a key and rewraps key object.",
  /** Help text: reformat command usage. */
  PROMPT_HLP_REF_USAGE: "Usage: reformat [options]",
  /** Help text: reformat command options header. */
  PROMPT_HLP_REF_OPTIONS: "Options:",
  /** Help text: reformat email option. */
  PROMPT_HLP_REF_OPT_1: "  <email> - Email of the user.",
  /** Help text: reformat expirationTime option. */
  PROMPT_HLP_REF_OPT_2:
    "  <expirationTime> - Number of seconds from the key creation time after which the key expires.",
  /** Help text: reformat name option. */
  PROMPT_HLP_REF_OPT_3: "  <name> - Name of the user.",
  /** Help text: reformat passphrase option. */
  PROMPT_HLP_REF_OPT_4:
    "  <passphrase> - The passphrase used to encrypt the reformatted private key. If omitted or empty, the key won't be encrypted.",
  /** Help text: reformat publicKey option. */
  PROMPT_HLP_REF_OPT_5:
    "  <publicKey> - Public key enumeration base64 encoded.",
  /** Help text: revoke command description. */
  PROMPT_HLP_RVK_DES:
    "This function revokes a key. Requires either a private key or a revocation certificate. If a revocation certificate is passed, the reasonForRevocation parameter will be ignored.",
  /** Help text: revoke command usage. */
  PROMPT_HLP_RVK_USAGE: "Usage: revoke [options]",
  /** Help text: revoke command options header. */
  PROMPT_HLP_RVK_OPTIONS: "Options:",
  /** Help text: revoke flags option. */
  PROMPT_HLP_RVK_OPT_1:
    "  <flags> - Flag indicating the reason for revocation.",
  /** Help text: revoke passphrase option. */
  PROMPT_HLP_RVK_OPT_2:
    "  <passphrase> - Passphrase to decrypt the private key.",
  /** Help text: revoke reasonForRevocation option. */
  PROMPT_HLP_RVK_OPT_3: "  <reasonForRevocation> - Reason for revocation.",
  /** Help text: session command description. */
  PROMPT_HLP_SES_DES:
    "This function generates a new session key object, taking the algorithm preferences of the passed public keys into account.",
  /** Help text: session command usage. */
  PROMPT_HLP_SES_USAGE: "Usage: session [options]",
  /** Help text: session name option. */
  PROMPT_HLP_SES_OPT_1: " <name> - Name of the user.",
  /** Help text: session publicKey option. */
  PROMPT_HLP_SES_OPT_2: " <publicKey> - Public key enumeration base64 encoded.",
  /** Help text: sign command description. */
  PROMPT_HLP_SGN_DES: "This function signs a message.",
  /** Help text: sign command usage. */
  PROMPT_HLP_SGN_USAGE: "Usage: sign [options]",
  /** Help text: sign passphrase option. */
  PROMPT_HLP_SGN_OPT_1: " <passphrase> - Passphrase to sign the message.",
  /** Help text: sign message option. */
  PROMPT_HLP_SGN_OPT_2: " <message> - The message to be signed.",
  /** Help text: sign detach option. */
  PROMPT_HLP_SGN_OPT_3:
    " <detach> - If true, the signature is detached. If false, the signature is embedded.",
  /** Help text: sign publicKey option. */
  PROMPT_HLP_SGN_OPT_4: " <publicKey> - Public key enumeration base64 encoded.",
  /** Help text: sign privateKey option. */
  PROMPT_HLP_SGN_OPT_5:
    " <privateKey> - Private key enumeration base64 encoded.",
  /** Help text: verify command description. */
  PROMPT_HLP_VRF_DES:
    "This function verifies signatures of cleartext signed message.",
  /** Help text: verify command usage. */
  PROMPT_HLP_VRF_USAGE: "Usage: verify [options]",
  /** Help text: verify message option. */
  PROMPT_HLP_VRF_OPT_1: " <message> - The message to be verified.",
  /** Help text: verify publicKey option. */
  PROMPT_HLP_VRF_OPT_2: " <publicKey> - Public key enumeration base64 encoded.",
  /** Error message when no command is selected. */
  CLI_ERR_1: "🔔 You must select a command.",
  /** Error message when an invalid option is selected. */
  CLI_ERR_2: "🔔 You must select a valid option.",
} as const;
