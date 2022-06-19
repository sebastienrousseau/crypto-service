import generate from '../../src/commands/generate.command';
import chai from "chai";
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const { expect } = chai;

const data = {
  rsaBits: 2048,
  curve: '',
  email: 'jane@doe.com',
  keyExpirationTime: 0,
  format: 'armored',
  name: 'Jane Doe',
  passphrase: '123456789abcdef',
  date: new Date(),
  type: 'rsa',
  userIDs: [{ name: 'Jane Doe', email: 'jane@doe.com'}]
};

describe('generateKey', function () {
  it('should generate a key', async function () {
    const test = generate(data);
    await expect(test).to.eventually.be.fulfilled;
  });
});

describe('generateKey rsaBits', function () {
  it('should fail for invalid rsaBits (KeyOptions: rsaBits)', async function () {
    const rsaBits = 2046;
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith(/rsaBits should be at least 2047/);
  });
});

describe('generateKey EllipticCurveName', function () {
  it('should fail for invalid curve (KeyOptions: EllipticCurveName)', async function () {
    const curve = 'jane@doe.com';
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith;
  });
});

describe('generateKey userIDs', function () {
  it('should fail for invalid user email address (KeyOptions: userIDs)', async function () {
    const email = 'wrongemailformat.com';
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith(/Invalid user ID format/);
  });
});

describe('generateKey keyExpirationTime', function () {
  it('should fail for invalid keyExpirationTime (KeyOptions: keyExpirationTime)', async function () {
    const keyExpirationTime = 0 - 3;
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith;
  });
});

describe('generateKey format', function () {
  it('should fail for invalid format (KeyOptions: format)', async function () {
    const format = 'abcdef123456789';
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith;
  });
});

describe('generateKey user name', function () {
  it('should fail for invalid user name (KeyOptions: userIDs)', async function () {
    const name = '';
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith;
  });
});

describe('generateKey passphrase', function () {
  it('should fail for invalid passphrase (KeyOptions: passphrase)', async function () {
    const passphrase = 'abcdef123456789';
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith;
  });
});

describe('generateKey type', function () {
  it('should fail for invalid type (KeyOptions: type)', async function () {
    const type = "123456789";
    const test = generate(data);
    await expect(test).to.eventually.be.rejectedWith;
  });
});

describe('generateKey - unit tests', () => {
  it('should have default params set', async () => {
    const opt = {
      rsaBits: 2048,
      curve: '',
      email: 'jane@doe.com',
      keyExpirationTime: 0,
      format: 'armored',
      name: 'Jane Doe',
      passphrase: '123456789abcdef',
      signature: true,
      type: 'rsa',
      date: new Date(),
      userIDs: [{ name, email }]
    };
    return await generate(opt).then(async function () {
      for (const key of [opt]) {
        expect(key).to.exist;
        expect(key.rsaBits).to.equal(2048);
        expect(key.curve).to.equal('');
        expect(key.email).to.equal('jane@doe.com');
        expect(key.keyExpirationTime).to.equal(0);
        expect(key.format).to.equal('armored');
        expect(key.name).to.equal('Jane Doe');
        expect(key.passphrase).to.equal('123456789abcdef');
        expect(key.signature).to.equal(true);
        expect(key.type).to.equal('rsa');
      }
    });
  });
});
