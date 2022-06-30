import handleDecrypt from './decrypt.command';
import handleEncrypt from './encrypt.command';
import handleGenerate from './generate.command';
import handleHelp from './help.command';
import handleReformat from './reformat.command';
import handleRevoke from './revoke.command';
import handleSession from './session.command';
import handleSign from './sign.command';
import handleVerify from './verify.command';

export const Command = {
  handleDecrypt,
  handleEncrypt,
  handleGenerate,
  handleHelp,
  handleReformat,
  handleRevoke,
  handleSession,
  handleSign,
  handleVerify,
}
