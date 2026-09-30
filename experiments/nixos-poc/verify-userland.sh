#!/usr/bin/env bash
# Prepared diagnostic only: direct sbx creation failed, so this script was not
# executed in the POC. Its final PASS line is conditional on future execution.
set -euo pipefail
id
grep '^ID=' /etc/os-release
grep -q '^ID=nixos$' /etc/os-release
jq -e '.managedSystem == true' /etc/nixos-poc.json
sudo -n id
git --version
curl --version | head -1
printf 'outer-init='; ps -p 1 -o comm=
if systemctl is-active nixos-poc-http.service; then
  echo 'Unexpected systemd service: inspect before interpreting this test' >&2
  exit 1
fi
echo 'EXPECTED: sbx controls init; NixOS systemd service is not running'
if nix store info --json; then
  echo 'Nix daemon already available'
else
  echo 'EXPECTED: no systemd means the daemon needs another supervisor'
fi
sudo -n /sw/bin/nix-daemon --daemon > /tmp/nixos-poc-nix-daemon.txt 2>&1 &
daemon_ready=false
for attempt in $(seq 1 15); do
  if nix store info --json; then daemon_ready=true; break; fi
  sleep 1
done
test "$daemon_ready" = true
nix eval --expr '1 + 1'
curl -fsS --max-time 20 https://cache.nixos.org/nix-cache-info
echo 'PASS: NixOS userland runs directly in sbx; a separate Nix daemon works'
