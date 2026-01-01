# OpenProse Plugin

This directory contains the Claude Code plugin for OpenProse - a domain-specific language for orchestrating AI agent sessions.

## Installation

```bash
# Add the marketplace
/plugin marketplace add irl-dan/open-prose

# Install the plugin
/plugin install open-prose
```

After installation, the skill activates when you:
- Ask to run a `.prose` file
- Mention "OpenProse" or "prose program"
- Want to orchestrate multi-agent workflows

## Directory Structure

```
plugin/
├── bin/
│   └── open-prose.ts         # CLI entry point (compile, validate commands)
├── examples/
│   ├── 01-hello-world.prose  # Simplest possible program
│   ├── 02-research-and-summarize.prose
│   ├── 03-code-review.prose
│   ├── 04-write-and-refine.prose
│   ├── 05-debug-issue.prose
│   ├── 06-explain-codebase.prose
│   ├── 07-refactor.prose
│   ├── 08-blog-post.prose
│   ├── README.md
│   └── roadmap/              # Future syntax examples (not yet implemented)
├── skills/
│   └── open-prose/
│       ├── SKILL.md          # Skill instructions for Claude
│       └── prose.md          # Complete DSL reference
├── src/
│   ├── parser/               # Lexer, parser, AST
│   ├── compiler/             # Compiler transforms
│   ├── validator/            # Semantic validation
│   ├── lsp/                  # Language server protocol support
│   └── index.ts              # Main exports
├── package.json
└── tsconfig.json
```

## Current Implementation Status

| Feature | Status | Syntax |
|---------|--------|--------|
| Comments | Implemented | `# comment` |
| Single-line strings | Implemented | `"string"` with escapes |
| Simple session | Implemented | `session "prompt"` |

**Planned but not yet implemented:**
- Agent definitions (`agent name:`)
- Variables (`let x = ...`)
- Parallel execution (`parallel:`)
- Loops (`loop until **condition**:`)
- Context passing (`context: { var1, var2 }`)

See `examples/roadmap/` for examples of planned syntax.

## Architecture: Skills-Only

This plugin uses a **skills-only architecture** rather than slash commands.

### Why Skills Instead of Commands?

During development, we discovered that the `${CLAUDE_PLUGIN_ROOT}` environment variable does **not expand** in Command markdown files (see [Issue #9354](https://github.com/anthropics/claude-code/issues/9354)). This made it impossible for `/run-prose` to call the bundled compiler.

**The workaround**: Skills work differently. When Claude reads instructions from `SKILL.md`, it uses its own Bash tool to execute commands. The Bash tool environment **does** have `${CLAUDE_PLUGIN_ROOT}` available. So skill instructions like:

```bash
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts validate program.prose
```

...work correctly because Claude's Bash tool expands the variable.

### How Execution Works

1. User mentions running a `.prose` file
2. Claude activates the `open-prose` skill and reads `SKILL.md`
3. Claude validates the program using the compiler via Bash
4. Claude interprets each statement:
   - Comments (`#`) are skipped
   - Sessions (`session "prompt"`) spawn subagents via the Task tool
5. Each session completes before the next starts

## Binary Distribution: Decisions & Blockers

### The Problem

We initially tried to bundle a compiled binary (`bun build --compile`). Issues:

1. **Size**: Compiled Bun binaries are ~57MB
2. **Git timeouts**: `git add` kept timing out on the large binary
3. **Cross-platform**: Would need separate builds for macOS, Linux, Windows

### The Solution: Source Distribution

Instead of bundling a binary, we ship the TypeScript source and run it directly:

```bash
# With Bun (preferred)
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile program.prose

# Fallback for systems without Bun
npx ts-node ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile program.prose
```

**Requirements:**
- Bun (preferred) - available at [bun.sh](https://bun.sh)
- Or Node.js with `ts-node` as fallback

### Why Not NPM?

We chose not to publish to NPM because:
1. Adds external dependency for users
2. Version sync complexity
3. Bun can run TypeScript directly without compilation

## Repository Structure Note

The `.claude-plugin/` directory lives at the **repository root** (not inside `plugin/`), but points to this directory via `source: "./plugin"` in `marketplace.json`.

This is required because Claude Code looks for `.claude-plugin/marketplace.json` at the repo root when adding a marketplace. The structure:

```
open-prose/                       # Repository root
├── .claude-plugin/               # Required at root for marketplace discovery
│   ├── marketplace.json          # source: "./plugin"
│   └── plugin.json
├── plugin/                       # This directory - plugin contents
│   └── ...
├── landing/                      # Website (not part of plugin)
├── infra/                        # Terraform (not part of plugin)
└── ...
```

We chose this structure to:
1. Keep the plugin separate from the webapp and infrastructure
2. Avoid shipping unnecessary files (landing page, terraform) with the plugin
3. Allow independent development of plugin vs. other components

## Development

### Running the CLI Locally

```bash
cd plugin

# Compile a program
bun run bin/open-prose.ts compile path/to/program.prose

# Validate syntax only
bun run bin/open-prose.ts validate path/to/program.prose

# Show help
bun run bin/open-prose.ts --help
```

### Installing Dependencies

```bash
cd plugin
npm install
```

### Running Tests

From the plugin directory:

```bash
npm test
npm run test:watch  # Watch mode
```

### Building & Linting

```bash
npm run build       # Compile TypeScript
npm run lint        # Type check without emitting
```

### Bun Type Export Bug

During development, we encountered a Bun-specific issue with re-exported types. Bun doesn't handle barrel exports of type-only exports correctly:

```typescript
// This breaks in Bun:
export { SomeInterface } from './types';

// This works:
export type { SomeInterface } from './types';
```

All barrel files (`index.ts`) in `src/` use `export type` for interfaces.

## Key Files for Future Engineers

| File | Purpose |
|------|---------|
| `skills/open-prose/SKILL.md` | Instructions Claude reads when skill activates |
| `skills/open-prose/prose.md` | Complete DSL reference documentation |
| `bin/open-prose.ts` | CLI entry point |
| `src/parser/` | Lexer, parser, AST definitions |
| `src/validator/` | Semantic validation rules |
| `src/compiler/` | Compilation transforms |
| `examples/` | Ready-to-use workflow examples |

## Historical Context

The full decision history, including all options considered and CEO decisions, is archived at:

- `guidance/2025-01-01-hosting-plan.md` - Complete hosting plan with decisions
- `guidance/2025-01-01-how-to-host-plugin-reference.md` - Reference documentation used

Key decisions made:
1. Self-hosted marketplace (not external marketplace)
2. Skills-only architecture (due to Command env var bug)
3. Source distribution (due to 57MB binary issues)
4. Nested `plugin/` directory (to separate from webapp/infra)
5. Bun as primary runtime with ts-node fallback

## Updating the Plugin

After making changes:

1. Commit and push to GitHub
2. Users update with: `/plugin update open-prose`

The plugin version is defined in both:
- `plugin/package.json`
- `.claude-plugin/plugin.json`

Keep these in sync when releasing new versions.
