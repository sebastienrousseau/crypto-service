import { readFile } from "fs/promises";
import { join, normalize } from "path";

let version = "";

export const getVersion = async () => {
  if (version) {
    return version;
  }

  const packageJsonPath = normalize(join(__dirname, "../../package.json"));
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, { encoding: "utf-8" }),
  );

  /* c8 ignore next -- package.json always has version field */
  const versionStr = packageJson["version"] || "unknown";

  version = `v${versionStr}`;
  return version;
};
