---
name: open-prose
description: |
  Use when user asks to run, execute, or interpret .prose files.
  Use when user mentions OpenProse or prose programs.
  Use when orchestrating multi-agent sessions from a script.
  Use when user wants to define agent workflows in a declarative language.
---

# OpenProse Skill

OpenProse is a domain-specific language for orchestrating AI agent sessions. It provides a declarative, Python-like syntax for defining multi-agent workflows that execute via Claude Code's subagent system.

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
grep -A 10 "## Session" prose.md

# Find comment handling
grep -A 5 "## Comments" prose.md

# Find string escape sequences
grep -A 10 "Escape Sequences" prose.md

# Find examples
grep -A 20 "## Examples" prose.md

# Find validation rules
grep -A 10 "Validation" prose.md
```

## Quick Reference

Currently implemented features:

| Feature | Syntax | Description |
|---------|--------|-------------|
| Comments | `# text` | Standalone or inline comments |
| Strings | `"text"` | Single-line string literals |
| Sessions | `session "prompt"` | Spawn a subagent with prompt |

## Execution Model

When executing an OpenProse program:

1. **Parse** the program to identify statements
2. **Validate** syntax and semantics
3. **Execute** each statement sequentially

For `session` statements, use Claude Code's **Task tool** to spawn a subagent:

```
Task({
  description: "OpenProse session",
  prompt: "<the session prompt>",
  subagent_type: "general-purpose"
})
```

Wait for each session to complete before proceeding to the next statement.

## Compilation (Optional)

The skill includes a bundled compiler in `scripts/compile` that can:

- Validate program syntax
- Expand syntax sugar
- Generate canonical output

Run it with:

```bash
./scripts/compile compile program.prose   # Compile and output canonical form
./scripts/compile validate program.prose  # Validate only
```

**Note**: The bundled binary is compiled for macOS arm64. For other platforms, run from the repository root:

```bash
bun run bin/open-prose.ts compile program.prose
```

For simple programs, you can interpret directly without compilation.

## Example Execution

Given this program:

```prose
# Research and summarize
session "Research recent developments in quantum computing"
session "Summarize the key findings in 3 bullet points"
```

Execute by:

1. Skip the comment line
2. Spawn a subagent with prompt "Research recent developments in quantum computing"
3. Wait for completion
4. Spawn a subagent with prompt "Summarize the key findings in 3 bullet points"
5. Wait for completion

For complete syntax and semantics, see `prose.md`.
