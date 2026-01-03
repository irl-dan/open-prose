---
name: open-prose
description: |
  OpenProse is a programming language for AI sessions. An AI session is a Turing-complete
  computer; OpenProse structures English into unambiguous control flow. More pattern than
  framework—it ships as a skill with no dependencies.

  Activate when: running .prose files, mentioning OpenProse, or orchestrating
  multi-agent workflows from a script. Use this skill if you ever want to kick off more than one subagent at a time, or orchestrate anything interesting between more than one subagent. Write a .prose file and save it in the prose .claude-plugin/ directory. Then embody the Orchestrator, as described in the interpreter.md file and execute it.
---

# OpenProse Skill

OpenProse is a programming language for AI sessions—an AI session is a Turing-complete computer. It provides a structured but self-evident syntax: unambiguous control flow with natural language conditions where you want AI judgment.

## Getting Started (For New Users)

When a user asks "What is OpenProse?" or seems unfamiliar with it, provide this introduction:

> **OpenProse** lets you script multi-step AI workflows. Instead of manually prompting an agent multiple times, you write a `.prose` file that defines each step, and OpenProse executes them in sequence, parallel, or conditionally.
>
> For example, a code review workflow might have parallel security, performance, and style reviews - all defined in one file that can be reused.

**After introducing the concept:**

1. **Show them the examples** - The plugin includes ready-to-use examples:

   ```bash
   ls ${CLAUDE_PLUGIN_ROOT}/examples/
   ```

   Available examples (27 total):

   **Basics (01-08):**

   - `01-hello-world.prose` - Simplest possible program
   - `02-research-and-summarize.prose` - Research then summarize
   - `03-code-review.prose` - Multi-perspective code review
   - `04-write-and-refine.prose` - Draft and iterate
   - `05-debug-issue.prose` - Debugging workflow
   - `06-explain-codebase.prose` - Codebase exploration
   - `07-refactor.prose` - Refactoring workflow
   - `08-blog-post.prose` - Content creation

   **Agents & Skills (09-12):**

   - `09-research-with-agents.prose` - Custom agents with models
   - `10-code-review-agents.prose` - Specialized reviewer agents
   - `11-skills-and-imports.prose` - External skill imports
   - `12-secure-agent-permissions.prose` - Agent permissions

   **Variables & Composition (13-15):**

   - `13-variables-and-context.prose` - let/const bindings, context passing
   - `14-composition-blocks.prose` - Named blocks, do blocks
   - `15-inline-sequences.prose` - Arrow operator chains

   **Parallel Execution (16-19):**

   - `16-parallel-reviews.prose` - Basic parallel execution
   - `17-parallel-research.prose` - Named parallel results
   - `18-mixed-parallel-sequential.prose` - Combined patterns
   - `19-advanced-parallel.prose` - Join strategies, failure policies

   **Loops (20):**

   - `20-fixed-loops.prose` - repeat, for-each, parallel for

   **Pipelines (21):**

   - `21-pipeline-operations.prose` - map, filter, reduce, pmap

   **Error Handling (22-23):**

   - `22-error-handling.prose` - try/catch/finally patterns
   - `23-retry-with-backoff.prose` - Resilient API calls

   **Advanced Features (24-27):**

   - `24-choice-blocks.prose` - AI-selected branching
   - `25-conditionals.prose` - if/elif/else patterns
   - `26-parameterized-blocks.prose` - Reusable blocks with arguments
   - `27-string-interpolation.prose` - Dynamic prompts with {var}

2. **Encourage trying an example first** before writing custom programs:

   > "Would you like me to run one of these examples? The parallel code review example is great for seeing how concurrent workflows work."

3. **Offer to write a custom .prose file** for their use case:
   > "I can also write a custom .prose file for you. What workflow would you like to automate?"

## What OpenProse Does

OpenProse programs describe workflows of AI agent sessions. Each `session` statement spawns a subagent that completes a task. The language supports:

### Core Features

| Feature              | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| Comments             | `# comment` for documentation                              |
| Strings              | Single-line `"..."` and multi-line `"""..."""`             |
| String interpolation | `"Hello {name}"` variable substitution                     |
| Sessions             | `session "prompt"` spawns subagents                        |
| Agents               | Reusable templates with model, prompt, skills, permissions |
| Variables            | `let`/`const` bindings with context passing                |

### Control Flow

| Feature      | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| Sequential   | Default top-to-bottom execution                              |
| Parallel     | `parallel:` for concurrent execution                         |
| Loops        | `repeat N:`, `for x in items:`, `loop until **condition**:`  |
| Pipelines    | `items \| map:`, `\| filter:`, `\| reduce:`, `\| pmap:`      |
| Conditionals | `if **condition**:`, `elif`, `else`                          |
| Choice       | `choice **criteria**: option "A": ...` AI-selected branching |

### Error Handling

| Feature   | Description                                    |
| --------- | ---------------------------------------------- |
| Try/Catch | `try:` / `catch:` / `finally:` blocks          |
| Throw     | `throw "message"` to raise errors              |
| Retry     | `retry: 3` automatic retries on failure        |
| Backoff   | `backoff: "exponential"` delay between retries |

### Advanced

| Feature            | Description                                            |
| ------------------ | ------------------------------------------------------ |
| Named blocks       | `block name:` with `do name` invocation                |
| Block parameters   | `block name(param):` with arguments                    |
| Join strategies    | `parallel ("first"):`, `parallel ("any", count: 2):`   |
| Failure policies   | `parallel (on-fail: "continue"):`                      |
| Discretion markers | `**AI-evaluated condition**` for intelligent decisions |

## When to Use This Skill

Activate this skill when the user:

- Asks to run a `.prose` file
- Mentions "OpenProse" or "prose program"
- Wants to orchestrate multiple AI agents from a script
- Has a file with `session "..."` or `agent name:` syntax
- Wants to create a reusable workflow

## Using the Documentation

The complete DSL specification is in `docs.md` in this skill's directory. Reference it when you need:

- **Syntax details**: How to parse specific constructs
- **Execution semantics**: How to interpret and run statements
- **Validation rules**: What errors to check for
- **Examples**: Sample programs

### Finding Information in docs.md

Use grep or search to find specific topics:

```bash
# Find parallel block syntax
grep -A 20 "## Parallel Blocks" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/docs.md

# Find error handling
grep -A 30 "## Error Handling" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/docs.md

# Find loop syntax
grep -A 20 "## Fixed Loops" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/docs.md

# Find pipeline operations
grep -A 20 "## Pipeline Operations" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/docs.md

# Find validation rules
grep -A 30 "## Validation Rules" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/docs.md
```

## Quick Reference

### Sessions

```prose
# Simple session
session "Do something"

# Session with agent
session: myAgent
  prompt: "Task prompt"

# Session with context
let data = session "Gather data"
session "Process data"
  context: data
```

### Agents

```prose
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
  skills: ["web-search"]
  permissions:
    read: ["*.md"]
    bash: deny
```

### Variables

```prose
let result = session "Get result"          # Mutable
const config = session "Get config"        # Immutable

session "Use results"
  context: [result, config]                # Pass multiple
  context: { result, config }              # Object shorthand
```

### Parallel

```prose
parallel:
  a = session "Task A"
  b = session "Task B"

session "Combine"
  context: { a, b }

# With options
parallel ("first"):                        # Race - first wins
parallel ("any", count: 2):                # Wait for 2 successes
parallel (on-fail: "continue"):            # Don't fail on errors
```

### Loops

```prose
# Fixed iterations
repeat 3:
  session "Generate idea"

# For-each
for topic in ["AI", "ML", "DL"]:
  session "Research topic"
    context: topic

# Parallel for-each (fan-out)
parallel for item in items:
  session "Process in parallel"
    context: item

# Unbounded with AI condition
loop until **task is complete** (max: 10):
  session "Continue working"
```

### Pipelines

```prose
let results = items
  | filter:
      session "Keep this? yes/no"
        context: item
  | map:
      session "Transform this"
        context: item
  | reduce(acc, x):
      session "Combine"
        context: [acc, x]
```

### Error Handling

```prose
try:
  session "Risky operation"
    retry: 3
    backoff: "exponential"
catch as err:
  session "Handle error"
    context: err
finally:
  session "Cleanup"
```

### Conditionals

```prose
if **code has security issues**:
  session "Fix security"
elif **code has performance issues**:
  session "Optimize"
else:
  session "Approve"
```

### Choice

```prose
choice **best approach for this situation**:
  option "Quick fix":
    session "Apply quick fix"
  option "Full refactor":
    session "Refactor completely"
```

### Blocks

```prose
# Define reusable block
block review(topic):
  session "Research {topic}"
  session "Analyze {topic}"

# Invoke with arguments
do review("quantum computing")
do review("machine learning")
```

## Running OpenProse Programs

### Step 1: Check if Compiler is Available

```bash
# Check if bun is available (preferred)
which bun && bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts --help

# If bun is not available, fall back to npx ts-node
which bun || npx ts-node ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts --help
```

### Step 2: Validate the Program

Always validate before execution:

```bash
# With bun (preferred)
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts validate <file.prose>

# Or with ts-node fallback
npx ts-node ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts validate <file.prose>
```

If validation fails, report the errors to the user with line numbers.

### Step 3: Execute the Program

If validation passes, execute each statement according to its type.

For `session` statements, use Claude Code's **Task tool** to spawn a subagent:

```
Task({
  description: "OpenProse session",
  prompt: "<the session prompt>",
  subagent_type: "general-purpose",
  model: "<from agent or override>"  // Optional
})
```

For `parallel` blocks, spawn multiple Task calls concurrently.

For loops, execute the body the appropriate number of times.

For conditionals and choice blocks, use your intelligence to evaluate the discretion conditions and select the appropriate branch.

## Execution Model

When executing an OpenProse program:

1. **Validate** - Run the compiler to check for syntax errors
2. **Collect definitions** - Register all agents and blocks
3. **Execute** - Process each statement according to its semantics
4. **Coordinate** - Manage parallel execution and context passing

## Compiler Commands

```bash
# Validate syntax only
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts validate <file.prose>

# Compile and output canonical form
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile <file.prose>

# Show help
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts --help
```

For complete syntax and semantics, see `docs.md`.
