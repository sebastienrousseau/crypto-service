# VHS tape recipe for the Crypto Service Suite demo
# Render with: make demo or vhs .github/demo.tape
# Needs a built CLI first: pnpm -r run build

Output .github/demo.gif

Set Shell "zsh"
Set FontSize 14
Set Width 1200
Set Height 460
Set Padding 20
Set Framerate 30
Set Theme "Catppuccin Mocha"
Set WindowBar Colorful
Set WindowBarSize 40
Set TypingSpeed 35ms
Set WaitPattern /❯$/
Set WaitTimeout 20s

# Work in a throwaway directory; keys are created mode 600.
Hide
Type `alias crypto-cli="node $PWD/packages/crypto-cli/dist/cli.js"`
Enter
Type `cd "$(mktemp -d)" && umask 077`
Enter
Type "export PS1='%F{cyan}crypto-service%f %F{yellow}❯%f '"
Enter
Type "clear"
Enter
Show

Sleep 600ms
Type "crypto-cli --version"
Sleep 400ms
Enter
Wait
Sleep 1.2s

Type "echo 'hello, post-quantum world' > note.txt"
Enter
Wait
Sleep 400ms
Type "crypto-cli hash -a blake3 note.txt"
Sleep 400ms
Enter
Wait
Sleep 1.5s

Type "crypto-cli keygen -a ml-dsa-65 --json > signer.json"
Sleep 400ms
Enter
Wait
Sleep 1.2s
Type "crypto-cli sign --key-file signer.json note.txt > note.sig"
Sleep 400ms
Enter
Wait
Sleep 1.2s
Type "crypto-cli verify --key-file signer.json --signature-file note.sig note.txt"
Sleep 400ms
Enter
Wait
Sleep 1.5s
Type "echo tampered | crypto-cli verify --key-file signer.json --signature-file note.sig; echo exit=$?"
Sleep 400ms
Enter
Wait
Sleep 1.8s

Type "head -c 32 /dev/urandom | xxd -p -c 64 > key.hex"
Enter
Wait
Sleep 400ms
Type "crypto-cli encrypt --key-file key.hex note.txt | tee box.b64 | crypto-cli decrypt --key-file key.hex"
Sleep 400ms
Enter
Wait
Sleep 1.8s
Type "cat box.b64"
Enter
Wait
Sleep 2.5s
