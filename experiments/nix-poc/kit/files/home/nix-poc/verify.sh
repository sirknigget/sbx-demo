#!/usr/bin/env bash
set -euo pipefail
export USER="$(id -un)"
. /home/agent/.nix-profile/etc/profile.d/nix.sh
cd /home/agent/nix-poc
case "$(uname -m)" in aarch64) system=aarch64-linux ;; x86_64) system=x86_64-linux ;; *) exit 1 ;; esac
os_before=$(sha256sum /etc/os-release)
lock_before=$(sha256sum flake.lock)
test "$(jq -r .variant "$HOME/.config/nix-poc/settings.json")" = v1
first=$(cat activation-v1.path)
SECONDS=0
bash apply.sh v1
repeat_seconds=$SECONDS
test "$first" = "$(cat activation-v1.path)"
echo 'PASS: repeated application selects identical generation'
bash apply.sh v2
test "$(jq -r .variant "$HOME/.config/nix-poc/settings.json")" = v2
test "$(git config --get alias.poc)" = 'status --branch --short'
test "$first" != "$(cat activation-v2.path)"
echo 'PASS: configuration change creates a distinct generation'
"$first/activate"
test "$(jq -r .variant "$HOME/.config/nix-poc/settings.json")" = v1
test "$(git config --get alias.poc)" = 'status --short'
echo 'PASS: activating previous generation restores config'
# Meaningful drift test: an unmanaged regular file should be protected.
target="$HOME/.config/nix-poc/settings.json"
rm "$target"
printf '{"unmanaged":true}\n' > "$target"
if bash apply.sh v1 > collision.log 2>&1; then
  echo 'FAIL: activation overwrote unmanaged configuration' >&2
  exit 1
fi
test "$(cat "$target")" = '{"unmanaged":true}'
mv "$target" settings.unmanaged.json
bash apply.sh v1
echo 'PASS: collision fails safely and preserves the unmanaged file'
SECONDS=0
offline=$(nix build --offline --no-write-lock-file --no-update-lock-file --no-link \
  --print-out-paths ".#homeConfigurations.agent-$system-v1.activationPackage")
offline_seconds=$SECONDS
test "$offline" = "$first"
test "$(sha256sum flake.lock)" = "$lock_before"
test "$(sha256sum /etc/os-release)" = "$os_before"
echo 'PASS: cached build works offline; lock and base OS are unchanged'
nix develop --no-write-lock-file --no-update-lock-file -c bash -c \
  'test "$NIX_POC_PROJECT" = locked-development-shell; python3 --version; jq --version; rg --version | head -1; command -v python3'
echo 'PASS: project development shell runs locked tools'
generation_drv=$(nix path-info --derivation "$first")
nix-store --verify-path "$first"
nix-store --verify-path "$(readlink -f "$target")" "$(readlink -f "$HOME/.config/git/config")"
echo 'PASS: generation and generated configuration store integrity verified'
# Manifest is stable across independent sandboxes: no sandbox name or timestamp.
jq -n \
  --arg system "$system" \
  --arg generation "$first" \
  --arg derivation "$generation_drv" \
  --arg lock_sha256 "$(sha256sum flake.lock | cut -d ' ' -f1)" \
  --arg config_sha256 "$(sha256sum "$target" | cut -d ' ' -f1)" \
  --arg git_config_sha256 "$(sha256sum "$HOME/.config/git/config" | cut -d ' ' -f1)" \
  --arg nix "$(nix --version)" \
  --arg git "$(git --version)" \
  --arg jq "$(jq --version)" \
  --arg rg "$(rg --version | head -1)" \
  --arg hello "$(hello --version | head -1)" \
  '{system:$system,generation:$generation,derivation:$derivation,lock_sha256:$lock_sha256,config_sha256:$config_sha256,git_config_sha256:$git_config_sha256,versions:{nix:$nix,git:$git,jq:$jq,rg:$rg,hello:$hello}}' > manifest.json
du -sh /nix/store
printf 'repeat_seconds=%s\noffline_seconds=%s\n' "$repeat_seconds" "$offline_seconds"
cat manifest.json
