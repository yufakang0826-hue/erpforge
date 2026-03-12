#!/usr/bin/env bash
# ERPForge installer for Cursor
# Usage: curl -fsSL https://raw.githubusercontent.com/yufakang0826-hue/erpforge/main/install/cursor.sh | bash

set -euo pipefail

ERPFORGE_VERSION="${ERPFORGE_VERSION:-main}"
INSTALL_DIR="${HOME}/.cursor/plugins/erpforge"

echo "Installing ERPForge for Cursor..."

# Clean previous installation
if [[ -d "$INSTALL_DIR" ]]; then
  echo "Removing previous installation..."
  rm -rf "$INSTALL_DIR"
fi

# Clone the repository
echo "Downloading ERPForge (${ERPFORGE_VERSION})..."
git clone --depth 1 --branch "$ERPFORGE_VERSION" \
  https://github.com/yufakang0826-hue/erpforge.git "$INSTALL_DIR" 2>/dev/null || \
git clone --depth 1 \
  https://github.com/yufakang0826-hue/erpforge.git "$INSTALL_DIR"

# Make scripts executable
chmod +x "$INSTALL_DIR/scripts/"*.sh

# Create .cursorrules integration
CURSORRULES="${HOME}/.cursor/.cursorrules"
ERPFORGE_MARKER="# ERPForge Skills Framework"

if [[ -f "$CURSORRULES" ]] && grep -q "$ERPFORGE_MARKER" "$CURSORRULES"; then
  echo "Cursor rules already configured."
else
  echo "" >> "$CURSORRULES"
  echo "$ERPFORGE_MARKER" >> "$CURSORRULES"
  echo "# When working on ERP projects, read and follow: ${INSTALL_DIR}/skills/using-erpforge.md" >> "$CURSORRULES"
fi

# Verify installation
if [[ -f "$INSTALL_DIR/.claude-plugin/plugin.json" ]]; then
  echo ""
  echo "ERPForge installed successfully!"
  echo "Location: $INSTALL_DIR"
  echo ""
  echo "Restart Cursor to activate ERPForge skills."
else
  echo "Installation failed. Please check the output above."
  exit 1
fi
