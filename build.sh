#!/bin/sh
set -eu
cd "$(dirname "$0")"
compiler=${1:-flagc}
exe=
case $(uname) in MINGW*|MSYS*|CYGWIN*) exe=.exe ;; esac
mkdir -p build
"$compiler" src/*.flg -o build/flagls$exe
sh tests/lsp.sh "$compiler"
echo "flagls: build/flagls$exe"
