# @openprose/core

OpenProse language implementation - parser, validator, compiler, and LSP.

## Overview

This package provides the TypeScript implementation of the OpenProse language tooling:

- **Parser**: Lexer and parser for `.prose` files
- **Validator**: Semantic validation and error checking
- **Compiler**: Transformation to canonical form
- **LSP**: Language Server Protocol support for editors

## Installation

```bash
npm install @openprose/core
# or
bun add @openprose/core
```

## Usage

### CLI

```bash
# Validate a .prose file
npx openprose validate program.prose

# Compile to canonical form
npx openprose compile program.prose
```

### Programmatic

```typescript
import { parse, validate, compile } from '@openprose/core';

// Parse source code
const ast = parse(source);

// Validate
const errors = validate(ast);

// Compile
const output = compile(ast);
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run lint
```

## Note on Plugin vs Package

This package is for **development tooling** (IDE support, web IDE, API validation).

The actual Claude Code plugin is a separate repository (`github.com/openprose/prose`) containing only markdown files and examples - no dependencies on this package.

## License

MIT
