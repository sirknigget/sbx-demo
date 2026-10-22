#!/usr/bin/env bash
set -euo pipefail
project="$HOME/.pi/agent/extensions/token-dashboard"
cd "$project"
npm ci --ignore-scripts
npm run build
