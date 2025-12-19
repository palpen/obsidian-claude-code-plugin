# Implementation Plan Corrections

**Date:** 2025-12-18
**For:** 2025-12-17-implementation-plan.md

## Task 1 - Project Setup: Add Missing File Contents

### Add tsconfig.json content:
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

### Add .gitignore content:
```
node_modules/
main.js
main.js.map
*.map
.DS_Store
```

### Update manifest.json specification:
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

---

## Task 5 - Claude Code Detection: Simplify to PATH-Only

**Replace entire implementation with:**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

private async detectClaudeCode(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('which claude-code');
    const path = stdout.trim();
    return path || null;
  } catch {
    return null;
  }
}
```

**Rationale:**
- Simpler implementation
- Relies on standard PATH lookup
- Avoids Electron/Node fs module edge cases
- Users should have claude-code in PATH anyway

---

## Task 7 - Path Escaping: Handle Shell + AppleScript

**Replace with two methods:**

```typescript
private escapeForShell(path: string): string {
  // Wrap in single quotes and escape any embedded single quotes
  // This handles: spaces, $vars, backslashes, special chars
  return `'${path.replace(/'/g, "'\\''")}'`;
}
```

**Note:** AppleScript outer quoting is handled by template string in Task 8.

---

## Task 8 - Terminal Launch: Use Improved Escaping

**Replace implementation with:**

```typescript
import { exec } from 'child_process';

private async launchTerminal(directory: string, notePath: string) {
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

**Changes:**
- Uses `escapeForShell()` for both paths
- Handles nested quoting correctly (AppleScript wraps shell command)

---

## Task 11 - Build & Test: Complete Build Configuration

### Update package.json build script:
```json
{
  "scripts": {
    "build": "esbuild main.ts --bundle --external:obsidian --outfile=main.js --platform=node --format=cjs --target=es2020",
    "dev": "npm run build -- --watch"
  }
}
```

### Enhanced Testing Steps:

**Before testing:**
0. Verify manifest.json structure is valid
1. Build plugin: `npm run build`
2. Check that main.js was created
3. Copy to test vault: `cp -r . ~/test-vault/.obsidian/plugins/claude-code/`
4. Enable in Obsidian Community Plugins settings
5. Open Obsidian Developer Console (Cmd+Option+I)
6. Check for plugin load errors in console

**Functional testing:**
7. Create test note in vault root
8. Run command via palette
9. Verify terminal opens in correct directory
10. Verify Claude Code starts with note path
11. Verify note is readable by Claude

**Edge case testing:**
12. Test with note in nested folder (e.g., `Projects/Notes/test.md`)
13. Test with note containing spaces (e.g., `My Test Note.md`)
14. Test with note containing apostrophe (e.g., `User's Guide.md`)
15. Test with no file open (should show notice)
16. Test with non-markdown file open (should show notice)
17. Test multiple launches in sequence

---

## Testing Checklist: Additional Test Cases

**Add these to the Testing Checklist section:**

### Path Edge Cases
- [ ] Note with parentheses in name (e.g., `Meeting (2025-12-18).md`)
- [ ] Note with ampersand (e.g., `Q&A.md`)
- [ ] Note with Unicode characters (e.g., `Notes—Today.md`)
- [ ] Very long note names (100+ characters)
- [ ] Vault path contains spaces (e.g., `/Users/name/My Vault/`)

### State Edge Cases
- [ ] Launch while note has unsaved changes (verify uses disk version)
- [ ] Launch from graph view (no active editor)
- [ ] Launch from search results
- [ ] Launch immediately after plugin reload

### Error Recovery
- [ ] Terminal.app not running (should launch it)
- [ ] Terminal.app already has many windows open
- [ ] claude-code removed from PATH between launches (cache invalidation)

### Performance
- [ ] First launch timing (cold start)
- [ ] Second launch timing (cached detection)
- [ ] Launch 10 times rapidly (no resource leaks)

---

## Updated Success Criteria

**Task 1:** All files created, npm install succeeds, no TypeScript errors

**Task 5:** Detection returns valid path or null, no exceptions thrown

**Task 7:** Escaping handles: spaces, quotes, $vars, backslashes, Unicode

**Task 8:** Terminal opens, correct directory, Claude receives quoted path correctly

**Task 11:** Plugin loads without errors, all edge case tests pass

---

## Implementation Notes

### Import statements needed in main.ts:
```typescript
import { Plugin, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);
```

### Type safety reminder:
- `getActiveFile()` returns `TFile | null`
- Always null-check before using file object
- Directory extraction can fail if vault adapter unavailable

### Debugging tips:
- Add `console.log` statements during development
- Use Obsidian Developer Console to see plugin logs
- Test escaping by manually running generated AppleScript
- Verify paths with `echo` before launching claude-code

---

## Changes Summary

| Task | Change Type | Reason |
|------|-------------|--------|
| 1 | Addition | Missing file contents |
| 5 | Simplification | Avoid fs module issues, use PATH only |
| 7 | Fix | Incomplete escaping, shell injection risk |
| 8 | Fix | Incorrect escaping usage |
| 11 | Enhancement | Complete build config, add testing steps |
| Testing | Addition | Missing edge cases for paths, state, errors |

---

## Next Steps

1. Review this document alongside original implementation plan
2. Update implementation plan with corrections, or
3. Use this as supplement when implementing
4. Run through complete testing checklist before considering done
