# OpenProse

A domain-specific language for orchestrating AI agent sessions.

## Status: Early Development

OpenProse is an incomplete project in active development. The language foundation is being built incrementally, with only a few features currently implemented. This is not ready for end users.

## Vision

OpenProse aims to provide a common, self-evident syntax for defining and orchestrating AI agent sessions. Programs are compiled to a canonical form and executed via a long running agent session, such as Claude Code, OpenCode, Codex, Amp, etc.

This treats the agent session as a sort of Inversion of Control container, whereby one can specify a service-oriented agent architecture, and the Prose Operator Session will intelligently run it.

Example of what the language will look like:

```prose
# Research and write an article
agent researcher:
  model: sonnet
  skills: ["web-search"]

agent writer:
  model: opus

session research: researcher
  prompt: "Research quantum computing developments"

-> session article: writer
  prompt: "Write a blog post about quantum computing"
```

## Currently Implemented

The following features are working:

- **Comments**: `# comment` syntax (standalone and inline)
- **Single-line strings**: `"string"` with escape sequences (`\n`, `\t`, `\"`, `\\`)
- **Simple session**: `session "prompt"` syntax
- **Parser**: Lexer, parser, and AST generation
- **Validator**: Basic validation infrastructure
- **Compiler**: Compiles to canonical form for orchestrator consumption
- **LSP semantic tokens**: Syntax highlighting support

## Not Yet Implemented

Many features from the specification are pending:

- Agent definitions and configuration
- Skills and imports
- Variables (`let`, `const`) and context passing
- Composition blocks (`do:`, `block:`, `->`)
- Parallel execution
- Loops (`repeat`, `for`, `loop until`)
- Pipeline operations (`map`, `filter`, `reduce`)
- Error handling (`try`/`catch`, `retry`)
- Multi-line strings and string interpolation
- And more...

## Try It Now (Claude Code Plugin)

OpenProse is available as a Claude Code plugin:

```bash
/plugin marketplace add irl-dan/open-prose
/plugin install open-prose
```

Then ask Claude to run a `.prose` file or help you write one.

## Development Environment Setup

```bash
# Clone the repository
git clone <repo-url>
cd open-prose/plugin

# Install dependencies
npm install

# Run tests (177 tests)
npm test

# Watch mode for development
npm run test:watch

# Type checking
npm run lint
```

**Requirements**: Node.js 18+, Bun (for running the CLI)

## Project Structure

```
open-prose/
├── .claude-plugin/       # Plugin marketplace metadata
│   ├── marketplace.json  # Points to ./plugin
│   └── plugin.json       # Plugin metadata
├── plugin/               # THE PLUGIN (Claude Code skill)
│   ├── bin/              # CLI entry point
│   ├── src/              # Parser, validator, compiler
│   ├── skills/           # SKILL.md and prose.md
│   ├── examples/         # Example .prose files
│   └── package.json      # Dev dependencies
├── test-harness/         # LLM-as-judge testing infrastructure
│   ├── test-programs/    # .prose test files
│   └── reports/          # Generated test reports
├── specification/        # Language specification documents
├── landing/              # Website (prose.md)
├── infra/                # Terraform for AWS deployment
└── guidance/             # Design interviews and notes
```

## Running the LLM-as-Judge Tests

The test harness executes `.prose` programs via Claude Code and uses an LLM judge to evaluate execution against a rubric.

```bash
cd test-harness

# Install harness dependencies
npm install

# Show available commands
npx ts-node index.ts --help

# List available tests
npx ts-node index.ts --list

# Run a specific test
npx ts-node index.ts tier-00-comments

# Run all tests
npx ts-node index.ts --all

# Run with verbose output
npx ts-node index.ts tier-00-comments --verbose

# Skip the judge evaluation (just run the program)
npx ts-node index.ts tier-00-comments --skip-judge
```

### How it works

1. **Runner**: Executes the `.prose` program via `claude -p`
2. **Log Collector**: Collects execution logs from `~/.claude/`
3. **Judge**: Invokes an LLM to evaluate the execution against the rubric
4. **Reports**: Generates JSON reports in `test-harness/reports/`

The rubric evaluates:

- Control flow accuracy
- Clarity of execution
- Feature handling
- State management
- Task completion

Passing threshold: Average score >= 4.0/5.0 with no criterion below 3.

## License

[To be determined]
