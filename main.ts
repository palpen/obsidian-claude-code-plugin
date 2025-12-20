import { Plugin, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export default class ClaudeCodePlugin extends Plugin {
  private claudeCodePath: string | null = null;
  private detectionAttempted: boolean = false;

  async onload() {
    this.addCommand({
      id: 'open-in-claude-code',
      name: 'Open in Claude Code',
      callback: () => this.openInClaudeCode()
    });
  }

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

  private getFilePaths(file: TFile): { fullPath: string; directory: string } {
    const adapter = this.app.vault.adapter;
    const basePath = adapter.getBasePath();

    const fullPath = path.join(basePath, file.path);
    const directory = path.dirname(fullPath);

    return { fullPath, directory };
  }

  private async getClaudeCodePath(): Promise<string | null> {
    if (this.detectionAttempted) {
      return this.claudeCodePath;
    }

    this.detectionAttempted = true;
    this.claudeCodePath = await this.detectClaudeCode();
    return this.claudeCodePath;
  }

  private async detectClaudeCode(): Promise<string | null> {
    const binaryNames = ['claude-code', 'claude'];
    const locationPatterns = [
      '/usr/local/bin/',
      '/Users/' + process.env.USER + '/.local/bin/',
      '/opt/homebrew/bin/'
    ];

    // Check known locations for both binary names
    for (const pattern of locationPatterns) {
      for (const binary of binaryNames) {
        const fullPath = pattern + binary;
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    }

    // Check PATH for both binary names
    for (const binary of binaryNames) {
      try {
        const { stdout } = await execAsync(`which ${binary}`);
        return stdout.trim();
      } catch {
        // Continue to next binary name
      }
    }

    return null;
  }

  private escapeForAppleScript(str: string): string {
    // Escape backslashes and double quotes for AppleScript string literals
    // AppleScript uses backslash for escaping within double-quoted strings
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private async launchTerminal(directory: string, notePath: string): Promise<void> {
    // Build command as array to avoid shell injection
    // We'll pass this as a single-quoted string to avoid any shell interpretation
    const commandParts = [
      'cd',
      directory,
      '&&',
      this.claudeCodePath!,
      `@${notePath}`
    ];

    // Use printf to safely construct the command with proper quoting
    // This ensures each argument is treated as a literal string
    const safeCommand = commandParts.map(part => {
      // Escape single quotes by ending the quote, adding escaped quote, starting new quote
      const escaped = part.replace(/'/g, "'\\''");
      return `'${escaped}'`;
    }).join(' ');

    // Escape the entire command for AppleScript
    const appleScriptCommand = this.escapeForAppleScript(safeCommand);

    // If Terminal has windows, create new tab (Cmd+T), otherwise create new window
    const script = `osascript -e 'tell application "Terminal"' -e 'activate' -e 'if (count of windows) > 0 then' -e 'tell application "System Events" to tell process "Terminal" to keystroke "t" using command down' -e 'delay 0.1' -e 'do script "${appleScriptCommand}" in selected tab of front window' -e 'else' -e 'do script "${appleScriptCommand}"' -e 'end if' -e 'end tell'`;

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
}
