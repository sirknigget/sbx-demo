#!/usr/bin/env bash

# Moves only OMP's database and optional private environment through staging/.
# Runs inside old and new sandboxes while they share the mounted workspace.
# Keeps credentials and runtime data out of Git and out of the Docker image.
set -euo pipefail

# Resolves the mounted dotfiles directory, independent of the current directory.
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
staging="$script_dir/staging/omp"
mode=${1:-}
if [[ $# -ne 1 || "$mode" != export && "$mode" != import ]]; then
  printf 'Usage: copy-state.sh export|import\n' >&2
  exit 2
fi

# Transfers a private environment file only when one exists.
copy_env() {
  local source=$1 destination=$2
  [[ -f "$source" ]] || return 0
  mkdir -p -- "$(dirname -- "$destination")"
  install -m 600 -- "$source" "$destination"
  printf 'copied OMP environment\n'
}

# Uses SQLite backup for the database and checks the destination is not in use.
if [[ "$mode" == export ]]; then
  mkdir -p -m 700 -- "$staging"
  rm -f -- "$staging/agent.db" "$staging/.env"
  if [[ -f "$HOME/.omp/agent/agent.db" ]]; then
    python3 "$script_dir/omp-db-copy.py" "$HOME/.omp/agent/agent.db" "$staging/agent.db"
    printf 'exported OMP database\n'
  fi
  copy_env "$HOME/.omp/.env" "$staging/.env"
else
  if [[ -f "$staging/agent.db" ]]; then
    if lsof -t "$HOME/.omp/agent/agent.db" "$HOME/.omp/agent/agent.db-wal" "$HOME/.omp/agent/agent.db-shm" >/dev/null 2>&1; then
      printf 'Stop OMP before importing its database.\n' >&2
      exit 1
    fi
    python3 "$script_dir/omp-db-copy.py" "$staging/agent.db" "$HOME/.omp/agent/agent.db"
    printf 'imported OMP database\n'
  fi
  copy_env "$staging/.env" "$HOME/.omp/.env"
fi
