<p align="center">
  <img src="assets/readme-header.svg" alt="OpenProse - A new kind of language for a new kind of computer" width="100%" />
</p>

<p align="center">
  <em>A long-running AI session is a Turing-complete computer. OpenProse is a programming language for it.</em>
</p>

<p align="center">
  <a href="https://www.prose.md">Website</a> •
  <a href="plugin/skills/open-prose/prose.md">Language Spec</a> •
  <a href="plugin/examples/">Examples</a>
</p>

---

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

## The Intelligent Inversion of Control

Traditional orchestration requires explicit coordination code. OpenProse inverts this—you declare agents and control flow, and an AI session wires them up. **The session is the IoC container.**

### 1. The Session as Runtime

Other frameworks orchestrate agents from outside. OpenProse runs *inside* the agent session—the session itself is both interpreter and runtime. It doesn't just match names; it understands context and intent.

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
/plugin marketplace add git@github.com:openprose/prose.git
/plugin install prose@open-prose
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
└── landing/                  # Website (prose.md)
```

## Development

```bash
git clone https://github.com/openprose/prose.git
cd prose/plugin
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

Each language feature follows the development pipeline:

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
Those are orchestration libraries—they coordinate agents from outside. OpenProse runs inside the agent session—the session itself is the IoC container. Zero external dependencies, portable across any AI assistant.

**Why not just plain English?**
You can use `**...**` for that. But complex workflows need unambiguous structure for control flow—the AI shouldn't guess whether you want sequential or parallel execution.

**What's "intelligent IoC"?**
Traditional IoC containers (Spring, Guice) wire up dependencies from configuration. OpenProse's container is an AI session that wires up agents using *understanding*. It doesn't just match names—it understands context, intent, and can make intelligent decisions about execution.

## License

[To be determined]
