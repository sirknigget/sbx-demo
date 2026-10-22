#!/usr/bin/env bash
set -euo pipefail
extension="$HOME/.pi/agent/extensions/token-dashboard"
if [[ -f "$extension/package-lock.json" ]]; then
  cd -P "$extension"
  npm ci --ignore-scripts
fi
