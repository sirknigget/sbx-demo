#!/usr/bin/env bash
set -euo pipefail
export USER="$(id -un)"
. "$HOME/.nix-profile/etc/profile.d/nix.sh"
cd /home/agent/nix-poc
variant=${1:-v1}
case "$variant" in v1|v2) ;; *) echo 'Expected v1 or v2' >&2; exit 1 ;; esac
case "$(uname -m)" in aarch64) system=aarch64-linux ;; x86_64) system=x86_64-linux ;; *) exit 1 ;; esac
# Fail if lock is absent or would need modification. Input updates are explicit.
test -f flake.lock
activation=$(nix build --no-write-lock-file --no-update-lock-file --no-link --print-out-paths \
  ".#homeConfigurations.agent-$system-$variant.activationPackage")
"$activation/activate"
printf '%s\n' "$activation" > "/home/agent/nix-poc/activation-$variant.path"
