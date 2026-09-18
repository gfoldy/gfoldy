#!/usr/bin/env bash
# Iron Log — one-command sync + run.
#
# Because every code change is pushed from Claude Code (you don't hand-edit
# locally), this script hard-resets your working copy to EXACTLY match the
# pushed branch, then starts Expo. That sidesteps the whole class of problems
# we hit setting up:
#   * `git pull` silently no-ops when the local branch is stale  -> we reset instead
#   * a leftover Metro server holding port 8081 serves old JS     -> we kill it first
#   * package.json changed but node_modules is stale             -> we reinstall only then
#
# Usage:  ironlog            (sync, then start Expo with a clean cache)
#         ironlog --fast     (skip the cache clear — a bit quicker)
#
# NOTE: this DISCARDS any local edits in the repo. That's intended for this
# workflow (Claude pushes, you view). If you ever start editing locally, stop
# using the hard-reset and tell Claude.

set -euo pipefail

BRANCH="claude/iron-log-pwa-gs80zz"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
MONO="$ROOT/iron-log-native"

echo "→ Killing any stale Metro / Expo servers…"
pkill -f "expo start"        2>/dev/null || true
pkill -f "react-native/cli"  2>/dev/null || true
pkill -f "metro"             2>/dev/null || true

echo "→ Syncing to origin/$BRANCH …"
OLD="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo none)"
git -C "$ROOT" fetch origin "$BRANCH"
git -C "$ROOT" checkout -q "$BRANCH" 2>/dev/null || true
git -C "$ROOT" reset --hard "origin/$BRANCH"
NEW="$(git -C "$ROOT" rev-parse HEAD)"
echo "  now at $(git -C "$ROOT" rev-parse --short HEAD)"

# Reinstall dependencies only when a manifest actually changed.
if [ "$OLD" = "none" ] || git -C "$ROOT" diff --name-only "$OLD" "$NEW" | grep -qE 'package(-lock)?\.json'; then
  echo "→ Dependencies changed — running npm install…"
  ( cd "$MONO" && npm install )
fi

cd "$MONO/apps/mobile"
if [ "${1:-}" = "--fast" ]; then
  echo "→ Starting Expo…"
  exec npx expo start
else
  echo "→ Starting Expo (clean cache)…"
  exec npx expo start -c
fi
