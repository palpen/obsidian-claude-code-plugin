# Implementation Plan: Obsidian Claude Code Plugin

**Date:** 2025-12-17 (Updated: 2025-12-18)
**Design Doc:** [2025-12-17-obsidian-claude-code-plugin-design.md](./2025-12-17-obsidian-claude-code-plugin-design.md)

## Implementation Tasks

### 1. Project Setup

**Task:** Set up project structure (package.json, tsconfig.json, manifest.json, .gitignore)

**Files to create:**

**package.json:**
```json
{
  "name": "obsidian-claude-code",
  "version": "1.0.0",
  "description": "Launch Claude Code CLI with current note as context",
  "main": "main.js",
  "scripts": {
    "build": "esbuild main.ts --bundle --external:obsidian --outfile=main.js --platform=node --format=cjs --target=es2020",
    "dev": "npm run build -- --watch"
  },
  "keywords": ["obsidian", "claude", "ai"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "obsidian": "latest",
    "typescript": "latest",
    "esbuild": "latest"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["main.ts"]
}
```

**manifest.json:**
```json
{
  "id": "obsidian-claude-code",
  "name": "Claude Code",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Launch Claude Code CLI with current note as context",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourusername",
  "isDesktopOnly": true
}
```

**.gitignore:**
```
node_modules/
main.js
main.js.map
*.map
.DS_Store
```

**Success:** Files created, `npm install` runs without errors, no TypeScript errors

---

### 2. Plugin Skeleton

**Task:** Create main.ts with plugin skeleton and required imports

**Implementation:**
```typescript
import { Plugin, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export default class ClaudeCodePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'open-in-claude-code',
      name: 'Open in Claude Code',
      callback: () => this.openInClaudeCode()
    });
  }

  async openInClaudeCode() {
    // TODO: implementation
    new Notice('Command triggered');
  }
}
```

**Success:** Plugin structure compiles, command appears in palette

---

### 3. Active File Detection

**Task:** Implement getActiveFile() wrapper with error handling

**Implementation:**
```typescript
private getActiveMarkdownFile(): TFile | null {
  const file = this.app.workspace.getActiveFile();

  if (!file) {
    new Notice('No active file');
    return null;
  }

  if (file.extension !== 'md') {
    new Notice('Active file is not a markdown file');
    return null;
  }

  return file;
}
```

**Success:** Returns TFile or null, shows appropriate notices

---

### 4. Path Extraction

**Task:** Extract directory and file paths from TFile

**Implementation:**
```typescript
private getFilePaths(file: TFile): { fullPath: string; directory: string } {
  const adapter = this.app.vault.adapter;
  const basePath = adapter.getBasePath();

  const fullPath = path.join(basePath, file.path);
  const directory = path.dirname(fullPath);

  return { fullPath, directory };
}
```

**Success:** Returns correct absolute paths for vault files

---

### 5. Claude Code Detection

**Task:** Implement Claude Code binary detection using PATH lookup

**Implementation:**
```typescript
private async detectClaudeCode(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('which claude-code');
    const claudePath = stdout.trim();
    return claudePath || null;
  } catch {
    return null;
  }
}
```

**Rationale:** Simplified PATH-only approach avoids filesystem module edge cases in Electron environment. Users should have claude-code in PATH anyway.

**Success:** Finds claude-code if installed in PATH, returns null otherwise

---

### 6. Detection Caching

**Task:** Add caching to avoid repeated detection

**Implementation:**
```typescript
export default class ClaudeCodePlugin extends Plugin {
  private claudeCodePath: string | null = null;
  private detectionAttempted: boolean = false;

  private async getClaudeCodePath(): Promise<string | null> {
    if (this.detectionAttempted) {
      return this.claudeCodePath;
    }

    this.detectionAttempted = true;
    this.claudeCodePath = await this.detectClaudeCode();
    return this.claudeCodePath;
  }
}
```

**Success:** First call searches PATH, subsequent calls use cached value

---

### 7. Path Escaping

**Task:** Safely escape paths for shell execution within AppleScript

**Implementation:**
```typescript
private escapeForShell(path: string): string {
  // Wrap in single quotes and escape any embedded single quotes
  // Handles: spaces, $vars, backslashes, special chars, Unicode
  return `'${path.replace(/'/g, "'\\''")}'`;
}
```

**Note:** Single-quote wrapping protects from all shell metacharacters. Embedded single quotes are escaped by ending the quote, adding escaped quote, and reopening.

**Success:** Handles spaces, quotes, special characters, Unicode correctly

---

### 8. Terminal Launch

**Task:** Launch Terminal.app with claude-code via AppleScript

**Implementation:**
```typescript
private async launchTerminal(directory: string, notePath: string): Promise<void> {
  const escapedDir = this.escapeForShell(directory);
  const escapedNote = this.escapeForShell(notePath);

  const script = `osascript -e 'tell application "Terminal"
    do script "cd ${escapedDir} && claude-code ${escapedNote}"
    activate
  end tell'`;

  return new Promise<void>((resolve, reject) => {
    exec(script, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
```

**Success:** Terminal opens in correct directory with claude-code running

---

### 9. Error Handling

**Task:** Add comprehensive error handling with user-friendly notices

**Implementation:**
```typescript
async openInClaudeCode() {
  try {
    const file = this.getActiveMarkdownFile();
    if (!file) return;

    const claudePath = await this.getClaudeCodePath();
    if (!claudePath) {
      new Notice('Claude Code CLI not found. Install from https://docs.anthropic.com/claude-code');
      return;
    }

    const { fullPath, directory } = this.getFilePaths(file);
    await this.launchTerminal(directory, fullPath);

  } catch (error) {
    new Notice('Failed to launch Claude Code: ' + error.message);
    console.error('Claude Code launch error:', error);
  }
}
```

**Success:** All errors caught, user sees helpful messages, errors logged to console

---

### 10. Command Registration

**Task:** Wire up complete command implementation

**Implementation:**
- Integrate all components into openInClaudeCode()
- Ensure proper async/await flow
- Verify error paths work correctly
- Add class properties for caching

**Success:** Command executes full flow end-to-end

---

### 11. Build & Test

**Task:** Configure build system and test manually in real Obsidian environment

**Pre-testing validation:**
0. Verify manifest.json structure is valid (id, name, version, minAppVersion)
1. Build plugin: `npm run build`
2. Check that main.js was created
3. Check for TypeScript compilation errors

**Installation:**
4. Copy to test vault: `cp -r . ~/test-vault/.obsidian/plugins/claude-code/`
5. Open Obsidian
6. Enable in Community Plugins settings
7. Open Developer Console (Cmd+Option+I)
8. Check for plugin load errors in console

**Functional testing:**
9. Create test note in vault root
10. Run command via palette (Cmd+P → "Open in Claude Code")
11. Verify terminal opens in correct directory
12. Verify Claude Code starts with note path
13. Verify note is readable by Claude

**Edge case testing:**
14. Test with note in nested folder (e.g., `Projects/Notes/test.md`)
15. Test with note containing spaces (e.g., `My Test Note.md`)
16. Test with note containing apostrophe (e.g., `User's Guide.md`)
17. Test with note containing parentheses (e.g., `Meeting (2025-12-18).md`)
18. Test with note containing ampersand (e.g., `Q&A.md`)
19. Test with note containing Unicode (e.g., `Notes—Today.md`)
20. Test with vault path containing spaces (e.g., `/Users/name/My Vault/`)
21. Test with no file open (should show notice)
22. Test with non-markdown file open (should show notice)
23. Test multiple launches in sequence
24. Test launch from graph view (no active editor)

**Success:** Plugin works in real Obsidian environment, all edge cases pass

---

### 12. Documentation

**Task:** Write README with installation and usage instructions

**Sections:**
- Overview (what the plugin does)
- Prerequisites (Claude Code CLI installed, macOS only)
- Installation steps (manual install to .obsidian/plugins/)
- Usage (command palette)
- Troubleshooting (common issues: CLI not found, permissions, etc.)
- Development (building from source, npm scripts)
- Limitations (macOS only, Terminal.app only, markdown only)

**Success:** Users can install and use plugin following README

---

## Testing Checklist

### Core Functionality
- [ ] Command appears in command palette
- [ ] Shows notice when no file open
- [ ] Shows notice when non-markdown file open
- [ ] Shows notice when Claude Code not installed
- [ ] Terminal opens in correct directory
- [ ] Claude Code receives note path correctly
- [ ] Note content is readable by Claude

### Path Variations
- [ ] Works with notes in vault root
- [ ] Works with notes in nested folders
- [ ] Works with notes in deeply nested folders (3+ levels)
- [ ] Works with vault path containing spaces

### Filename Edge Cases
- [ ] Handles spaces in filename (e.g., `My Note.md`)
- [ ] Handles apostrophes (e.g., `User's Guide.md`)
- [ ] Handles parentheses (e.g., `Meeting (2025).md`)
- [ ] Handles ampersands (e.g., `Q&A.md`)
- [ ] Handles Unicode characters (e.g., `Notes—Today.md`)
- [ ] Handles very long filenames (100+ characters)
- [ ] Handles multiple special chars combined

### State Edge Cases
- [ ] Launch while note has unsaved changes (uses disk version)
- [ ] Launch from graph view (no active editor)
- [ ] Launch from search results view
- [ ] Launch immediately after plugin reload
- [ ] Multiple launches work (independent sessions)

### Error Recovery
- [ ] Terminal.app not running (should launch it)
- [ ] Terminal.app already has many windows open
- [ ] Graceful failure with helpful error messages

### Performance
- [ ] First launch timing acceptable (cold start)
- [ ] Second launch timing acceptable (cached detection)
- [ ] Rapid sequential launches work (10+ times)
- [ ] No memory leaks from repeated launches

---

## Risk Mitigation

**Risk:** Path escaping edge cases with unusual characters
**Mitigation:** Single-quote shell escaping handles all metacharacters. Test with comprehensive set of problematic filenames.

**Risk:** AppleScript execution failures
**Mitigation:** Wrap in try-catch, show user-friendly error, log full error to console for debugging.

**Risk:** Claude Code not in PATH
**Mitigation:** Error message includes install instructions link.

**Risk:** User doesn't have Terminal.app
**Mitigation:** Acceptable - Terminal.app is macOS default, plugin is macOS-only.

**Risk:** Electron/Node.js compatibility issues
**Mitigation:** Use only standard Node.js APIs (child_process, path). Avoid direct fs access.

---

## Implementation Notes

### Complete import list for main.ts:
```typescript
import { Plugin, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);
```

### Type safety considerations:
- `getActiveFile()` returns `TFile | null` - always null-check
- `adapter.getBasePath()` should never fail but wrap in error handling
- All async operations wrapped in try-catch

### Debugging tips:
- Use `console.log` during development
- Check Obsidian Developer Console for all plugin logs
- Test escaping manually: `echo [escaped-command]`
- Verify generated AppleScript before running

---

## Out of Scope

The following features are explicitly NOT included in v1.0:

- Windows/Linux support (macOS only)
- Custom terminal selection (iTerm2, Warp, etc.)
- Settings UI for configuration
- Session reuse (each launch = new terminal)
- Auto-save before launch (user's responsibility)
- Custom prompts/templates passed to Claude
- Context menu integration
- Hotkey assignment (user can assign manually)
- Support for non-markdown files

These may be considered for future versions based on user feedback.
