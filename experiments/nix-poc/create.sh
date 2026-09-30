#!/usr/bin/env bash
set -euo pipefail
task_dir=$(cd "$(dirname "$0")" && pwd)
name=${1:-nix-poc-$(date +%Y%m%d)-$(uuidgen | cut -c1-8 | tr '[:upper:]' '[:lower:]')}
case "$name" in nix-poc-*) ;; *) echo 'Use a new name starting with nix-poc-' >&2; exit 1 ;; esac
# No workspace argument: the sandbox cannot modify the host project.
# sbx create rejects an existing name; this script never reuses a sandbox.
sbx kit validate "$task_dir/kit"
sbx create --name "$name" --skills off --cpus 4 --memory 6g \
  --template docker/sandbox-templates:shell-docker@sha256:1560168ac5fb9ce23d413c878349334c5845c07e264cd675d7867f0c78ad1761 \
  shell --kit "$task_dir/kit"
printf '\nCreated %s\n' "$name"
printf 'Inspect: sbx exec %s bash -lc '\''nix --version; hello; cat ~/.config/nix-poc/settings.json'\''\n' "$name"
printf 'Run POC checks: sbx exec %s bash /home/agent/nix-poc/verify.sh\n' "$name"
printf 'Stop: sbx stop %s\n' "$name"
printf 'Remove: sbx rm %s\n' "$name"
