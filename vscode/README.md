# Flag for VS Code

Syntax highlighting for [Flag](https://github.com/FramaLuna/flag-lang), and with flagls, errors as you type, hover and go to definition.

## Requirements

- `flagc`, see the [Installation](https://github.com/FramaLuna/flag-lang#installation) of Flag
- `flagls`, from the [releases of flag-lsp](https://github.com/FramaLuna/flag-lsp/releases), in the same folder as `flagc` or in your `PATH`

flagls works on Linux and macOS. On Windows you get the highlighting.

## Settings

- `flag.server`: the flagls to run, `flagls` from your `PATH` if you don't set it. A relative path starts at the workspace folder
- `flag.exclude`: folders or files, relative to the workspace folder, that flagls leaves out
