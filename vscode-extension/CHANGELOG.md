# Changelog

All notable changes to the OpenProse extension will be documented in this file.

## [0.1.0] - 2024-01-02

### Added

- Initial release
- Syntax highlighting for all OpenProse constructs:
  - Keywords (session, agent, block, parallel, if, loop, etc.)
  - Strings (single-line, triple-quoted, with interpolation)
  - Comments
  - Discretion markers (`**...**` and `***...***`)
  - Operators (`->`, `|`, `=`, `:`)
  - Numbers
  - Model values (sonnet, opus, haiku)
- Real-time error and warning diagnostics
- Language configuration:
  - Comment toggling with `#`
  - Bracket matching and auto-closing
  - Smart indentation for block structures
