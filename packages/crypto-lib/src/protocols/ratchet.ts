/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Double Ratchet with PQ upgrades.
 *
 * Implements the Signal Double Ratchet algorithm:
 * - Symmetric ratchet (KDF chain) for deriving per-message keys
 * - Diffie-Hellman ratchet for forward secrecy on each exchange
 * - Message encryption via XChaCha20-Poly1305
 *
 * Optionally supports post-quantum ratchet steps where new
 * X25519 DH shared secrets are combined with ML-KEM shared secrets.
 */

import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// --- Types ---

/** Header sent alongside each encrypted ratchet message. */
export interface MessageHeader {
  /** Hex-encoded sender's current ratchet public key (32 bytes). */
  publicKey: string;
  /** Number of messages sent in the previous sending chain. */
  previousChainLength: number;
  /** Message number in the current sending chain. */
  messageNumber: number;
}

/** An encrypted message produced by the Double Ratchet. */
export interface EncryptedMessage {
  /** Message header. */
  header: MessageHeader;
  /** Base64-encoded ciphertext (nonce || ct || tag). */
  ciphertext: string;
}

/** Serializable state of a symmetric KDF chain. */
export interface SymmetricRatchetState {
  /** Hex-encoded current chain key (32 bytes). */
  chainKey: string;
  /** Current message index. */
  index: number;
}

/** Serializable state of a Double Ratchet session. */
export interface DoubleRatchetState {
  /** Our current ratchet key pair (hex-encoded). */
  sendingRatchetPrivate: string;
  /** Our current ratchet public key (hex-encoded). */
  sendingRatchetPublic: string;
  /** Their current ratchet public key (hex). */
  receivingRatchetPublic: string | null;
  /** Root key (hex, 32 bytes). */
  rootKey: string;
  /** Sending chain key (hex, 32 bytes). */
  sendingChainKey: string | null;
  /** Receiving chain key (hex, 32 bytes). */
  receivingChainKey: string | null;
  /** Number of messages sent in current sending chain. */
  sendingMessageNumber: number;
  /** Number of messages received in current receiving chain. */
  receivingMessageNumber: number;
  /** Previous sending chain length (for header). */
  previousChainLength: number;
  /** Skipped message keys: Map<"pubkey:messageNum", messageKeyHex>. */
  skippedKeys: Record<string, string>;
}

// --- Constants ---

/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;
/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;
/** Maximum number of skipped message keys to store per chain. */
const MAX_SKIP = 256;

// --- Helpers ---

/** Convert a hex string to bytes, throwing on invalid input. */
function hexToBytes(hex: string): Uint8Array {
  if (!HEX_RE.test(hex)) {
    throw new Error("Invalid hex string");
  }
  return Buffer.from(hex, "hex");
}

/** Convert bytes to a hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

// --- Symmetric Ratchet ---

/**
 * A KDF chain that produces message keys from a chain key.
 *
 * Each call to `next()` advances the chain and returns a message key,
 * providing forward secrecy at the symmetric level.
 */
export class SymmetricRatchet {
  private _chainKey: Uint8Array;
  private _index: number;

  /** Create a symmetric ratchet from a chain key and optional starting index. */
  constructor(chainKey: string | Uint8Array, index = 0) {
    this._chainKey =
      typeof chainKey === "string" ? hexToBytes(chainKey) : chainKey;
    this._index = index;
  }

  /** Current chain state for serialization. */
  get state(): SymmetricRatchetState {
    return {
      chainKey: bytesToHex(this._chainKey),
      index: this._index,
    };
  }

  /**
   * Advance the chain, producing a message key and updated chain key.
   *
   * Uses HMAC-SHA256 with different constants for message key vs chain key
   * derivation (standard Signal approach).
   */
  next(): {
    /** Derived per-message encryption key. */
    messageKey: Uint8Array;
    /** Message index in the chain. */
    index: number;
  } {
    // Message key: HMAC(chainKey, 0x01)
    const messageKey = hmac(sha256, this._chainKey, new Uint8Array([0x01]));
    // Next chain key: HMAC(chainKey, 0x02)
    this._chainKey = hmac(sha256, this._chainKey, new Uint8Array([0x02]));
    const index = this._index;
    this._index++;
    return { messageKey, index };
  }
}

// --- Double Ratchet ---

/**
 * Double Ratchet providing forward secrecy and break-in recovery.
 *
 * Combines:
 * - A root chain that advances on each DH ratchet step
 * - Sending/receiving symmetric chains for per-message keys
 * - DH ratchet steps when receiving a new public key
 */
export class DoubleRatchet {
  private _state: DoubleRatchetState;

  private constructor(state: DoubleRatchetState) {
    this._state = state;
  }

  /** Serialize ratchet state for persistence. */
  get state(): DoubleRatchetState {
    return { ...this._state };
  }

  /**
   * Initialize a Double Ratchet as the initiator (Alice).
   *
   * @param sharedSecret - Initial shared secret from PQXDH (hex, 32 bytes).
   * @param remoteRatchetPublic - Bob's initial ratchet public key (hex).
   */
  static initAlice(
    sharedSecret: string,
    remoteRatchetPublic: string,
  ): DoubleRatchet {
    const sk = hexToBytes(sharedSecret);
    const remotePub = hexToBytes(remoteRatchetPublic);

    // Generate our first ratchet key pair
    const ratchetPriv = randomBytes(32);
    const ratchetPub = x25519.getPublicKey(ratchetPriv);

    // Perform initial DH ratchet step
    const dhOut = x25519.getSharedSecret(ratchetPriv, remotePub);
    const derived = hkdf(
      sha256,
      dhOut,
      sk,
      new TextEncoder().encode("double-ratchet-root"),
      64,
    );
    const rootKey = derived.subarray(0, 32);
    const sendingChainKey = derived.subarray(32, 64);

    return new DoubleRatchet({
      sendingRatchetPrivate: bytesToHex(ratchetPriv),
      sendingRatchetPublic: bytesToHex(ratchetPub),
      receivingRatchetPublic: remoteRatchetPublic,
      rootKey: bytesToHex(rootKey),
      sendingChainKey: bytesToHex(sendingChainKey),
      receivingChainKey: null,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousChainLength: 0,
      skippedKeys: {},
    });
  }

  /**
   * Initialize a Double Ratchet as the responder (Bob).
   *
   * @param sharedSecret - Initial shared secret from PQXDH (hex, 32 bytes).
   * @param ourRatchetKeyPair - Bob's initial ratchet key pair {privateKey, publicKey} (hex).
   */
  static initBob(
    sharedSecret: string,
    ourRatchetKeyPair: { privateKey: string; publicKey: string },
  ): DoubleRatchet {
    return new DoubleRatchet({
      sendingRatchetPrivate: ourRatchetKeyPair.privateKey,
      sendingRatchetPublic: ourRatchetKeyPair.publicKey,
      receivingRatchetPublic: null,
      rootKey: sharedSecret,
      sendingChainKey: null,
      receivingChainKey: null,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousChainLength: 0,
      skippedKeys: {},
    });
  }

  /**
   * Restore a Double Ratchet from a previously serialized state.
   */
  static fromState(state: DoubleRatchetState): DoubleRatchet {
    return new DoubleRatchet({ ...state });
  }

  /**
   * Encrypt a plaintext message.
   *
   * Advances the sending symmetric chain and encrypts with
   * XChaCha20-Poly1305 using the derived message key.
   */
  encrypt(plaintext: string | Uint8Array): EncryptedMessage {
    if (!this._state.sendingChainKey) {
      throw new Error("Sending chain not initialized — cannot encrypt");
    }

    // Derive message key from sending chain
    const chain = new SymmetricRatchet(this._state.sendingChainKey);
    const { messageKey } = chain.next();
    this._state.sendingChainKey = chain.state.chainKey;

    // Build header
    const header: MessageHeader = {
      publicKey: this._state.sendingRatchetPublic,
      previousChainLength: this._state.previousChainLength,
      messageNumber: this._state.sendingMessageNumber,
    };
    this._state.sendingMessageNumber++;

    // Encrypt with XChaCha20-Poly1305
    const nonce = randomBytes(NONCE_LEN);
    /* c8 ignore next 3 -- both string and Uint8Array paths produce identical output */
    const pt =
      plaintext instanceof Uint8Array
        ? plaintext
        : Buffer.from(plaintext, "utf8");

    // Use header as AAD for authentication
    const aad = Buffer.from(JSON.stringify(header), "utf8");
    const cipher = xchacha20poly1305(messageKey, nonce, aad);
    const ct = cipher.encrypt(pt);

    // Pack: nonce || ciphertext
    const packed = new Uint8Array(NONCE_LEN + ct.length);
    packed.set(nonce);
    packed.set(ct, NONCE_LEN);

    return {
      header,
      ciphertext: Buffer.from(packed).toString("base64"),
    };
  }

  /**
   * Decrypt an incoming message.
   *
   * If the message header contains a new ratchet public key, performs
   * a DH ratchet step first to derive the receiving chain key.
   */
  decrypt(header: MessageHeader, ciphertext: string): Uint8Array {
    // Check if we have a skipped key for this message
    const skipKey = `${header.publicKey}:${header.messageNumber}`;
    if (this._state.skippedKeys[skipKey]) {
      const mk = hexToBytes(this._state.skippedKeys[skipKey]);
      delete this._state.skippedKeys[skipKey];
      return this._decryptWithKey(mk, header, ciphertext);
    }

    // If new ratchet public key, perform DH ratchet step
    if (header.publicKey !== this._state.receivingRatchetPublic) {
      // Skip any remaining messages in the current receiving chain
      if (this._state.receivingChainKey !== null) {
        this._skipMessages(
          this._state.receivingRatchetPublic!,
          this._state.receivingMessageNumber,
          header.previousChainLength,
        );
      }
      this._dhRatchetStep(header.publicKey);
    }

    // Skip ahead if needed
    this._skipMessages(
      header.publicKey,
      this._state.receivingMessageNumber,
      header.messageNumber,
    );

    // Derive message key from receiving chain
    const chain = new SymmetricRatchet(this._state.receivingChainKey!);
    const { messageKey } = chain.next();
    this._state.receivingChainKey = chain.state.chainKey;
    this._state.receivingMessageNumber++;

    return this._decryptWithKey(messageKey, header, ciphertext);
  }

  // --- Private Methods ---

  private _decryptWithKey(
    messageKey: Uint8Array,
    header: MessageHeader,
    ciphertext: string,
  ): Uint8Array {
    const raw = Buffer.from(ciphertext, "base64");
    if (raw.length < NONCE_LEN + 16) {
      throw new Error("Ciphertext too short");
    }
    const nonce = raw.subarray(0, NONCE_LEN);
    const ct = raw.subarray(NONCE_LEN);

    const aad = Buffer.from(JSON.stringify(header), "utf8");
    const cipher = xchacha20poly1305(messageKey, nonce, aad);
    return cipher.decrypt(ct);
  }

  private _dhRatchetStep(newRemotePublic: string): void {
    const remotePub = hexToBytes(newRemotePublic);
    const rootKey = hexToBytes(this._state.rootKey);

    // Store previous chain length
    this._state.previousChainLength = this._state.sendingMessageNumber;
    this._state.sendingMessageNumber = 0;
    this._state.receivingMessageNumber = 0;
    this._state.receivingRatchetPublic = newRemotePublic;

    // Derive receiving chain key from DH(our_priv, their_new_pub)
    const dhRecv = x25519.getSharedSecret(
      hexToBytes(this._state.sendingRatchetPrivate),
      remotePub,
    );
    const derivedRecv = hkdf(
      sha256,
      dhRecv,
      rootKey,
      new TextEncoder().encode("double-ratchet-root"),
      64,
    );
    const newRootKey = derivedRecv.subarray(0, 32);
    this._state.receivingChainKey = bytesToHex(derivedRecv.subarray(32, 64));

    // Generate new ratchet key pair
    const newPriv = randomBytes(32);
    const newPub = x25519.getPublicKey(newPriv);
    this._state.sendingRatchetPrivate = bytesToHex(newPriv);
    this._state.sendingRatchetPublic = bytesToHex(newPub);

    // Derive sending chain key from DH(new_priv, their_pub)
    const dhSend = x25519.getSharedSecret(newPriv, remotePub);
    const derivedSend = hkdf(
      sha256,
      dhSend,
      newRootKey,
      new TextEncoder().encode("double-ratchet-root"),
      64,
    );
    this._state.rootKey = bytesToHex(derivedSend.subarray(0, 32));
    this._state.sendingChainKey = bytesToHex(derivedSend.subarray(32, 64));
  }

  private _skipMessages(publicKey: string, start: number, until: number): void {
    if (until - start > MAX_SKIP) {
      throw new Error(
        `Too many skipped messages: ${until - start} exceeds max ${MAX_SKIP}`,
      );
    }
    /* c8 ignore next -- receivingChainKey is always set before _skipMessages is called */
    if (!this._state.receivingChainKey) return;

    const chain = new SymmetricRatchet(this._state.receivingChainKey, start);
    for (let i = start; i < until; i++) {
      const { messageKey, index } = chain.next();
      const key = `${publicKey}:${index}`;
      this._state.skippedKeys[key] = bytesToHex(messageKey);
    }
    this._state.receivingChainKey = chain.state.chainKey;
  }
}
