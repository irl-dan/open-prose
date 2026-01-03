# OpenProse

Language support for OpenProse (`.prose` files) - a domain-specific language for orchestrating AI agent sessions.

## Features

- **Syntax Highlighting**: Full syntax highlighting for keywords, strings, operators, comments, and discretion markers
- **Real-time Diagnostics**: Error and warning squiggles as you type
- **Comment Toggling**: Use `Ctrl+/` / `Cmd+/` to toggle line comments
- **Bracket Matching**: Automatic bracket matching and auto-closing
- **Indentation**: Smart indentation for Python-like block structures

## Usage

1. Create a file with `.prose` extension
2. The extension activates automatically
3. Write OpenProse code with full syntax highlighting
4. See errors and warnings in real-time

## Language Reference

For the complete language specification, see the [OpenProse Language Reference](../README.md).

## Installing Locally

1. `bun i`
2. `bun run generate-grammar`
3. `bun run package`
4. In VSCode/Cursor: `Cmd+Shift+P` → "Install from VSIX" → navigate to `vscode-extension/` → select `open-prose-0.1.0.vsix`

The `generate-grammar` script builds `syntaxes/prose.tmLanguage.json` from the plugin's parser tokens and validator constants. Run it after changing keywords, model names, or other language constants in the plugin.
