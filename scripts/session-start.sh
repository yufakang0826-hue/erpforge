#!/usr/bin/env bash
# ERPForge Session Start Hook
# Reads and outputs the using-erpforge meta-skill on session start

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
META_SKILL="$PLUGIN_ROOT/skills/using-erpforge.md"

if [[ -f "$META_SKILL" ]]; then
  cat "$META_SKILL"
else
  echo "[ERPForge] Warning: Meta-skill not found at $META_SKILL"
  exit 1
fi
