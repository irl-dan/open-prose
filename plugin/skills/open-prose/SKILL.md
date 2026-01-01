---
name: open-prose
description: |
  OpenProse is a domain-specific language for orchestrating AI agent sessions.
  Write .prose programs to define multi-agent workflows with a Python-like syntax.
  Each `session "prompt"` statement spawns a subagent to complete a task.

  Activate when: running .prose files, mentioning OpenProse, or orchestrating
  multi-agent workflows from a script.
---

# OpenProse Skill

OpenProse is a domain-specific language for orchestrating AI agent sessions. It provides a declarative, Python-like syntax for defining multi-agent workflows that execute via Claude Code's subagent system.

## Getting Started (For New Users)

When a user asks "What is OpenProse?" or seems unfamiliar with it, provide this introduction:

> **OpenProse** lets you script multi-step AI workflows. Instead of manually prompting an agent multiple times, you write a `.prose` file that defines each step, and OpenProse executes them in sequence.
>
> For example, a code review workflow might have steps for security review, performance review, and synthesizing findings - all defined in one file that can be reused.

**After introducing the concept:**

1. **Show them the examples** - The plugin includes ready-to-use examples:
   ```bash
   ls ${CLAUDE_PLUGIN_ROOT}/examples/
   ```

   Available examples:
   - `01-hello-world.prose` - Simplest possible program
   - `02-research-and-summarize.prose` - Research then summarize
   - `03-code-review.prose` - Multi-perspective code review
   - `04-write-and-refine.prose` - Draft and iterate
   - `05-debug-issue.prose` - Debugging workflow
   - `06-explain-codebase.prose` - Codebase exploration
   - `07-refactor.prose` - Refactoring workflow
   - `08-blog-post.prose` - Content creation

2. **Encourage trying an example first** before writing custom programs:
   > "Would you like me to run one of these examples? The code review example is great for seeing how multi-step workflows work."

3. **Offer to write a custom .prose file** for their use case:
   > "I can also write a custom .prose file for you. What workflow would you like to automate? Describe the steps you typically go through."

When writing a .prose file for users, keep it simple:
- Use clear, descriptive prompts
- Add comments explaining each step
- Start with 3-5 sessions (not too many steps at first)

## What OpenProse Does

OpenProse programs describe a sequence of AI agent sessions to execute. Each `session` statement spawns a subagent that completes a task. The language supports:

- **Comments**: Documentation within programs
- **String literals**: Prompts and text content
- **Sessions**: Spawning subagent tasks

More features (agents, skills, variables, parallel execution, loops, etc.) are planned but not yet implemented.

## When to Use This Skill

Activate this skill when the user:

- Asks to run a `.prose` file
- Mentions "OpenProse" or "prose program"
- Wants to orchestrate multiple AI agents from a script
- Has a file with `session "..."` syntax

## Using the Documentation

The complete DSL specification is in `prose.md` in this skill's directory. Reference it when you need:

- **Syntax details**: How to parse specific constructs
- **Execution semantics**: How to interpret and run statements
- **Validation rules**: What errors to check for
- **Examples**: Sample programs

### Finding Information in prose.md

Use grep or search to find specific topics:

```bash
# Find session syntax
grep -A 10 "## Session" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/prose.md

# Find comment handling
grep -A 5 "## Comments" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/prose.md

# Find string escape sequences
grep -A 10 "Escape Sequences" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/prose.md

# Find examples
grep -A 20 "## Examples" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/prose.md

# Find validation rules
grep -A 10 "Validation" ${CLAUDE_PLUGIN_ROOT}/skills/open-prose/prose.md
```

## Quick Reference

Currently implemented features:

| Feature | Syntax | Description |
|---------|--------|-------------|
| Comments | `# text` | Standalone or inline comments |
| Strings | `"text"` | Single-line string literals |
| Sessions | `session "prompt"` | Spawn a subagent with prompt |

## Running OpenProse Programs

### Step 1: Check if Compiler is Available

Before executing a `.prose` file, check if the compiler works:

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

If validation passes, execute each statement sequentially.

For `session` statements, use Claude Code's **Task tool** to spawn a subagent:

```
Task({
  description: "OpenProse session",
  prompt: "<the session prompt>",
  subagent_type: "general-purpose"
})
```

Wait for each session to complete before proceeding to the next statement.

## Execution Model

When executing an OpenProse program:

1. **Validate** - Run the compiler to check for syntax errors
2. **Parse** - Identify statements (comments, sessions, etc.)
3. **Execute** - Process each statement sequentially

For simple programs with only comments and sessions, you can interpret directly by:
- Skipping lines that start with `#` (comments)
- Extracting the prompt from `session "..."` statements
- Spawning subagents for each session

## Compiler Commands

The compiler supports these commands:

```bash
# Validate syntax only
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts validate <file.prose>

# Compile and output canonical form
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts compile <file.prose>

# Show help
bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts --help
```

## Example Execution

Given this program:

```prose
# Research and summarize
session "Research recent developments in quantum computing"
session "Summarize the key findings in 3 bullet points"
```

Execute by:

1. Validate with `bun run ${CLAUDE_PLUGIN_ROOT}/bin/open-prose.ts validate program.prose`
2. Skip the comment line
3. Spawn a subagent with prompt "Research recent developments in quantum computing"
4. Wait for completion
5. Spawn a subagent with prompt "Summarize the key findings in 3 bullet points"
6. Wait for completion

For complete syntax and semantics, see `prose.md`.
