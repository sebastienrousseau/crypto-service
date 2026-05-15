/** Utility class for writing lines to stdout/stderr. */
export class writeUtils {
  // skipcq: JS-0327
  /**
   * Write a string followed by a newline to the output stream.
   * @param s - The string to write.
   * @param finalLine - If true, omit the trailing newline on non-TTY / Windows.
   * @param error - If true, write to stderr instead of stdout.
   */
  static writeLn(s: string, finalLine = false, error = false) {
    const stream = error ? process.stderr : process.stdout;
    if (finalLine && (process.platform === "win32" || !stream.isTTY)) {
      stream.write(s);
    } else {
      stream.write(`${s}\n`);
    }
  }
}
