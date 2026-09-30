#!/usr/bin/env bash
set -euo pipefail
# Run as agent, inside a disposable Docker Sandbox. No host installation.
if [ "$(id -u)" = 0 ]; then
  echo 'Run as the sandbox agent user, not root.' >&2
  exit 1
fi
if ! command -v xz >/dev/null; then
  # Creation may have no apt index yet; the template's startup also refreshes
  # it in the background. Retry briefly rather than deleting another lock.
  apt_ready=false
  for attempt in $(seq 1 30); do
    if sudo apt-get update; then apt_ready=true; break; fi
    sleep 2
  done
  test "$apt_ready" = true
  sudo apt-get -o DPkg::Lock::Timeout=120 install -y --no-install-recommends xz-utils
fi
version=2.35.2
case "$(uname -m)" in
  aarch64) system=aarch64-linux; checksum=4d0302a2910f5eec1c33b8deef634f04899a75737e7001ec49908d003ae5efda ;;
  x86_64) system=x86_64-linux; checksum=0c3960a9792331a22081c3c7a5d8465db9b17c50b3acdf18587fa4c6f2cb1158 ;;
  *) echo 'Unsupported architecture' >&2; exit 1 ;;
esac
if [ ! -x "$HOME/.nix-profile/bin/nix" ]; then
  temp_dir=$(mktemp -d)
  trap 'rm -rf "$temp_dir"' EXIT
  archive="nix-$version-$system.tar.xz"
  curl --fail --location --retry 3 --proto '=https' --tlsv1.2 \
    "https://releases.nixos.org/nix/nix-$version/$archive" -o "$temp_dir/$archive"
  printf '%s  %s\n' "$checksum" "$temp_dir/$archive" | sha256sum -c -
  tar -xJf "$temp_dir/$archive" -C "$temp_dir"
  "$temp_dir/nix-$version-$system/install" --no-daemon --no-channel-add --no-modify-profile
fi
# sbx non-interactive exec does not always populate USER; Nix's profile requires it.
export USER="$(id -un)"
. "$HOME/.nix-profile/etc/profile.d/nix.sh"
test "$(nix --version)" = "nix (Nix) $version"
mkdir -p "$HOME/.config/nix"
# The isolation probe verified Linux namespace build isolation in this runtime.
# Single-user store ownership is still weaker than a daemon-owned store.
cat > "$HOME/.config/nix/nix.conf" <<'EOF'
experimental-features = nix-command flakes
sandbox = true
build-users-group =
accept-flake-config = false
EOF
# Docker configures Git after kit installation with `git config --global`.
# Ensure it targets a mutable template-owned file, instead of the Home Manager
# XDG config symlink. Git reads both; only the XDG config is Nix-managed.
test -e "$HOME/.gitconfig" || touch "$HOME/.gitconfig"
# Docker template hook is also sourced by non-interactive Bash execs.
hook=/etc/sandbox-persistent.sh
if ! grep -q '# nix-poc environment' "$hook"; then
  cat >> "$hook" <<'EOF'

# nix-poc environment
export USER="$(id -un)"
if [ -r /home/agent/.nix-profile/etc/profile.d/nix.sh ]; then
  . /home/agent/.nix-profile/etc/profile.d/nix.sh
fi
if [ -r /home/agent/.nix-profile/etc/profile.d/hm-session-vars.sh ]; then
  . /home/agent/.nix-profile/etc/profile.d/hm-session-vars.sh
fi
EOF
fi
nix --version
