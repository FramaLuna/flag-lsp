#!/bin/sh
set -eu
cd "$(dirname "$0")"
compiler=${1:-flagc}
mkdir -p build
"$compiler" src/*.flg -o build/flagls
sh tests/lsp.sh "$compiler"
echo "flagls: build/flagls"
