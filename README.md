# flag-lsp

Editor support for [Flag](https://github.com/FramaLuna/flag-lang): `flagls`, a language server, and the extension for VS Code.

- Errors as you type, with the notes of the compiler
- The warnings of the memory checker, when you turn them on
- Hover, with the type of a name or the declaration of a function
- Go to definition
- Syntax highlighting in VS Code

flagls asks `flagc` for all of it (with `-check`, `-overlay`, `-at` and `-memory`), so it says what the compiler says. It works on Linux, macOS and Windows.

## Installation

1. Install Flag, see its [Installation](https://github.com/FramaLuna/flag-lang#installation), with its `bin` folder in your `PATH`
2. Install the extension **Flag** in VS Code, from Extensions. It comes with flagls

You can also install `flag-0.2.0.vsix` from the [releases](https://github.com/FramaLuna/flag-lsp/releases): in Extensions, the `...` menu, Install from VSIX, or from a terminal

```sh
code --install-extension flag-0.2.0.vsix
```

### Settings
- `flag.memory`: also show the warnings of the memory checker, `flagc -memory`. It's off because it makes every check slower
- `flag.exclude`: folders or files, relative to the workspace folder, that flagls leaves out
- `flag.server`: the flagls to run instead of the one that comes with the extension. A relative path starts at the workspace folder

### Other editors
Any editor with an LSP client can run `flagls`, it talks through the standard input and output. Download `flagls-0.2.0-linux-x86_64.tar.gz`, `flagls-0.2.0-macos-arm64.tar.gz` or `flagls-0.2.0-windows-x86_64.tar.gz` from the [releases](https://github.com/FramaLuna/flag-lsp/releases) and put `flagls` in the same `bin` folder as `flagc`. flagls runs the `flagc` next to it, or the one in your `PATH`.

It checks a file together with every `.flg` in its folder, like `flagc folder` does, or alone when that folder has more than one `main`. With `"memory": true` in the `initializationOptions` it also sends the warnings of `flagc -memory`.

## Build from source

```sh
./build.sh path/to/flagc
```

It builds `build/flagls` and runs its test. On Windows run it from the MSYS2 UCRT64 shell, like Flag.
