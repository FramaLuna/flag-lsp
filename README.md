# flag-lsp

Editor support for [Flag](https://github.com/FramaLuna/flag-lang): `flagls`, a language server, and the extension for VS Code.

- Errors as you type, with the notes of the compiler
- Hover, with the type of a name or the declaration of a function
- Go to definition
- Syntax highlighting in VS Code

flagls asks `flagc` for all of it (with `-check`, `-overlay` and `-at`), so it says what the compiler says. It works on Linux and macOS.

## Installation

1. Install Flag, see its [Installation](https://github.com/FramaLuna/flag-lang#installation)
2. Download `flagls-0.1.0-linux-x86_64.tar.gz` or `flagls-0.1.0-macos-arm64.tar.gz` from the [releases](https://github.com/FramaLuna/flag-lsp/releases) and put `flagls` in the same `bin` folder as `flagc`. flagls runs the `flagc` next to it, or the one in your `PATH`
3. Install `flag-0.1.0.vsix` from the same release in VS Code: in Extensions, the `...` menu, Install from VSIX, or from a terminal

```sh
code --install-extension flag-0.1.0.vsix
```

### Settings
- `flag.server`: the flagls to run, `flagls` from your `PATH` if you don't set it. A relative path starts at the workspace folder
- `flag.exclude`: folders or files, relative to the workspace folder, that flagls leaves out

### Other editors
Any editor with an LSP client can run `flagls`, it talks through the standard input and output. It checks a file together with every `.flg` in its folder, like `flagc folder` does, or alone when that folder has more than one `main`.

## Build from source

```sh
./build.sh path/to/flagc
```

It builds `build/flagls` and runs its test.
