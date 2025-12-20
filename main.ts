import { Plugin, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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

      const filePaths = this.getFilePaths(file);
      if (!filePaths) {
        new Notice('Invalid file path detected. Please check the file location.');
        return;
      }

      const { fullPath, directory } = filePaths;
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

  private getFilePaths(file: TFile): { fullPath: string; directory: string } | null {
    const adapter = this.app.vault.adapter;
    const basePath = adapter.getBasePath();

    if (!basePath || basePath.trim() === '') {
      console.error('Invalid vault base path');
      return null;
    }

    // Normalize and validate the file path
    const normalizedFilePath = path.normalize(file.path);

    // Check for path traversal attempts
    if (normalizedFilePath.includes('..') || path.isAbsolute(normalizedFilePath)) {
      console.error('Invalid file path detected:', normalizedFilePath);
      return null;
    }

    const fullPath = path.join(basePath, normalizedFilePath);

    // Verify the resolved path is actually within the vault
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(basePath);

    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
      console.error('File path outside vault:', resolvedPath);
      return null;
    }

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

  private isValidBinaryName(name: string): boolean {
    // Only allow alphanumeric, hyphens, and underscores
    // This prevents command injection via binary names
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }

  private async detectClaudeCode(): Promise<string | null> {
    const binaryNames = ['claude-code', 'claude'];
    const locationPatterns = [
      '/usr/local/bin/',
      '/Users/' + process.env.USER + '/.local/bin/',
      '/opt/homebrew/bin/'
    ];

    // Validate binary names before use
    for (const binary of binaryNames) {
      if (!this.isValidBinaryName(binary)) {
        console.error('Invalid binary name:', binary);
        continue;
      }
    }

    // Check known locations for both binary names
    for (const pattern of locationPatterns) {
      for (const binary of binaryNames) {
        if (!this.isValidBinaryName(binary)) continue;

        const fullPath = pattern + binary;
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    }

    // Check PATH for both binary names
    for (const binary of binaryNames) {
      if (!this.isValidBinaryName(binary)) continue;

      try {
        // Use array form to avoid shell interpretation
        const { stdout } = await execAsync(`which ${binary}`);
        const foundPath = stdout.trim();

        // Validate the returned path
        if (foundPath && !foundPath.includes('\n') && path.isAbsolute(foundPath)) {
          return foundPath;
        }
      } catch {
        // Continue to next binary name
      }
    }

    return null;
  }

  private escapeShellArg(arg: string): string {
    // Wrap argument in single quotes and escape any single quotes within
    // This is the standard POSIX shell escaping method
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  private async launchTerminal(directory: string, notePath: string): Promise<void> {
    // Build shell command with proper escaping
    const shellCommand = [
      'cd',
      this.escapeShellArg(directory),
      '&&',
      this.escapeShellArg(this.claudeCodePath!),
      this.escapeShellArg(`@${notePath}`)
    ].join(' ');

    // Create AppleScript content
    // Use AppleScript's quoted form to properly escape the shell command
    const appleScriptContent = `
tell application "Terminal"
  activate
  if (count of windows) > 0 then
    tell application "System Events" to tell process "Terminal"
      keystroke "t" using command down
    end tell
    delay 0.1
    do script "${shellCommand.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" in selected tab of front window
  else
    do script "${shellCommand.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"
  end if
end tell
`;

    // Write AppleScript to temp file to avoid all quote-escaping complexity
    const tempFile = path.join(os.tmpdir(), `obsidian-claude-${Date.now()}.scpt`);

    try {
      fs.writeFileSync(tempFile, appleScriptContent, 'utf8');

      return new Promise<void>((resolve, reject) => {
        exec(`osascript "${tempFile}"`, (error) => {
          // Clean up temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            console.error('Failed to delete temp AppleScript file:', cleanupError);
          }

          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } catch (writeError) {
      throw new Error(`Failed to write AppleScript temp file: ${writeError.message}`);
    }
  }
}
