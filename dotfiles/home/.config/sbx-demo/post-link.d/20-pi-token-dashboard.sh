#!/usr/bin/env bash
set -euo pipefail
project="$HOME/.pi/agent/extensions/token-dashboard"
cd "$project"
npm ci --no-audit --no-fund
npm run build
