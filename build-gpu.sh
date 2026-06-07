#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

cc_bin="${CC:-cc}"

if ! command -v "$cc_bin" >/dev/null 2>&1; then
  echo "C compiler not found: $cc_bin" >&2
  echo "macOS: run 'xcode-select --install'" >&2
  echo "Ubuntu/Debian: run 'sudo apt install build-essential'" >&2
  exit 1
fi

"$cc_bin" -O2 rpow-gpu-miner.c -o rpow-gpu-miner
chmod +x rpow-gpu-miner
ln -sf rpow-gpu-miner rpow-gpu-miner.exe

echo "Built ./rpow-gpu-miner"
echo "Linked ./rpow-gpu-miner.exe for rpow-cli.js compatibility"
echo "Run: node rpow-cli.js mine --count 1 --engine gpu"
