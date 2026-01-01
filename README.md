# OpenProse

A domain-specific language for orchestrating AI agent sessions.

## What is OpenProse?

OpenProse lets you script multi-step AI workflows. Instead of manually prompting an agent multiple times, you write a `.prose` file that defines each step, and OpenProse executes them in sequence.

```prose
# Code review workflow
session "Read the files in src/ and provide an overview of the codebase"
session "Review the code for security vulnerabilities"
session "Review the code for performance issues"
session "Create a unified report with prioritized recommendations"
```

Each `session` spawns a subagent that completes its task before the next session starts.

## Try It Now (Claude Code Plugin)

OpenProse is available as a Claude Code plugin:

```bash
/plugin marketplace add irl-dan/open-prose
/plugin install open-prose
```

After installation, you can:

```
# Ask Claude to run an example
"Run the code review example from OpenProse"

# Or run your own .prose file
"Execute my-workflow.prose"

# Or ask Claude to write one for you
"Write me an OpenProse workflow for debugging a bug"
```

The plugin includes 8 ready-to-use examples for common workflows like code review, debugging, refactoring, and content creation.

## Status: Early Development

The language foundation is working and usable via the Claude Code plugin. More features are being added incrementally.

### Currently Implemented

| Feature | Syntax | Description |
|---------|--------|-------------|
| Comments | `# comment` | Standalone and inline comments |
| Strings | `"text"` | Single-line with escapes (`\n`, `\t`, `\"`, `\\`) |
| Sessions | `session "prompt"` | Spawn a subagent with a prompt |

### Planned Features

The full language will include:

- Agent definitions (`agent name:` with model/skills configuration)
- Variables and context passing (`let result = session "..."`)
- Parallel execution (`parallel:` blocks)
- Loops (`repeat`, `for`, `loop until **condition**`)
- Error handling (`try`/`catch`, `retry`)
- And more...

See `BUILD_PLAN.md` for the complete roadmap and `specification/` for language design documents.

## Vision

OpenProse aims to provide a common, self-evident syntax for orchestrating AI agents across different platforms (Claude Code, OpenCode, Codex, Amp, etc.).

Example of the planned full syntax:

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

## Project Structure

```
open-prose/
├── .claude-plugin/           # Plugin marketplace metadata
├── plugin/                   # THE PLUGIN (Claude Code skill)
│   ├── bin/                  # CLI (open-prose.ts)
│   ├── src/
│   │   ├── parser/           # Lexer, parser, AST
│   │   ├── validator/        # Semantic validation
│   │   ├── compiler/         # Compiles to canonical form
│   │   └── lsp/              # Language Server Protocol
│   ├── skills/open-prose/    # SKILL.md + prose.md (DSL reference)
│   ├── examples/             # 8 ready-to-use workflow examples
│   └── package.json          # Dependencies
├── test-harness/             # LLM-as-judge E2E testing
├── specification/            # Language specification documents
├── guidance/                 # Design research and decisions
├── landing/                  # Website
├── infra/                    # Terraform (AWS deployment)
└── BUILD_PLAN.md             # Development roadmap
```

## Development

### Setup

```bash
git clone https://github.com/irl-dan/open-prose.git
cd open-prose/plugin
npm install
```

### Commands

```bash
npm test          # Run all 177 tests
npm run test:watch # Watch mode
npm run lint      # Type check
npm run build     # Compile TypeScript
```

### Running the CLI

```bash
# Validate a .prose file
bun run bin/open-prose.ts validate path/to/program.prose

# Compile to canonical form
bun run bin/open-prose.ts compile path/to/program.prose
```

**Requirements**: Node.js 18+, Bun (for CLI)

## Contributing

See `BUILD_PLAN.md` for the development roadmap. The iteration loop for adding new features:

1. **Parser** - Grammar rules, AST nodes, unit tests
2. **Validator** - Semantic validation, error messages
3. **Compiler** - Expand to canonical form
4. **Documentation** - Update `prose.md`
5. **LSP** - Syntax highlighting
6. **Examples** - Add to `plugin/examples/`
7. **E2E Test** - LLM-as-judge validation

### LLM-as-Judge Testing

The test harness runs `.prose` programs via Claude Code and uses an LLM to evaluate execution:

```bash
cd test-harness
npm install
npx ts-node index.ts --list        # List available tests
npx ts-node index.ts tier-00-comments  # Run specific test
npx ts-node index.ts --all         # Run all tests
```

Passing threshold: Average score >= 4.0/5.0 with no criterion below 3.

## License

[To be determined]
