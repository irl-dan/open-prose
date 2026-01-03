# OpenProse Development Repository

This is the development monorepo for OpenProse. It contains the backend services, landing page, development tools, and references the plugin as a submodule.

**Looking for the language itself?** See [openprose/prose](https://github.com/openprose/prose) — the Claude Code plugin with the language specification and examples.

## Repository Structure

```
open-prose/
├── prose/                   # SUBMODULE → github.com/openprose/prose
│   ├── skills/open-prose/   # The skill (SKILL.md, interpreter.md, prose.md)
│   └── examples/            # 27 ready-to-use workflows
├── packages/
│   └── core/                # @openprose/core - parser, validator, compiler, LSP
├── api/                     # Backend API
├── landing/                 # Website (prose.md)
├── infra/                   # Infrastructure (Pulumi)
├── guidance/                # CEO interviews and design decisions
├── TENETS.md                # Core principles
├── CEO_PREFERENCES.md       # Synthesized preferences
└── ELEGANT_SIMPLIFICATION.md # Architecture plan
```

## The Plugin (Submodule)

The OpenProse skill lives in a separate repository so Claude Code can clone it standalone:

```bash
# Clone with submodule
git clone --recursive git@github.com:openprose/open-prose.git

# Or if already cloned:
git submodule update --init
```

### Working with the Submodule

```bash
# Edit files in prose/
vim prose/skills/open-prose/interpreter.md

# Commit and push plugin changes
cd prose
git add . && git commit -m "Update"
git push
cd ..

# Update submodule reference in main repo
git add prose
git commit -m "Update prose submodule"
```

## Packages

### @openprose/core

The classical TypeScript implementation of the language. Used by dev tools, not the plugin.

```bash
cd packages/core
npm install
npm test
npm run build
```

**Exports:**
- Parser (lexer, AST)
- Validator (semantic validation)
- Compiler (canonical form expansion)
- LSP (Language Server Protocol for IDE support)

**Consumers:**
- VS Code extension
- Web IDE
- API validation endpoint
- CLI for developers

## API

Backend services for the OpenProse platform.

```bash
cd api
npm install
npm run dev
```

## Landing Page

The website at [prose.md](https://prose.md).

```bash
cd landing
npm install
npm run dev
```

## Development

### Prerequisites

- Node.js 18+
- Bun (optional, for faster TypeScript execution)
- Git with submodule support

### Setup

```bash
git clone --recursive git@github.com:openprose/open-prose.git
cd open-prose
```

### Testing the Plugin

```bash
# Run examples through the skill
cd prose/examples
# Use Claude Code to execute .prose files
```

### Testing the TypeScript Implementation

```bash
cd packages/core
npm test
```

## Key Documents

| Document | Purpose |
|----------|---------|
| [TENETS.md](TENETS.md) | Core principles guiding all decisions |
| [CEO_PREFERENCES.md](CEO_PREFERENCES.md) | Synthesized preferences from design interviews |
| [ELEGANT_SIMPLIFICATION.md](ELEGANT_SIMPLIFICATION.md) | Architecture plan for the two-file skill |

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [openprose/prose](https://github.com/openprose/prose) | The Claude Code plugin (public) |
| [openprose/open-prose](https://github.com/openprose/open-prose) | This repo - dev infrastructure |

## License

MIT
