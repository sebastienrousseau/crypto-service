import { promises as fs } from "fs";
import path from "path";

/**
 * Read armored key material from a file path. Resolved relative to the
 * caller's CWD so users can pass `./mykey.asc`.
 */
export async function readArmored(p: string): Promise<string> {
  const resolved = path.resolve(p);
  return fs.readFile(resolved, "utf8");
}

/**
 * Write armored key/ciphertext/signature output to disk, creating parent
 * directories as needed.
 */
export async function writeArmored(p: string, contents: string): Promise<void> {
  const resolved = path.resolve(p);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, contents, "utf8");
}
