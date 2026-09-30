#!/usr/bin/env bash
set -euo pipefail
task_dir=$(cd "$(dirname "$0")" && pwd)
name=${1:-nixos-poc-$(date +%Y%m%d)-$(uuidgen | cut -c1-8 | tr '[:upper:]' '[:lower:]')}
case "$name" in nixos-poc-*) ;; *) echo 'Use a new name starting with nixos-poc-' >&2; exit 1 ;; esac
# This local template was produced by the separate Nix POC. A fresh sandbox is
# always created; an existing name is rejected. No host workspace is mounted.
sbx create --name "$name" --skills off --cpus 4 --memory 6g --pull never \
  --template nix-poc-repro:20260930 shell
sbx exec "$name" mkdir -p /home/agent/nixos-poc
for source in flake.nix flake.lock container.nix run-containers.sh adapt-image.sh Dockerfile.userland; do
  sbx cp "$task_dir/$source" "$name:/home/agent/nixos-poc/$source"
done
sbx exec "$name" bash -lc \
  'set -eu; cd /home/agent/nixos-poc; nix build --no-update-lock-file --no-link --print-out-paths .#rootfs > rootfs.path; bash run-containers.sh'
printf '\nCreated %s with NixOS in its private Docker engine.\n' "$name"
printf 'Inspect: sbx exec %s bash -lc '\''docker start nixos-systemd-poc; docker exec nixos-systemd-poc /run/current-system/sw/bin/bash -lc "cat /etc/os-release; systemctl is-active nixos-poc-http.service"'\''\n' "$name"
printf 'Stop: sbx stop %s\n' "$name"
printf 'Remove: sbx rm %s\n' "$name"
