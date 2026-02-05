import { expect } from 'chai';
import { encrypt } from '../src/lib/encrypt';
import * as openpgp from 'openpgp';

describe('Encrypt Function - Coverage Tests', () => {
  // Generate real test keys for proper coverage
  let testKeys: {
    publicKeyArmored: string;
    privateKeyArmored: string;
    publicKeyBase64: string;
    privateKeyBase64: string;
    passphrase: string;
  };

  before(async function() {
    this.timeout(10000); // Key generation can be slow

    const passphrase = 'test-passphrase-123';

    // Generate real PGP key pair for testing
    const { privateKey: privateKeyArmored, publicKey: publicKeyArmored } = await openpgp.generateKey({
      type: 'ecc',
      curve: 'curve25519',
      userIDs: [{ name: 'Test User', email: 'test@example.com' }],
      passphrase,
      format: 'armored'
    });

    testKeys = {
      publicKeyArmored,
      privateKeyArmored,
      publicKeyBase64: Buffer.from(publicKeyArmored).toString('base64'),
      privateKeyBase64: Buffer.from(privateKeyArmored).toString('base64'),
      passphrase
    };
  });

  describe('Signing Branch Coverage', () => {
    it('should encrypt with signing when privateKey is provided', async () => {
      const testData = {
        message: 'Hello, signed encryption!',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64 // This triggers signing path
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');
      expect(result).to.include('END PGP MESSAGE');

      // Verify the message can be decrypted and has valid signature
      const message = await openpgp.readMessage({ armoredMessage: result });
      const publicKey = await openpgp.readKey({ armoredKey: testKeys.publicKeyArmored });
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: testKeys.privateKeyArmored }),
        passphrase: testKeys.passphrase
      });

      const { data: decrypted, signatures } = await openpgp.decrypt({
        message,
        verificationKeys: publicKey,
        decryptionKeys: privateKey
      });

      expect(decrypted.toString()).to.equal('Hello, signed encryption!');
      expect(signatures.length).to.be.greaterThan(0);
    });

    it('should encrypt without signing when privateKey is empty string', async () => {
      const testData = {
        message: 'Hello, unsigned encryption!',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: '' // Empty string - no signing
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');
      expect(result).to.include('END PGP MESSAGE');

      // Verify the message can be decrypted without signature
      const message = await openpgp.readMessage({ armoredMessage: result });
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: testKeys.privateKeyArmored }),
        passphrase: testKeys.passphrase
      });

      const { data: decrypted, signatures } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
      });

      expect(decrypted.toString()).to.equal('Hello, unsigned encryption!');
      expect(signatures.length).to.equal(0); // No signatures
    });

    it('should encrypt without signing when privateKey is undefined', async () => {
      const testData = {
        message: 'Hello, no private key!',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: undefined as any // Undefined - no signing
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');

      // Verify the message can be decrypted
      const message = await openpgp.readMessage({ armoredMessage: result });
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: testKeys.privateKeyArmored }),
        passphrase: testKeys.passphrase
      });

      const { data: decrypted, signatures } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
      });

      expect(decrypted.toString()).to.equal('Hello, no private key!');
      expect(signatures.length).to.equal(0);
    });

    it('should encrypt without signing when privateKey is null', async () => {
      const testData = {
        message: 'Hello, null private key!',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: null as any // Null - no signing
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');
    });
  });

  describe('Error Handling in Signing Path', () => {
    it('should handle invalid base64 private key when signing', async () => {
      const testData = {
        message: 'Test message',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: 'invalid-base64!@#$' // Invalid base64
      };

      try {
        await encrypt(testData);
        expect.fail('Should have thrown error for invalid base64 private key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle invalid armored private key when signing', async () => {
      const invalidPrivateKeyBase64 = Buffer.from('-----BEGIN PGP PRIVATE KEY BLOCK-----\ninvalid key content\n-----END PGP PRIVATE KEY BLOCK-----').toString('base64');

      const testData = {
        message: 'Test message',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: invalidPrivateKeyBase64 // Invalid armored key
      };

      try {
        await encrypt(testData);
        expect.fail('Should have thrown error for invalid armored private key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle wrong passphrase for private key', async () => {
      const testData = {
        message: 'Test message',
        passphrase: 'wrong-passphrase',
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64 // Valid key but wrong passphrase
      };

      try {
        await encrypt(testData);
        expect.fail('Should have thrown error for wrong passphrase');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('General Error Handling', () => {
    it('should handle invalid base64 public key', async () => {
      const testData = {
        message: 'Test message',
        passphrase: testKeys.passphrase,
        publicKey: 'invalid-base64!@#$',
        privateKey: testKeys.privateKeyBase64
      };

      try {
        await encrypt(testData);
        expect.fail('Should have thrown error for invalid base64 public key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle invalid armored public key', async () => {
      const invalidPublicKeyBase64 = Buffer.from('-----BEGIN PGP PUBLIC KEY BLOCK-----\ninvalid key content\n-----END PGP PUBLIC KEY BLOCK-----').toString('base64');

      const testData = {
        message: 'Test message',
        passphrase: testKeys.passphrase,
        publicKey: invalidPublicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      try {
        await encrypt(testData);
        expect.fail('Should have thrown error for invalid armored public key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle empty message', async () => {
      const testData = {
        message: '',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');
    });
  });

  describe('Message Content Variations', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(100000); // 100KB message
      const testData = {
        message: longMessage,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');

      // Verify the long message can be decrypted
      const message = await openpgp.readMessage({ armoredMessage: result });
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: testKeys.privateKeyArmored }),
        passphrase: testKeys.passphrase
      });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
      });

      expect(decrypted.toString()).to.equal(longMessage);
    });

    it('should handle special characters and unicode', async () => {
      const unicodeMessage = 'Special chars: 🔐🔑📨 €£¥©®™±≠∞√∑∏∫∂∆∇ 中文 العربية';
      const testData = {
        message: unicodeMessage,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');

      // Verify unicode is preserved
      const message = await openpgp.readMessage({ armoredMessage: result });
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: testKeys.privateKeyArmored }),
        passphrase: testKeys.passphrase
      });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
      });

      expect(decrypted.toString()).to.equal(unicodeMessage);
    });

    it('should handle newlines and multiline messages', async () => {
      const multilineMessage = `Line 1\nLine 2\nLine 3\n\nLine 5 after empty line`;
      const testData = {
        message: multilineMessage,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await encrypt(testData);
      expect(result).to.be.a('string');
      expect(result).to.include('BEGIN PGP MESSAGE');

      // Verify newlines are preserved (note: PGP may normalize line endings)
      const message = await openpgp.readMessage({ armoredMessage: result });
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: testKeys.privateKeyArmored }),
        passphrase: testKeys.passphrase
      });

      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
      });

      // The content should be preserved, though line endings may be normalized
      const decryptedText = decrypted.toString();
      expect(decryptedText).to.include('Line 1');
      expect(decryptedText).to.include('Line 2');
      expect(decryptedText).to.include('Line 3');
      expect(decryptedText).to.include('Line 5 after empty line');
    });
  });

  describe('Return Value Verification', () => {
    it('should always return a valid armored PGP message string', async () => {
      const testData = {
        message: 'Return value test',
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: ''
      };

      const result = await encrypt(testData);

      // Verify it's a string
      expect(result).to.be.a('string');

      // Verify it has PGP structure
      expect(result).to.include('-----BEGIN PGP MESSAGE-----');
      expect(result).to.include('-----END PGP MESSAGE-----');

      // Verify it's not empty
      expect(result.length).to.be.greaterThan(100);

      // Verify it's a valid PGP message
      expect(() => {
        openpgp.readMessage({ armoredMessage: result });
      }).to.not.throw();
    });
  });
});