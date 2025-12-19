# Claude Code Launcher for Obsidian

Launch Claude CLI directly from Obsidian with your current note automatically loaded for AI-assisted editing.

## Features

- **One-command launch** - Open Claude from the command palette
- **Automatic context** - Claude starts with your note already loaded
- **Vault exploration** - Terminal opens in your note's directory for easy wiki-link navigation
- **Zero configuration** - Detects Claude CLI automatically
- **New tab behavior** - Opens in new Terminal tab instead of new window

## Prerequisites

- **macOS** (uses Terminal.app and AppleScript)
- **Claude CLI** installed ([installation guide](https://docs.anthropic.com/claude-code))
- **Obsidian** desktop app v0.15.0+

## Installation

### For End Users

1. Download `main.js` and `manifest.json` from releases
2. Create plugin folder in your vault:
   ```bash
   mkdir -p /path/to/vault/.obsidian/plugins/obsidian-claude-code-plugin
   ```
3. Copy both files to the plugin folder
4. In Obsidian: Settings → Community Plugins → Refresh
5. Enable "Claude Code Launcher"

### For Development

**Initial setup:**
```bash
git clone <repo-url>
cd obsidian-claude-code-plugin
npm install
```

**Option 1: Symlink (recommended for active development)**
```bash
ln -s $(pwd) /path/to/test-vault/.obsidian/plugins/obsidian-claude-code-plugin
npm run dev  # Auto-rebuilds on file changes
```
Edit code → save → reload plugin in Obsidian to see changes.

**Option 2: Deploy script (for production vaults)**
```bash
npm run build
./deploy.sh /path/to/vault
```

Then reload the plugin in Obsidian.

## Usage

1. Open any markdown note in Obsidian
2. Open command palette (Cmd+P on macOS)
3. Search for "Open in Claude Code"
4. Press Enter

A new Terminal tab will open with Claude Code running, with your note already loaded.

## How It Works

The plugin:
1. Detects the active note's file path
2. Finds your Claude Code CLI installation
3. Launches Terminal.app in the note's directory
4. Starts Claude Code with the note loaded into context (using `@` prefix)

The note is immediately available in Claude's context window, and Claude Code can explore your vault structure via wiki links and relative paths.

## Troubleshooting

### "Claude Code CLI not found"

The plugin searches for both `claude-code` and `claude` binaries in:
- `/usr/local/bin/`
- `~/.local/bin/`
- `/opt/homebrew/bin/`
- Your system PATH

**Solution:** Install the Claude CLI from [https://docs.anthropic.com/claude-code](https://docs.anthropic.com/claude-code)

### "No active file"

**Solution:** Open and focus a note before running the command.

### "Active file is not a markdown file"

**Solution:** The plugin only works with `.md` files. Other file types are not supported.

### Terminal doesn't open / AppleScript errors

**Possible causes:**
- Terminal.app not found (should be default on macOS)
- System Events permissions not granted
- Special characters in file paths causing escaping issues

**Solution:**
1. Verify Terminal.app exists in `/Applications/Utilities/`
2. Grant Obsidian accessibility permissions: System Settings → Privacy & Security → Accessibility
3. Try renaming the file to avoid special characters

### Command works but Claude doesn't start

**Possible causes:**
- Claude CLI not in PATH
- Claude CLI requires authentication

**Solution:**
1. Run `which claude` or `which claude-code` in Terminal to verify installation
2. Try running Claude CLI manually first to complete any setup/authentication

## Limitations

- **macOS only** - Uses Terminal.app and AppleScript (no Windows/Linux support)
- **Markdown only** - Only works with `.md` files
- **Terminal.app only** - No iTerm2 or other terminal emulator support
- **Saved state** - Make sure to save your note before launching (unsaved changes won't be visible to Claude)

## Technical Details

**How it works:**
1. Detects active markdown file in Obsidian
2. Locates Claude CLI binary (`claude-code` or `claude`)
3. Generates shell command: `cd [note-directory] && claude "@[note-path]"`
4. Uses AppleScript to create new Terminal tab and execute command
5. Terminal opens in note's directory with the note loaded into Claude's context

**Security:**
- Paths are escaped to prevent shell injection
- Only operates on files within your vault
- Uses system Terminal.app (no external dependencies)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Issues and pull requests welcome. For major changes, please open an issue first to discuss.

## Author

Built by Palermo Spenano for seamless integration between Obsidian and Claude CLI.
