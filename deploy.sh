#!/bin/bash
# Deploy plugin to a vault

set -e

# Build the plugin
npm run build

# Get target vault path
TARGET_VAULT=${1:-"$HOME/Documents/vault"}
PLUGIN_DIR="$TARGET_VAULT/.obsidian/plugins/obsidian-claude-code-plugin"

# Create plugin directory and copy files
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json "$PLUGIN_DIR/"

echo "✓ Deployed to $TARGET_VAULT"
echo "  Reload the plugin in Obsidian to see changes"
