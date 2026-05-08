import handleDecrypt from "./decrypt.command";
import handleEncrypt from "./encrypt.command";
import handleGenerate from "./generate.command";
import handleHelp from "./help.command";
import handleReformat from "./reformat.command";
import handleRevoke from "./revoke.command";
import handleSession from "./session.command";
import handleSign from "./sign.command";
import handleVerify from "./verify.command";
import { ModernCommand } from "./modern";

/** Registry of all CLI command handlers (legacy PGP + modern crypto). */
export const Command = {
  /** Decrypt a PGP-encrypted message. */
  handleDecrypt: handleDecrypt,
  /** Encrypt a message using PGP. */
  handleEncrypt: handleEncrypt,
  /** Generate a new OpenPGP key pair. */
  handleGenerate: handleGenerate,
  /** Display interactive help for CLI commands. */
  handleHelp: handleHelp,
  /** Reformat OpenPGP key signature packets. */
  handleReformat: handleReformat,
  /** Revoke an OpenPGP key. */
  handleRevoke: handleRevoke,
  /** Generate an OpenPGP session key. */
  handleSession: handleSession,
  /** Sign a message using PGP. */
  handleSign: handleSign,
  /** Verify a PGP-signed message. */
  handleVerify: handleVerify,
  /** Generate modern key pairs (Ed25519, ML-KEM, ML-DSA, etc.). */
  handleModernKeygen: ModernCommand.handleModernKeygen,
  /** Hash data using modern algorithms (SHA-2, SHA-3, BLAKE). */
  handleModernHash: ModernCommand.handleModernHash,
  /** Encrypt data using modern AEAD ciphers (XChaCha20, AES-GCM). */
  handleModernEncrypt: ModernCommand.handleModernEncrypt,
  /** Sign or verify messages with modern signature schemes. */
  handleModernSign: ModernCommand.handleModernSign,
  /** Hash or verify passwords using Argon2. */
  handlePasswordHash: ModernCommand.handlePasswordHash,
};
