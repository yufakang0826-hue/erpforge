#!/usr/bin/env bash
# ERPForge installer for Claude Code
# Usage: curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/claude-code.sh | bash

set -euo pipefail

ERPFORGE_VERSION="${ERPFORGE_VERSION:-main}"
INSTALL_DIR="${HOME}/.claude/plugins/erpforge"

echo "Installing ERPForge for Claude Code..."

# Clean previous installation
if [[ -d "$INSTALL_DIR" ]]; then
  echo "Removing previous installation..."
  rm -rf "$INSTALL_DIR"
fi

# Clone the repository
echo "Downloading ERPForge (${ERPFORGE_VERSION})..."
git clone --depth 1 --branch "$ERPFORGE_VERSION" \
  https://github.com/anthropics/erpforge.git "$INSTALL_DIR" 2>/dev/null || \
git clone --depth 1 \
  https://github.com/anthropics/erpforge.git "$INSTALL_DIR"

# Make scripts executable
chmod +x "$INSTALL_DIR/scripts/"*.sh

# Verify installation
if [[ -f "$INSTALL_DIR/.claude-plugin/plugin.json" ]]; then
  echo ""
  echo "ERPForge installed successfully!"
  echo "Location: $INSTALL_DIR"
  echo ""
  echo "Restart Claude Code to activate ERPForge skills."
else
  echo "Installation failed. Please check the output above."
  exit 1
fi
