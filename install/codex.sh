#!/usr/bin/env bash
# ERPForge installer for OpenAI Codex
# Usage: curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/codex.sh | bash

set -euo pipefail

ERPFORGE_VERSION="${ERPFORGE_VERSION:-main}"
INSTALL_DIR="${HOME}/.codex/plugins/erpforge"

echo "Installing ERPForge for Codex..."

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

# Create codex instructions integration
CODEX_INSTRUCTIONS="${HOME}/.codex/instructions.md"

if [[ -f "$CODEX_INSTRUCTIONS" ]] && grep -q "ERPForge" "$CODEX_INSTRUCTIONS"; then
  echo "Codex instructions already configured."
else
  mkdir -p "$(dirname "$CODEX_INSTRUCTIONS")"
  echo "" >> "$CODEX_INSTRUCTIONS"
  echo "## ERPForge Skills Framework" >> "$CODEX_INSTRUCTIONS"
  echo "When working on ERP projects, read and follow: ${INSTALL_DIR}/skills/using-erpforge.md" >> "$CODEX_INSTRUCTIONS"
fi

# Verify installation
if [[ -f "$INSTALL_DIR/.claude-plugin/plugin.json" ]]; then
  echo ""
  echo "ERPForge installed successfully!"
  echo "Location: $INSTALL_DIR"
  echo ""
  echo "ERPForge skills are now available for Codex."
else
  echo "Installation failed. Please check the output above."
  exit 1
fi
