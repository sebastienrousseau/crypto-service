export class writeUtils {
  static writeLn(s: string, finalLine = false, error = false) {
    const stream = error ? process.stderr : process.stdout;
    if (finalLine && (process.platform === "win32" || !stream.isTTY)) {
      stream.write(s);
    } else {
      stream.write(s + "\n");
    }
  }
}
