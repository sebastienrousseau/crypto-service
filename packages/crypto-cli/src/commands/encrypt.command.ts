import encrypt from '@sebastienrousseau/crypto-lib/dist/lib/encrypt';

const args = process.argv.slice(2);
console.log(args);

const publicKeyBase64 = "-----BEGIN PGP PUBLIC KEY BLOCK-----xsBNBGKfERoBCADHy0YsJAljbB7fA2vrMLIiuz1UpZLUDTO5IuRFassmDNAU NKJIoeUHukrnu4UG4Cm8rRVywPDPc9TmUm3EpqLlcNjDOY4GgFlg0/wbPMSP HI0STGDD4A00oCp2u0tzFrU7 xW6FPb05wEOBKVocuvCt8NBMr/xmq28uWL7AcLT3/qtl1+ujz7UkUEBNibN2 8aZ8vNUPvSDp6M6I+MBr7gM2iGdZq82aGtEo0iWgzV/kwbHAnXFTVd/mpnTH ydJ4auW6Rrvszgfl43s8y1XEfi5iFHogcM2M+2iEgDtovMUTFEd8Gem/ABEB AAHNF0phbmUgRG9lIDxqYW5lQGRvZS5jb20+wsCKBBABCAAdBQJinxEaBAsJ BwgDFQgKBBYAAgECGQECGwMCHgEAIQkQPyH5zQOF4coWIQSaLUnMZc2bCOpH iAA/IfnNA4Xhyi1UCADDy7VhJLr/0Yt6xPTZzcdCbiYU72XZ5Gn1YT8SWT8M OZbKEVDVwwsMqy5KlvkMSchsMlyxBISs7uP6Xk3s3FOTImbdrKS2vG9oFgtV 01lhLNjr2u42P98v0MFCyMr+Ee6oKsU25WJJj6vV43ngd6oLDYHDdpaRCT/T 5bnWWkzU92Cdju1CMJN1t+qsU2C9z8piNKAhXesvJuCLSa2EP9whtDByd2oN AapRSHovBl2nJaXPgWMmdWHjOMqbFw+ng0e6+51DNeCk4pggdLRPQh6PvEwY xowfuFKrFScWZdYVSode0jJ+ti4YBtUpQZdw53EXXjfsDfkyTZnMfdHrR6oQ zsBNBGKfERoBCADWjrScvmzqtS76YH7cJz5rrZd/HROfU9F29AzE1F5Fa4zQ+753fplcGLMPLhCLwptlYNH8dlsQg6ufrpnKffAhgvVL56VSoPUSblvnsl3l DYXf44l0IpFsuUSPY2r7Ah0/RaAy3/mwTOXXwc6o36T806dyjt4cx3oi0yGM CgB9Hoot46RT8O51s1ojmwDu/w08mz0TwAhHP6xW9o5qccoBalUAre3pORRY VIMyUPcBbuMd4gDORtdXLS/EX1gjwzYLa2QQZMnr7Z4tJdO3eqNuGYhahTIL KF1To1dq5WAMYywJQn5SxsFvQSB3Bxu16UB1A/HRISSx2miYKp1TZSyJABEB AAHCwawEGAEIAAkFAmKfERoCGwIBVwkQPyH5zQOF4crAdCAEGQEIAAYFAmKf ERoAIQkQOcumz3b9vhEWIQSX2t8x1aJZ80Je8LU5y6bPdv2+EaD3CACpDgfX S3rxupMW2Cln6IdgjCsgTqaprS6JAtcFkqfi3L6hjWnVF9T/lThtUhany6ck Nb9LzFa7XQmC0yVDzzGDOEP9Opm2qYRwYC/n0mL6bDavLOC2CAMtkf7ZWN6n 0K+3inBNe8WwvpViXUW3uPMoDX71pCaDhCMfUXUHezSCwRJmwQSGBQHbNZRw HzukPVM8m3AU+jcrAFNile71ZguBuTi1SAc5/8vPShIeBLvhitQ5Ad9Bl3f9 ikBnIfR6BV/I+GOjGJDzFbMFBQ2rDpmgBUAyA82/dkUPxsCZTr4mEpZtR1p6 laZQ888LGleMZBrv9zSZaSxplYuJ+W46lpYRFiEEmi1JzGXNmwjqR4gAPyH5 zQOF4cr+uwf+I0s+tZ2yhOYzLncyTNnksBycjnE3QcxL436MHMadDYUABqxz wEmU83TC7Mgrhz+X/kZqN3LGIxyoX7t10ZKNoK+ZDHaGnK08iToBowYzf1vZ GouzWGlbpOML80fc5jshbLEZm7lAkFWlLM+rTyNyiMujyqBmQvIKZFe5K01I JSJMjmgPWRnJVdhMMFRcpAMpuK4T88ayMAxTipPHMjxC7GFgvnzBPL9vtxkg dL4DZDDnVKdu7bfRpWJCuHgl1bE8tYGAdc7uLaKnha4STgzqrB/JFyJUovUb Bkhv6TcDpEE0hG3sUnM2ChUFrULVEBBXorW1QIOVq/4yB859JEoAzg===+4mY-----END PGP PUBLIC KEY BLOCK-----";

const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
const publicKey = publicKeyBuffer.toString('utf-8');


if (args instanceof Array && args.length) {
  const data = {
    message: args[1],
    passphrase: String(args[3]),
    publicKey: publicKey,
  };

  async function run(): Promise<void> {
    const encryptMessage = await encrypt(data);
    console.log(encryptMessage);
  }
  run();
}

