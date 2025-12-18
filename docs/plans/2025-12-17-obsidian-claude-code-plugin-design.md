# Obsidian Claude Code Plugin Design

**Date:** 2025-12-17
**Status:** Design Complete

## Overview

An Obsidian plugin that launches Claude Code CLI in a new terminal window with the current note's context automatically loaded. Enables quick AI assistance on notes without manual file navigation.

## Goals

- One-command launch from Obsidian to Claude Code
- Claude starts with immediate note context
- Terminal opens in note's directory for vault exploration
- Zero configuration for standard installations

## Architecture

```
User in note.md
  → Triggers command (Cmd+P → "Open in Claude Code")
    → Plugin reads active file path
      → Detects claude-code binary location
        → Spawns new macOS Terminal with claude-code
          → Terminal opens in note's directory
            → Claude launched with note path argument
```

### Key Design Decisions

1. **New terminal per invocation** - No session reuse, keeps contexts isolated
2. **macOS only** - Simplified implementation using AppleScript + Terminal.app
3. **Note path as CLI argument** - Pass note file directly to claude-code
4. **Launch in note's directory** - Claude has full vault access via relative paths
5. **Zero configuration** - Smart detection, conventions over settings
6. **Silent execution** - No visual feedback, command just works
7. **Saved state only** - Uses current file on disk, no auto-save

## Components

### Command Registration

```typescript
export default class ClaudeCodePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'open-in-claude-code',
      name: 'Open in Claude Code',
      callback: () => this.openInClaudeCode()
    });
  }
}
```

- Accessible via command palette
- No default hotkey (user assignable)
- Works only when note is active

### Claude Code Detection

**Search order:**
1. `/usr/local/bin/claude-code`
2. `~/.local/bin/claude-code`
3. `/opt/homebrew/bin/claude-code` (Apple Silicon)
4. `which claude-code` (PATH lookup)

**Caching:** First successful detection cached in memory for performance

**Error states:**
- Not found → "Claude Code CLI not found. Install from https://docs.anthropic.com/claude-code"
- Not executable → "Claude Code found but not executable"
- Launch fails → "Failed to launch Claude Code"

### Terminal Launching

**Implementation:**
```typescript
const script = `
osascript -e 'tell application "Terminal"
  do script "cd '${noteDirectory}' && claude-code '${notePath}'"
  activate
end tell'
`;

exec(script);
```

**Process management:**
- Detached spawn (non-blocking)
- No stdout/stderr capture
- Terminal.app handles all display

**Path handling:**
- Extract directory with `path.dirname()`
- Escape special characters for AppleScript
- Quote paths with spaces
- Handle vault root edge case

### File Handling

**Active file detection:**
- Use `app.workspace.getActiveFile()`
- Exit gracefully if no file open
- Currently markdown-only (`.md` files)

**Note state:**
- Uses saved version on disk
- No auto-save before launch
- User responsible for saving changes first

## Project Structure

```
obsidian-claude-code-plugin/
├── main.ts          # Plugin entry point
├── manifest.json    # Obsidian plugin metadata
├── package.json     # Node dependencies
├── tsconfig.json    # TypeScript config
└── README.md        # Installation instructions
```

**Dependencies:**
- `obsidian` package (API types)
- TypeScript
- Node.js built-ins only (child_process, path)

**Build:**
- TypeScript → single `main.js` bundle
- esbuild or rollup
- Output to `.obsidian/plugins/` for development

## Execution Flow

```
1. User triggers command
   ↓
2. Get active file (exit if none)
   ↓
3. Extract note directory path
   ↓
4. Detect claude-code binary (cached after first run)
   ↓ (exit with error if not found)
5. Build AppleScript command
   - Escape special characters
   - Include note path as argument
   ↓
6. Execute with child_process.exec()
   ↓
7. Return immediately (non-blocking)
```

**Launch command:**
```bash
cd '/path/to/note/directory' && claude-code '/path/to/note.md'
```

## Edge Cases

**Handled:**
- No active file → Show notice, exit
- Claude Code not found → Error with install instructions
- Note in vault root → Use vault path as directory
- Special characters in path → Escape for shell safety
- Spaces in path → Proper quoting
- Terminal launch fails → Catch error, show notice

**Explicitly not handled (YAGNI):**
- Multiple vaults (uses active)
- Non-markdown files
- Concurrent launches
- Session persistence
- Claude API errors (Claude Code's responsibility)

## Testing Strategy

**Manual validation:**
- Create test note, run command
- Verify terminal opens in correct directory
- Verify Claude receives note path
- Test from nested vault folders
- Test from vault root
- Test with no file open (error case)
- Test with spaces/special chars in paths

**Success criteria:**
Terminal opens + Claude Code launches + note accessible + no errors

## Performance

- **First run:** ~50-100ms (detection + launch)
- **Subsequent runs:** ~20-30ms (cached detection)
- Non-blocking, returns immediately
- Terminal spawn handled by OS

## Installation (End Users)

1. Copy plugin folder to `.obsidian/plugins/`
2. Enable in Obsidian Community Plugins settings
3. Ensure `claude-code` CLI is installed and in PATH
4. Use command palette: "Open in Claude Code"

## Future Enhancements (Not in Scope)

- Settings UI for custom terminal app (iTerm2 support)
- Custom prompt templates
- Metadata inclusion (tags, frontmatter)
- Windows/Linux support
- Session reuse option
- Auto-save before launch

## References

- Obsidian Plugin API: https://github.com/obsidianmd/obsidian-api
- Claude Code CLI: https://docs.anthropic.com/claude-code
- macOS AppleScript Terminal control
