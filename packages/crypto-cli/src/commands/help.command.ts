import { writeUtils } from "../utils/write.utils";
import { constants } from "../constants/index";
import { getVersion } from "../utils/version.utils";

const handleHelp = async (): Promise<void> => {
  let version = "";
  try {
    version = await getVersion();
  } catch {
    version = "v?";
  }
  writeUtils.writeLn("");
  writeUtils.writeLn(`${constants.CLI_TITLE} ${version}`);
  writeUtils.writeLn("");
  writeUtils.writeLn(constants.CLI_DESCRIPTION);
  writeUtils.writeLn("");
  writeUtils.writeLn("Available commands:");
  writeUtils.writeLn(`  generate  - ${constants.CLI_FN_1_DES}`);
  writeUtils.writeLn(`  encrypt   - ${constants.CLI_FN_2_DES}`);
  writeUtils.writeLn(`  decrypt   - ${constants.CLI_FN_3_DES}`);
  writeUtils.writeLn(`  reformat  - ${constants.CLI_FN_4_DES}`);
  writeUtils.writeLn(`  revoke    - ${constants.CLI_FN_5_DES}`);
  writeUtils.writeLn(`  session   - ${constants.CLI_FN_6_DES}`);
  writeUtils.writeLn(`  sign      - ${constants.CLI_FN_7_DES}`);
  writeUtils.writeLn(`  verify    - ${constants.CLI_FN_8_DES}`);
  writeUtils.writeLn("");
};

export default handleHelp;
