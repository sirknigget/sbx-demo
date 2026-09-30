#!/usr/bin/env bash

# Shared SessionStart example for Codex and Claude; stores no conversation data.
set -euo pipefail
printf 'Dotfiles demo: session started in %s at %s. Agent settings, hooks, and subagents are tracked under dotfiles/home/.\n' \
  "$PWD" "$(date -u '+%Y-%m-%d %H:%M UTC')"
