#!/usr/bin/env bash
set -euo pipefail
cd /home/agent/nixos-poc
docker start nixos-systemd-poc
ready=false
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:18081/; then ready=true; break; fi
  sleep 2
done
test "$ready" = true
docker exec -u agent nixos-systemd-poc /run/current-system/sw/bin/bash -lc 'nix store ping --json'
docker exec nixos-systemd-poc /run/current-system/sw/bin/systemctl is-active nix-daemon.service
docker exec nixos-systemd-poc /run/current-system/sw/bin/tar -cpf - -C /run/wrappers . > wrappers.tar
docker commit nixos-systemd-poc nixos-poc-activated:20260930
tini_package=$(nix build --no-link --print-out-paths .#tini)
cp "$tini_package/bin/tini" ./tini
docker build -f Dockerfile.userland -t nixos-poc-userland:20260930 .
docker run --rm nixos-poc-userland:20260930 -lc \
  'set -e; id; cat /etc/os-release; cat /etc/nixos-poc.json; sudo -n id; command -v git curl bash; test -x /bin/sh; test -x /bin/bash'
docker image save nixos-poc-userland:20260930 -o /home/agent/nixos-poc/nixos-userland-image.tar
