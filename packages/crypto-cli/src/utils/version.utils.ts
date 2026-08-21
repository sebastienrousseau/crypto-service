import { readFile } from "fs/promises";
import { join, normalize } from "path";

/** Cached package version string, populated on first call to getVersion. */
let version = "";

/**
 * Read and return the package version string (e.g. "v0.0.3") from package.json.
 * The result is cached after the first call.
 */
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
