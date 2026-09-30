#!/usr/bin/env bash

# Transfer agent state through the ignored shared staging directory.
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "$0")" && pwd -P)
if [[ $# -ne 1 || "$1" != export && "$1" != import ]]; then
  printf 'Usage: copy-state.sh export|import\n' >&2
  exit 2
fi
exec python3 "$script_dir/agent-state-copy.py" "$1" "$HOME" "$script_dir/staging/files"
