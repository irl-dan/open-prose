# NPM Package Restructure Plan

**Date:** 2025-01-02
**Status:** ~~Proposed~~ **DEPRECATED** — See [ELEGANT_SIMPLIFICATION.md](/ELEGANT_SIMPLIFICATION.md)

> **Note:** This plan has been superseded by the Elegant Simplification plan. The core insight is that the plugin no longer needs to bundle the TypeScript implementation—the intelligent orchestrator can validate and interpret `.prose` files semantically. The npm package restructure is still relevant for dev tools (LSP, Web IDE, API) but is no longer a dependency of the plugin itself.

## Summary

This plan proposes restructuring the OpenProse repository to publish the core language implementation (`parser`, `validator`, `compiler`) as an npm package (`@openprose/core`). This enables code sharing between the plugin, API, and future web IDE while simplifying the plugin distribution model.

## Motivation

### Current Pain Points

1. **Plugin requires bun/ts-node** — Users must have TypeScript runtime to run the compiler
2. **No code sharing** — API cannot easily use the same parser/validator as the plugin
3. **Large plugin size** — Ships TypeScript source + all dev dependencies
4. **Web IDE complexity** — Would need to duplicate or awkwardly import from plugin

### Goals

1. Eliminate bun/ts-node requirement for plugin users
2. Enable API to validate generated `.prose` files
3. Enable web IDE to bundle the same parser/validator
4. Reduce plugin distribution size
5. Establish clear versioning for the language implementation

---

## Current State

```
open-prose/
├── plugin/
│   ├── src/
│   │   ├── parser/         # TypeScript source
│   │   ├── validator/      # TypeScript source
│   │   ├── compiler/       # TypeScript source
│   │   └── index.ts
│   ├── bin/open-prose.ts   # TypeScript entry point
│   ├── skills/
│   ├── examples/
│   └── package.json
├── api/                    # Cannot share code with plugin
├── landing/
└── infra/
```

**Plugin execution:**
```bash
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile program.prose
```

---

## Proposed State

### Repository Structure

```
open-prose/
├── packages/
│   └── core/                        # @openprose/core (published to npm)
│       ├── src/
│       │   ├── parser/
│       │   │   ├── tokens.ts
│       │   │   ├── lexer.ts
│       │   │   ├── ast.ts
│       │   │   ├── parser.ts
│       │   │   └── index.ts
│       │   ├── validator/
│       │   │   ├── validator.ts
│       │   │   └── index.ts
│       │   ├── compiler/
│       │   │   ├── compiler.ts
│       │   │   └── index.ts
│       │   ├── cli.ts               # CLI implementation
│       │   └── index.ts             # Public exports
│       ├── dist/                    # Compiled output (gitignored)
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── plugin/                          # Claude Code plugin (thin wrapper)
│   ├── bin/
│   │   └── open-prose.js            # Compiled JS, invokes @openprose/core
│   ├── skills/
│   │   └── open-prose/
│   │       ├── SKILL.md
│   │       └── prose.md
│   ├── examples/
│   ├── package.json                 # dependencies: { "@openprose/core": "^1.0.0" }
│   └── README.md
│
├── api/                             # Express API
│   ├── src/
│   │   └── ...
│   └── package.json                 # dependencies: { "@openprose/core": "^1.0.0" }
│
├── landing/                         # Next.js (can also use @openprose/core for web IDE)
├── infra/
├── package.json                     # Workspace root
└── pnpm-workspace.yaml
```

### Package Details

#### @openprose/core

```json
{
  "name": "@openprose/core",
  "version": "1.0.0",
  "description": "OpenProse language parser, validator, and compiler",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./cli": {
      "types": "./dist/cli.d.ts",
      "import": "./dist/cli.mjs",
      "require": "./dist/cli.js"
    }
  },
  "bin": {
    "openprose": "./dist/cli.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts src/cli.ts --format cjs,esm --dts",
    "test": "vitest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["openprose", "ai", "orchestration", "dsl", "parser"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/irl-dan/open-prose.git",
    "directory": "packages/core"
  }
}
```

#### Plugin package.json

```json
{
  "name": "open-prose-plugin",
  "version": "1.0.0",
  "dependencies": {
    "@openprose/core": "^1.0.0"
  }
}
```

#### Plugin entry point

```javascript
// plugin/bin/open-prose.js
#!/usr/bin/env node
require('@openprose/core/cli').run(process.argv.slice(2));
```

**Plugin execution (after restructure):**
```bash
node ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.js compile program.prose
```

---

## Migration Plan

### Phase 1: Create packages/core

1. Create `packages/core/` directory
2. Move source files from `plugin/src/` to `packages/core/src/`:
   - `parser/`
   - `validator/`
   - `compiler/`
   - `index.ts`
3. Create `packages/core/src/cli.ts` (extract from `plugin/bin/open-prose.ts`)
4. Add `packages/core/package.json` and `tsconfig.json`
5. Set up build with `tsup` (outputs CJS, ESM, and `.d.ts`)
6. Add tests (move relevant tests from plugin)

### Phase 2: Set up workspaces

1. Add root `package.json` with workspaces config
2. Add `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'packages/*'
     - 'plugin'
     - 'api'
     - 'landing'
   ```
3. Run `pnpm install` to link packages locally

### Phase 3: Update plugin

1. Remove `plugin/src/parser/`, `plugin/src/validator/`, `plugin/src/compiler/`
2. Update `plugin/package.json` to depend on `@openprose/core`
3. Replace `plugin/bin/open-prose.ts` with compiled `open-prose.js` wrapper
4. Update `SKILL.md` to use `node` instead of `bun run`
5. Test plugin functionality

### Phase 4: Update API

1. Add `@openprose/core` dependency to `api/package.json`
2. Import parser/validator for `.prose` validation in IDE endpoint:
   ```typescript
   import { parse, validate } from '@openprose/core';
   ```

### Phase 5: Publish to npm

1. Create npm organization: `openprose`
2. Set up npm token as GitHub secret
3. Create GitHub Action for publishing:
   ```yaml
   on:
     release:
       types: [published]
   ```
4. Publish initial version: `npm publish --access public`

### Phase 6: Update plugin distribution

1. Run `npm install` in plugin to fetch published `@openprose/core`
2. Commit `package-lock.json` (pins version)
3. Update plugin README

---

## Consumers After Restructure

| Consumer | How they get core | Installation |
|----------|-------------------|--------------|
| **Plugin** | Bundled in `node_modules/` | Shipped with plugin |
| **API** | npm dependency | `npm install @openprose/core` |
| **Web IDE** | Bundled via webpack/vite | Tree-shaken for browser |
| **CLI users** | Global install | `npm install -g @openprose/core` |
| **Library users** | npm dependency | `npm install @openprose/core` |

---

## Public API Surface

```typescript
// @openprose/core

// Parser
export { parse, Parser, tokenize, Lexer } from './parser';
export type {
  ParseResult,
  ParseError,
  Token,
  TokenType,
  ProgramNode,
  StatementNode,
  // ... all AST types
} from './parser';

// Validator
export { validate, Validator } from './validator';
export type { ValidationResult, ValidationError } from './validator';

// Compiler
export { compile, Compiler } from './compiler';
export type { CompileResult } from './compiler';

// CLI (separate entry point)
// import { run } from '@openprose/core/cli';
```

---

## Version Strategy

### Semantic Versioning

- **Major (1.x.x → 2.0.0):** Breaking changes to AST structure or public API
- **Minor (1.0.x → 1.1.0):** New language features, new AST nodes
- **Patch (1.0.0 → 1.0.1):** Bug fixes, performance improvements

### Version Coupling

The plugin should specify a **caret range** for flexibility:
```json
"@openprose/core": "^1.0.0"
```

This allows automatic patch/minor updates while protecting against breaking changes.

### Release Process

1. Make changes to `packages/core/`
2. Update version in `packages/core/package.json`
3. Create GitHub release with tag `core-v1.0.0`
4. CI publishes to npm
5. Update plugin's `package-lock.json` to pick up new version
6. Plugin users get update via `/plugin update open-prose`

---

## CI/CD Configuration

### Build & Test (on every PR)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @openprose/core build
      - run: pnpm --filter @openprose/core test
      - run: pnpm --filter open-prose-plugin test
      - run: pnpm --filter openprose-api test
```

### Publish (on release)

```yaml
# .github/workflows/publish-core.yml
name: Publish @openprose/core

on:
  release:
    types: [published]

jobs:
  publish:
    if: startsWith(github.ref, 'refs/tags/core-v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm --filter @openprose/core build
      - run: pnpm --filter @openprose/core publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Size Comparison

### Before (source distribution)

```
plugin/
├── src/           ~200 KB (TypeScript source)
├── node_modules/  ~50 MB (includes typescript, etc.)
└── total:         ~50 MB
```

### After (compiled distribution)

```
plugin/
├── bin/           ~2 KB (thin wrapper)
├── node_modules/
│   └── @openprose/core/
│       └── dist/  ~100 KB (compiled JS + types)
└── total:         ~500 KB
```

**~99% size reduction** (mostly from removing dev dependencies)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| npm unavailable during plugin install | Bundle `@openprose/core` in plugin repo as fallback |
| Breaking change in core breaks plugin | Pin versions, test before updating |
| npm account compromise | Enable 2FA, use granular tokens, audit regularly |
| Build step adds complexity | Automate via CI, document process |

---

## Open Questions

1. **npm org name:** Is `@openprose` available? Fallback: `@open-prose` or unprefixed `openprose-core`

2. **Bundling strategy:** Should we also publish a browser-specific bundle for the web IDE, or let consumers handle bundling?

3. **Telemetry in core:** Should the telemetry collector live in core (shared) or remain plugin-specific?

4. **License:** Current license is "To be determined" — need to decide before npm publish

---

## Dependencies on Other Work

This restructure should happen **before**:
- Implementing the web IDE (needs shared core)
- Adding validation to the API's IDE endpoint (needs shared core)
- Implementing the telemetry collector (cleaner if core is separate)

This restructure can happen **after** or **independent of**:
- Telemetry API (already deployed)
- Landing page updates
- New language features

---

## Next Steps (When Ready)

1. Reserve npm org: `npm org create openprose`
2. Decide on license
3. Execute Phase 1-6 as described above
4. Update this document with decisions made
