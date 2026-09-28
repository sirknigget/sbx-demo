#!/usr/bin/env bash

# Transfers only OMP database and private environment data between sandboxes.
# Keeps copied state under the shared, ignored staging directory.
# Uses a consistent SQLite snapshot instead of copying a live database file.
set -euo pipefail

# Uses paths inside the mounted demo checkout and the current sandbox home.
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
staging="$script_dir/staging/files/.omp"
source_db="$HOME/.omp/agent/agent.db"
staged_db="$staging/agent/agent.db"
mode=${1:-}
if [[ $# -ne 1 || "$mode" != export && "$mode" != import ]]; then
  printf 'Usage: copy-state.sh export|import\n' >&2
  exit 2
fi

# Copies the optional private environment with owner-only permissions.
copy_env() {
  local source=$1 destination=$2
  [[ -f "$source" ]] || return 0
  mkdir -p -- "$(dirname -- "$destination")"
  install -m 600 -- "$source" "$destination"
  printf 'copied OMP environment\n'
}

# Requires a stopped destination database before any import changes.
preflight_import() {
  [[ -f "$staged_db" ]] || return 0
  command -v lsof >/dev/null 2>&1 || {
    printf 'Error: lsof is required before importing an OMP database.\n' >&2
    return 1
  }
  local open_pids
  open_pids=$(lsof -t "$source_db" "$source_db-wal" "$source_db-shm" 2>/dev/null || true)
  if [[ -n "$open_pids" ]]; then
    printf 'Error: Stop OMP before importing its database.\n' >&2
    return 1
  fi
}

# Removes stale staged OMP files before taking a new snapshot.
if [[ "$mode" == export ]]; then
  install -d -m 700 -- "$script_dir/staging/files" "$staging" "$staging/agent"
  rm -f -- "$staged_db" "$staging/.env"
  if [[ -f "$source_db" ]]; then
    python3 "$script_dir/omp-db-copy.py" export "$source_db" "$staged_db"
    printf 'exported OMP database\n'
  fi
  copy_env "$HOME/.omp/.env" "$staging/.env"
else
  preflight_import
  if [[ -f "$staged_db" ]]; then
    python3 "$script_dir/omp-db-copy.py" import "$staged_db" "$source_db"
    printf 'imported OMP database\n'
  fi
  copy_env "$staging/.env" "$HOME/.omp/.env"
fi
