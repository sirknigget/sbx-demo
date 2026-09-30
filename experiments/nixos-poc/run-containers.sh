#!/usr/bin/env bash
set -euo pipefail
cd /home/agent/nixos-poc
archive=$(find "$(cat rootfs.path)/tarball" -name '*.tar.xz' -print -quit)
printf '%s\n' "$archive" > archive.path
ls -lh "$archive"
docker import "$archive" nixos-poc-base:20260930
docker run -d --name nixos-unprivileged-poc nixos-poc-base:20260930 /init
sleep 8
docker inspect nixos-unprivileged-poc --format '{{json .State}}'
docker logs --tail 45 nixos-unprivileged-poc
# This uses only the new sandbox's private Docker daemon, not the host daemon.
docker run -d --name nixos-systemd-poc --privileged --cgroupns=private \
  --tmpfs /run --tmpfs /tmp -p 127.0.0.1:18081:8080 \
  nixos-poc-base:20260930 /init
ready=false
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:18081/ > service-response.txt; then
    ready=true; break
  fi
  sleep 2
done
docker inspect nixos-systemd-poc --format '{{json .State}}'
docker logs --tail 60 nixos-systemd-poc
test "$ready" = true
docker exec nixos-systemd-poc /run/current-system/sw/bin/bash -lc \
  'set -e; cat /etc/os-release; cat /etc/nixos-poc.json; ps -p 1 -o comm=; id agent; systemctl is-active nixos-poc-http.service; nix --version; readlink /run/current-system'
cat service-response.txt
docker exec -u agent nixos-systemd-poc /run/current-system/sw/bin/bash -lc 'sudo -n id'
docker exec -u agent nixos-systemd-poc /run/current-system/sw/bin/bash -lc 'nix store ping --json'
docker exec nixos-systemd-poc /run/current-system/sw/bin/systemctl is-active nix-daemon.service
echo 'PASS: NixOS systemd and declarative service booted in a nested container'
docker image save nixos-poc-base:20260930 -o /home/agent/nixos-poc/nixos-base-image.tar
