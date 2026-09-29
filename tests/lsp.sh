#!/bin/sh
compiler=${1:-flagc}
server=build/flagls
out=build/tests
mkdir -p "$out"
case $compiler in */*) PATH=$(cd "$(dirname "$compiler")" && pwd):$PATH ;; esac
export PATH
rm -rf build/tests/lsp_ws
mkdir -p build/tests/lsp_ws/app build/tests/lsp_ws/leak build/tests/lsp_ws/scripts build/tests/lsp_ws/skip
ws=$(cd build/tests/lsp_ws && pwd)
uri=file://$ws
case $(uname) in MINGW*|MSYS*|CYGWIN*)
    ws=$(cd build/tests/lsp_ws && pwd -W)
    uri=file:///$(printf %s "$ws" | sed 's/:/%3A/')
    ;;
esac
printf 'func main() -> i32:\n    x := helper(2)\n    print(area(x, "wide"))\n    return 0\n' > "$ws/app/main.flg"
printf 'func helper(n: i32) -> i32:\n    return n * 2\n\nfunc area(r: f32) -> f32:\n    return r * r\n\nfunc area(w: i32, h: i32) -> i32:\n    return w * h\n' > "$ws/app/util.flg"
printf 'func main() -> i32:\n    names: &list[i32]\n    append(names, 1)\n    return 0\n' > "$ws/leak/main.flg"
printf 'func main() -> i32:\n    return 0\n' > "$ws/scripts/a.flg"
printf 'func main() -> i32:\n    return 1\n' > "$ws/scripts/b.flg"
printf 'func main() -> i32:\n    return nope\n' > "$ws/skip/x.flg"
msg() { printf 'Content-Length: %d\r\n\r\n%s' "$(printf '%s' "$1" | wc -c)" "$1"; }
{
    msg '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"rootUri":"'"$uri"'","initializationOptions":{"exclude":["skip/"],"memory":true}}}'
    msg '{"jsonrpc":"2.0","method":"initialized","params":{}}'
    sleep 3
    msg '{"jsonrpc":"2.0","id":2,"method":"textDocument/hover","params":{"textDocument":{"uri":"'"$uri"'/app/main.flg"},"position":{"line":1,"character":4}}}'
    msg '{"jsonrpc":"2.0","id":3,"method":"textDocument/definition","params":{"textDocument":{"uri":"'"$uri"'/app/main.flg"},"position":{"line":2,"character":11}}}'
    msg '{"jsonrpc":"2.0","method":"textDocument/didOpen","params":{"textDocument":{"uri":"'"$uri"'/app/main.flg","languageId":"flag","version":1,"text":"func main() -> i32:\n    x := helper(2)\n    print(area(x, 3), \"π\", x)\n    return 0\n"}}}'
    sleep 3
    msg '{"jsonrpc":"2.0","id":4,"method":"textDocument/hover","params":{"textDocument":{"uri":"'"$uri"'/app/main.flg"},"position":{"line":2,"character":11}}}'
    msg '{"jsonrpc":"2.0","id":5,"method":"textDocument/hover","params":{"textDocument":{"uri":"'"$uri"'/app/main.flg"},"position":{"line":2,"character":27}}}'
    msg '{"jsonrpc":"2.0","id":6,"method":"shutdown"}'
    msg '{"jsonrpc":"2.0","method":"exit"}'
} | "$server" | tr -d '\r' | sed -e 's/Content-Length: [0-9]*$//' -e '/^$/d' -e "s|$uri|file://WS|g" > "$out/lsp.got"
echo >> "$out/lsp.got"
if cmp -s "$out/lsp.got" tests/lsp.out; then
    exit 0
fi
echo "FAIL lsp: wrong answers"
diff tests/lsp.out "$out/lsp.got"
exit 1
