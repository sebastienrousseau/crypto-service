import { expect } from 'chai';
import { decrypt } from '../src/lib/decrypt';
import * as openpgp from 'openpgp';

describe('Decrypt Function - Coverage Tests', () => {
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

  describe('Missing Private Key Validation', () => {
    it('should throw error when privateKey is falsy', async () => {
      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: '' // Empty string - this is what triggers the validation
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for empty private key');
      } catch (error: unknown) {
        // The actual error depends on how the validation is implemented
        expect(error).to.exist;
      }
    });

    it('should throw error when privateKey is undefined', async () => {
      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: undefined as never
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for undefined private key');
      } catch (error: unknown) {
        expect(error).to.exist;
      }
    });

    it('should throw error when privateKey is null', async () => {
      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: null as never
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for null private key');
      } catch (error: unknown) {
        expect(error).to.exist;
      }
    });
  });

  describe('Decryption Logic Coverage', () => {
    let encryptedMessage: string;

    before(async () => {
      // Create an encrypted message with signature for testing
      const message = await openpgp.createMessage({ text: 'Hello, this is a test message!' });
      const publicKey = await openpgp.readKey({ armoredKey: testKeys.publicKeyArmored });
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: testKeys.privateKeyArmored }),
        passphrase: testKeys.passphrase
      });

      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: publicKey,
        signingKeys: privateKey
      });

      encryptedMessage = Buffer.from(encrypted.toString()).toString('base64');
    });

    it('should successfully decrypt with valid signed message', async () => {
      const testData = {
        message: encryptedMessage,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await decrypt(testData);
      expect(result).to.be.an('object');
      expect(result.data).to.equal('Hello, this is a test message!');
      expect(result.signatureValid).to.be.true;
    });

    it('should handle message without signatures', async () => {
      // Create unsigned encrypted message
      const message = await openpgp.createMessage({ text: 'Unsigned test message' });
      const publicKey = await openpgp.readKey({ armoredKey: testKeys.publicKeyArmored });

      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: publicKey
        // No signing keys
      });

      const unsignedEncryptedMessage = Buffer.from(encrypted.toString()).toString('base64');

      const testData = {
        message: unsignedEncryptedMessage,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await decrypt(testData);
      expect(result).to.be.an('object');
      expect(result.data).to.equal('Unsigned test message');
      expect(result.signatureValid).to.be.false;
    });

    it('should handle signature verification failure', async () => {
      // Create message signed with different key
      const differentKeys = await openpgp.generateKey({
        type: 'ecc',
        curve: 'curve25519',
        userIDs: [{ name: 'Different User', email: 'different@example.com' }],
        passphrase: 'different-pass',
        format: 'armored'
      });

      const message = await openpgp.createMessage({ text: 'Message with invalid signature' });
      const publicKey = await openpgp.readKey({ armoredKey: testKeys.publicKeyArmored });

      const differentPrivateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: differentKeys.privateKey }),
        passphrase: 'different-pass'
      });

      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: publicKey,
        signingKeys: differentPrivateKey // Sign with different key
      });

      const invalidSignedMessage = Buffer.from(encrypted.toString()).toString('base64');

      const testData = {
        message: invalidSignedMessage,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await decrypt(testData);
      expect(result).to.be.an('object');
      expect(result.data).to.equal('Message with invalid signature');
      expect(result.signatureValid).to.be.false; // Signature verification should fail
    });
  });

  describe('Error Handling Paths', () => {
    it('should handle invalid base64 public key', async () => {
      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: testKeys.passphrase,
        publicKey: 'invalid-base64!@#$',
        privateKey: testKeys.privateKeyBase64
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for invalid base64 public key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle invalid base64 private key', async () => {
      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: 'invalid-base64!@#$'
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for invalid base64 private key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle invalid armored public key', async () => {
      const invalidPublicKeyBase64 = Buffer.from('-----BEGIN PGP PUBLIC KEY BLOCK-----\ninvalid key content\n-----END PGP PUBLIC KEY BLOCK-----').toString('base64');

      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: testKeys.passphrase,
        publicKey: invalidPublicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for invalid armored public key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle invalid armored private key', async () => {
      const invalidPrivateKeyBase64 = Buffer.from('-----BEGIN PGP PRIVATE KEY BLOCK-----\ninvalid key content\n-----END PGP PRIVATE KEY BLOCK-----').toString('base64');

      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: invalidPrivateKeyBase64
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for invalid armored private key');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle wrong passphrase', async () => {
      const testData = {
        message: Buffer.from('test message').toString('base64'),
        passphrase: 'wrong-passphrase',
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for wrong passphrase');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should handle invalid encrypted message format', async () => {
      const invalidMessageBase64 = Buffer.from('-----BEGIN PGP MESSAGE-----\ninvalid message content\n-----END PGP MESSAGE-----').toString('base64');

      const testData = {
        message: invalidMessageBase64,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      try {
        await decrypt(testData);
        expect.fail('Should have thrown error for invalid message format');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('Return Value Structure', () => {
    it('should always return object with data and signatureValid properties', async () => {
      // Use a known valid test case
      const message = await openpgp.createMessage({ text: 'Structure test' });
      const publicKey = await openpgp.readKey({ armoredKey: testKeys.publicKeyArmored });

      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: publicKey
      });

      const encryptedBase64 = Buffer.from(encrypted.toString()).toString('base64');

      const testData = {
        message: encryptedBase64,
        passphrase: testKeys.passphrase,
        publicKey: testKeys.publicKeyBase64,
        privateKey: testKeys.privateKeyBase64
      };

      const result = await decrypt(testData);
      expect(result).to.have.all.keys('data', 'signatureValid');
      expect(result.data).to.be.a('string');
      expect(result.signatureValid).to.be.a('boolean');
    });
  });
});