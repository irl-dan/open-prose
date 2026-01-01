# OpenProse Language Reference

OpenProse is a domain-specific language for orchestrating AI agent sessions. This document provides complete documentation for the language syntax, semantics, and execution model.

---

## Table of Contents

1. [Overview](#overview)
2. [File Format](#file-format)
3. [Comments](#comments)
4. [String Literals](#string-literals)
5. [Session Statement](#session-statement)
6. [Execution Model](#execution-model)
7. [Validation Rules](#validation-rules)
8. [Examples](#examples)
9. [Future Features](#future-features)

---

## Overview

OpenProse provides a declarative syntax for defining multi-agent workflows. Programs consist of statements that are executed sequentially, with each `session` statement spawning a subagent to complete a task.

### Design Principles

- **Readability**: Python-like syntax with indentation-based blocks
- **Self-evident**: Programs should be understandable without extensive documentation
- **Framework-agnostic**: Works with Claude Code, OpenCode, and other agent frameworks
- **Hybrid execution**: Strict control flow with intelligent context passing

### Current Implementation Status

The following features are implemented:

| Feature | Status | Description |
|---------|--------|-------------|
| Comments | Implemented | `# comment` syntax |
| Single-line strings | Implemented | `"string"` with escapes |
| Simple session | Implemented | `session "prompt"` |

---

## File Format

| Property | Value |
|----------|-------|
| Extension | `.prose` |
| Encoding | UTF-8 |
| Case sensitivity | Case-sensitive |
| Indentation | Spaces (Python-like) |
| Line endings | LF or CRLF |

---

## Comments

Comments provide documentation within programs and are ignored during execution.

### Syntax

```prose
# This is a standalone comment

session "Hello"  # This is an inline comment
```

### Rules

1. Comments begin with `#` and extend to end of line
2. Comments can appear on their own line or after a statement
3. Empty comments are valid: `#`
4. The `#` character inside string literals is NOT a comment

### Examples

```prose
# Program header comment
# Author: Example

session "Do something"  # Explain what this does

# This comment is between statements
session "Do another thing"
```

### Compilation Behavior

Comments are **stripped during compilation**. The Orchestrator never sees them. They have no effect on execution and exist purely for human documentation.

### Important Notes

- **Comments inside strings are NOT comments**:
  ```prose
  session "Say hello # this is part of the string"
  ```
  The `#` inside the string literal is part of the prompt, not a comment.

- **Comments don't affect indentation** (when blocks are implemented):
  ```prose
  do:
      # This comment is inside the block
      session "Hello"
  # This comment is outside the block
  ```

---

## String Literals

String literals represent text values, primarily used for session prompts.

### Syntax

Strings are enclosed in double quotes:

```prose
"This is a string"
```

### Escape Sequences

The following escape sequences are supported:

| Sequence | Meaning |
|----------|---------|
| `\\` | Backslash |
| `\"` | Double quote |
| `\n` | Newline |
| `\t` | Tab |

### Examples

```prose
session "Hello world"
session "Line one\nLine two"
session "She said \"hello\""
session "Path: C:\\Users\\name"
session "Column1\tColumn2"
```

### Rules

1. Strings must be on a single line (multi-line strings `"""` are not yet implemented)
2. Strings must be properly terminated with a closing `"`
3. Unknown escape sequences are errors
4. Empty strings `""` are valid but generate a warning when used as prompts

### Validation

| Check | Result |
|-------|--------|
| Unterminated string | Error |
| Unknown escape sequence | Error |
| Empty string as prompt | Warning |

---

## Session Statement

The session statement is the primary executable construct in OpenProse. It spawns a subagent to complete a task.

### Syntax

```prose
session "prompt text"
```

### Execution Semantics

When the Orchestrator encounters a `session` statement:

1. **Spawn a Subagent**: Create a new Claude subagent session
2. **Send the Prompt**: Pass the prompt string to the subagent
3. **Wait for Completion**: Block until the subagent finishes
4. **Continue**: Proceed to the next statement

### Execution Flow Diagram

```
Orchestrator                    Subagent
    |                              |
    |  spawn session               |
    |----------------------------->|
    |                              |
    |  send prompt                 |
    |----------------------------->|
    |                              |
    |  [processing...]             |
    |                              |
    |  session complete            |
    |<-----------------------------|
    |                              |
    |  continue to next statement  |
    v                              v
```

### Sequential Execution

Multiple sessions execute sequentially:

```prose
session "First task"
session "Second task"
session "Third task"
```

Each session waits for the previous one to complete before starting.

### Using Claude Code's Task Tool

To execute a session, use the Task tool:

```typescript
Task({
  description: "OpenProse session",
  prompt: "The prompt from the session statement",
  subagent_type: "general-purpose"
})
```

### Validation Rules

| Check | Severity | Message |
|-------|----------|---------|
| Missing prompt | Error | Session must have a prompt |
| Empty prompt `""` | Warning | Session has empty prompt |
| Whitespace-only prompt | Warning | Session prompt contains only whitespace |
| Prompt > 10,000 chars | Warning | Consider breaking into smaller tasks |

### Examples

```prose
# Simple session
session "Hello world"

# Session with detailed prompt
session "Analyze the provided data and create a summary report with key insights"

# Session with escaped characters
session "Create a file with the following content:\n- Item 1\n- Item 2"
```

### Canonical Form

A simple session is already in canonical form. The compiled output matches the input:

```
Input:  session "Hello"
Output: session "Hello"
```

---

## Execution Model

OpenProse uses a two-phase execution model.

### Phase 1: Compilation (Static)

The compile phase handles deterministic preprocessing:

1. **Parse**: Convert source code to AST
2. **Validate**: Check for syntax and semantic errors
3. **Expand**: Normalize syntax sugar (when implemented)
4. **Output**: Generate canonical program

### Phase 2: Runtime (Intelligent)

The Orchestrator executes the compiled program:

1. **Load**: Receive the compiled program
2. **Execute**: Process each statement in order
3. **Spawn**: Create subagents for session statements
4. **Coordinate**: Manage context passing between sessions

### Orchestrator Behavior

| Aspect | Behavior |
|--------|----------|
| Execution order | Strict - follows program exactly |
| Session creation | Strict - creates what program specifies |
| Context passing | Intelligent - summarizes/transforms as needed |
| Completion detection | Intelligent - determines when session is "done" |

### State Management

For the current implementation, state is tracked in-context (conversation history):

| State Type | Tracking Approach |
|------------|-------------------|
| Execution flow | Implicit reasoning ("completed X, now executing Y") |
| Session outputs | Held in conversation history |
| Position in program | Tracked by Orchestrator |

---

## Validation Rules

The validator checks programs for errors and warnings before execution.

### Errors (Block Execution)

| Code | Description |
|------|-------------|
| E001 | Unterminated string literal |
| E002 | Unknown escape sequence in string |
| E003 | Session missing prompt |
| E004 | Unexpected token |
| E005 | Invalid syntax |

### Warnings (Non-blocking)

| Code | Description |
|------|-------------|
| W001 | Empty session prompt |
| W002 | Whitespace-only session prompt |
| W003 | Session prompt exceeds 10,000 characters |

### Error Message Format

Errors include location information:

```
Error at line 5, column 12: Unterminated string literal
  session "Hello
          ^
```

---

## Examples

### Minimal Program

```prose
session "Hello world"
```

### Research Pipeline

```prose
# Research and summarize a topic
session "Research recent developments in quantum computing"
session "Summarize the key findings in 3 bullet points"
session "Identify potential applications for each finding"
```

### Multi-step Task

```prose
# Code review workflow
session "Read the code in src/main.ts and identify potential bugs"
session "Suggest fixes for each bug found"
session "Create a summary of all changes needed"
```

### With Detailed Prompts

```prose
# Data analysis task
session "Load the CSV file from data/sales.csv and analyze the following:\n- Total revenue by month\n- Top 5 products by sales volume\n- Customer acquisition trends"

session "Based on the analysis, create recommendations for Q2 strategy"
```

### Comments for Documentation

```prose
# Project: Quarterly Report Generator
# Author: Team Lead
# Date: 2024-01-01

# Step 1: Gather data
session "Collect all sales data from the past quarter"

# Step 2: Analysis
session "Perform trend analysis on the collected data"

# Step 3: Report generation
session "Generate a formatted quarterly report with charts"
```

---

## Future Features

The following features are specified but not yet implemented:

### Tier 2: Agents
- Agent definitions with model, skills, permissions
- Session-agent binding
- Property overrides

### Tier 3: Skills & Imports
- `import "skill" from "source"` syntax
- Agent skill assignment

### Tier 4: Variables & Context
- `let` and `const` bindings
- Explicit context passing

### Tier 5: Composition
- `do:` sequential blocks
- `->` inline sequences
- Named blocks

### Tier 6-7: Parallel Execution
- `parallel:` blocks
- Join strategies (all, first, any)
- Failure policies

### Tier 8-9: Loops
- `repeat N:` fixed iterations
- `for item in items:` iteration
- `loop until **condition**:` unbounded loops

### Tier 10: Pipeline Operations
- `map`, `filter`, `reduce`
- Pipeline chaining with `|`

### Tier 11: Error Handling
- `try`/`catch`/`finally`
- `retry` modifier

### Tier 12: Advanced
- Multi-line strings `"""`
- String interpolation `{variable}`
- `choice` blocks
- `if`/`else` conditionals

---

## Syntax Grammar (Implemented)

```
program     → statement* EOF
statement   → session | comment
session     → "session" string
comment     → "#" text NEWLINE
string      → '"' character* '"'
character   → escape | non-quote
escape      → "\\" | "\"" | "\n" | "\t"
```

---

## Compiler API

The bundled compiler can be used programmatically:

```bash
# Validate and compile a program
./scripts/compile program.prose

# Output: canonical program or error messages
```

For direct interpretation without compilation, parse and execute statements as described in the Session Statement section.
