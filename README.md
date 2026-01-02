# OpenProse

**Declarative agents. Intelligent runtime.**

An open standard for AI orchestration—declare your agent architecture, let an intelligent interpreter wire it up.

```prose
# Research and write workflow
agent researcher:
  model: sonnet
  skills: ["web-search"]

agent writer:
  model: opus

parallel:
  research = session: researcher
    prompt: "Research quantum computing breakthroughs"
  competitive = session: researcher
    prompt: "Analyze competitor landscape"

loop until **the draft meets publication standards** (max: 3):
  session: writer
    prompt: "Write and refine the article"
    context: { research, competitive }
```

## What Makes OpenProse Different?

There are many agent orchestration frameworks. Here's why OpenProse is novel:

### 1. Intelligent Inversion of Control

Traditional orchestration frameworks require you to write explicit coordination code. OpenProse inverts this—you declare agent primitives, and an AI session (the "Orchestrator") wires them up and executes them.

The Orchestrator isn't just a runtime. It's an intelligent IoC container that understands context, not just configuration.

### 2. The Fourth Wall (`**...**`)

When you need AI judgment instead of strict execution, break out of structure:

```prose
loop until **the code is production ready**:
  session "Review and improve"
```

The `**...**` syntax lets you speak directly to the interpreter. The Orchestrator evaluates this semantically—it decides what "production ready" means based on context.

### 3. Open Standard, Zero Lock-in

OpenProse is a skill you import into Claude Code, OpenCode, Codex, Amp, or any compatible AI assistant. It's not a library you're locked into—it's a language specification.

Switch platforms anytime. Your `.prose` files work everywhere.

### 4. Structure + Flexibility

**Why not just plain English?** You can—that's what `**...**` is for. But complex workflows need unambiguous structure for control flow. The AI shouldn't have to guess whether you want sequential or parallel execution.

**Why not rigid frameworks?** They're inflexible. OpenProse gives you structure where it matters (control flow, agent definitions) and natural language where you want flexibility (conditions, context passing).

## Install (Claude Code)

```bash
/plugin marketplace add irl-dan/open-prose
/plugin install open-prose
```

Then:

```
"Run the code review example from OpenProse"
"Execute my-workflow.prose"
"Write me an OpenProse workflow for debugging"
```

The plugin includes ready-to-use examples for code review, debugging, refactoring, and content creation.

## Language Features

| Feature | Status | Example |
|---------|--------|---------|
| Agents | ✅ | `agent researcher: model: sonnet` |
| Sessions | ✅ | `session "prompt"` or `session: agent` |
| Parallel | ✅ | `parallel:` blocks with join strategies |
| Variables | ✅ | `let x = session "..."` |
| Context | ✅ | `context: [a, b]` or `context: { a, b }` |
| Fixed Loops | ✅ | `repeat 3:` and `for item in items:` |
| Unbounded Loops | ✅ | `loop until **condition**:` |
| Imports | ✅ | `import "skill" from "github:user/repo"` |
| Permissions | ✅ | `permissions: bash: deny` |
| Error Handling | 🔜 | `try`/`catch`, `retry` |
| Pipelines | 🔜 | `items \| map: session "..."` |

See the [Language Reference](plugin/skills/open-prose/prose.md) for complete documentation.

## How It Works

### Two-Phase Execution

**Phase 1: Compile (Static)**
- Parse the `.prose` file
- Validate agent/skill references
- Expand syntax sugar
- Output canonical program

**Phase 2: Run (Intelligent)**
- Orchestrator receives the compiled program
- Executes using the most capable model (Opus)
- Follows control flow strictly
- Handles context passing intelligently
- Evaluates `**...**` conditions semantically

### The Orchestrator

The Orchestrator is an AI session that acts as an intelligent IoC container:

| Aspect | Behavior |
|--------|----------|
| Execution order | **Strict** — follows program exactly |
| Session creation | **Strict** — creates what program specifies |
| Parallel coordination | **Strict** — executes as specified |
| Context passing | **Intelligent** — summarizes/transforms as needed |
| Condition evaluation | **Intelligent** — interprets `**...**` semantically |
| Completion detection | **Intelligent** — determines when "done" |

## Project Structure

```
open-prose/
├── plugin/                   # The Claude Code plugin
│   ├── src/
│   │   ├── parser/           # Lexer, parser, AST
│   │   ├── validator/        # Semantic validation
│   │   ├── compiler/         # Compiles to canonical form
│   │   └── lsp/              # Language Server Protocol
│   ├── skills/open-prose/    # Interpreter docs (prose.md)
│   └── examples/             # Ready-to-use workflows
├── test-harness/             # LLM-as-judge E2E testing
├── specification/            # Language design documents
├── landing/                  # Website (prose.md)
└── BUILD_PLAN.md             # Development roadmap
```

## Development

```bash
git clone https://github.com/irl-dan/open-prose.git
cd open-prose/plugin
npm install
npm test          # Run tests
npm run lint      # Type check
```

### CLI

```bash
bun run bin/open-prose.ts validate program.prose
bun run bin/open-prose.ts compile program.prose
```

### Contributing

See `BUILD_PLAN.md` for the roadmap. Each feature follows:

1. Parser → Validator → Compiler → Docs → LSP → Examples → E2E Test

### LLM-as-Judge Testing

```bash
cd test-harness && npm install
npx ts-node index.ts --list
npx ts-node index.ts --all
```

Passing: Average ≥ 4.0/5.0, no criterion below 3.

## FAQ

**Why not LangChain/CrewAI/AutoGen?**
Those are libraries locked to specific runtimes. OpenProse is a language spec that runs in any AI assistant.

**Why not just plain English?**
You can use `**...**` for that. But complex workflows need unambiguous structure for control flow.

**What's "intelligent IoC"?**
Traditional IoC wires dependencies from config. OpenProse's container is an AI that wires agent sessions using understanding.

## Links

- **Website**: [prose.md](https://www.prose.md)
- **Language Spec**: [prose.md](plugin/skills/open-prose/prose.md)
- **Examples**: [plugin/examples/](plugin/examples/)

## License

[To be determined]
