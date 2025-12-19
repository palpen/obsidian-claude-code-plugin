# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-12-18

### Added
- Initial release
- Command palette integration: "Open in Claude Code"
- Automatic Claude CLI detection (supports both `claude` and `claude-code` binaries)
- Smart binary search across common installation locations and PATH
- Path escaping for safe shell execution
- New Terminal tab behavior (opens in tab instead of new window)
- Markdown file support
- Works with notes in any vault location (root or nested folders)
- Zero-configuration setup

### Technical
- TypeScript implementation
- Obsidian Plugin API integration
- AppleScript-based Terminal.app control
- Path validation and shell injection protection
