# VHS tape recipe for Crypto Service Suite demo
# Render with: make demo or vhs .github/demo.tape

Output .github/demo.gif

Set Shell "zsh"
Set FontSize 14
Set Width 960
Set Height 600
Set Padding 20
Set Framerate 30
Set Theme "Catppuccin Mocha"
Set WindowBar Colorful
Set WindowBarSize 40
Set TypingSpeed 35ms

# Setup local alias and clean prompt
Hide
Type "export PS1='%F{cyan}crypto-service%f %F{yellow}❯%f '"
Enter
Type "alias crypto-cli='node packages/crypto-cli/dist/cli.js'"
Enter
Type "clear"
Enter
Show

Sleep 600ms
Type "crypto-cli --version"
Sleep 400ms
Enter
Sleep 1.2s

Type "crypto-cli keygen -a ed25519"
Sleep 400ms
Enter
Sleep 1.5s

Type "crypto-cli hpke keygen -k x25519-ml-kem-768"
Sleep 400ms
Enter
Sleep 1.8s

Type "crypto-cli hash -a sha256 packages/crypto-lib/package.json"
Sleep 400ms
Enter
Sleep 1.5s

Type "crypto-cli --help"
Sleep 400ms
Enter
Sleep 2.5s
