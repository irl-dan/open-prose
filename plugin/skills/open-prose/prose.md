# OpenProse Language Reference

OpenProse is a domain-specific language for orchestrating AI agent sessions. This document provides complete documentation for the language syntax, semantics, and execution model.

---

## Table of Contents

1. [Overview](#overview)
2. [File Format](#file-format)
3. [Comments](#comments)
4. [String Literals](#string-literals)
5. [Import Statements](#import-statements)
6. [Agent Definitions](#agent-definitions)
7. [Session Statement](#session-statement)
8. [Execution Model](#execution-model)
9. [Validation Rules](#validation-rules)
10. [Examples](#examples)
11. [Future Features](#future-features)

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
| Agent definitions | Implemented | `agent name:` with model/prompt properties |
| Session with agent | Implemented | `session: agent` with property overrides |
| Import statements | Implemented | `import "skill" from "source"` |
| Agent skills | Implemented | `skills: ["skill1", "skill2"]` |
| Agent permissions | Implemented | `permissions:` block with rules |

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

- **Comments inside indented blocks are allowed**:
  ```prose
  agent researcher:
      # This comment is inside the block
      model: sonnet
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

## Import Statements

Import statements load external skills that can be assigned to agents.

### Syntax

```prose
import "skill-name" from "source"
```

### Source Types

| Source Type | Format | Example |
|-------------|--------|---------|
| GitHub | `github:user/repo` | `github:anthropic/skills` |
| NPM | `npm:package` | `npm:@org/analyzer` |
| Local path | `./path` or `../path` | `./local-skills/my-skill` |

### Examples

```prose
# Import from GitHub
import "web-search" from "github:anthropic/skills"

# Import from npm
import "code-analyzer" from "npm:@company/analyzer"

# Import from local path
import "custom-tool" from "./skills/custom-tool"
import "shared-skill" from "../common/skills"
```

### Validation Rules

| Check | Severity | Message |
|-------|----------|---------|
| Empty skill name | Error | Import skill name cannot be empty |
| Empty source | Error | Import source cannot be empty |
| Duplicate import | Error | Skill already imported |
| Unknown source format | Warning | Should start with github:, npm:, or ./ |

### Execution Semantics

Import statements are processed before any agent definitions or sessions. The Orchestrator:

1. Validates all imports at the start of execution
2. Loads skill definitions from the specified sources
3. Makes skills available for agent assignment

---

## Agent Definitions

Agents are reusable templates that configure subagent behavior. Once defined, agents can be referenced in session statements.

### Syntax

```prose
agent name:
  model: sonnet
  prompt: "System prompt for this agent"
  skills: ["skill1", "skill2"]
  permissions:
    read: ["*.md"]
    bash: deny
```

### Properties

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `model` | identifier | `sonnet`, `opus`, `haiku` | The Claude model to use |
| `prompt` | string | Any string | System prompt/context for the agent |
| `skills` | array | String array | Skills assigned to this agent |
| `permissions` | block | Permission rules | Access control for the agent |

### Skills Property

The `skills` property assigns imported skills to an agent:

```prose
import "web-search" from "github:anthropic/skills"
import "summarizer" from "./local-skills"

agent researcher:
  skills: ["web-search", "summarizer"]
```

Skills must be imported before they can be assigned. Referencing an unimported skill generates a warning.

### Permissions Property

The `permissions` property controls agent access:

```prose
agent secure-agent:
  permissions:
    read: ["*.md", "*.txt"]
    write: ["output/"]
    bash: deny
    network: allow
```

#### Permission Types

| Type | Description |
|------|-------------|
| `read` | Files the agent can read (glob patterns) |
| `write` | Files the agent can write (glob patterns) |
| `execute` | Files the agent can execute (glob patterns) |
| `bash` | Shell access: `allow`, `deny`, or `prompt` |
| `network` | Network access: `allow`, `deny`, or `prompt` |

#### Permission Values

| Value | Description |
|-------|-------------|
| `allow` | Permission granted |
| `deny` | Permission denied |
| `prompt` | Ask user for permission |
| Array | List of allowed patterns (for read/write/execute) |

### Examples

```prose
# Define a research agent
agent researcher:
  model: sonnet
  prompt: "You are a research assistant skilled at finding and synthesizing information"

# Define a writing agent
agent writer:
  model: opus
  prompt: "You are a technical writer who creates clear, concise documentation"

# Agent with only model
agent quick:
  model: haiku

# Agent with only prompt
agent expert:
  prompt: "You are a domain expert"

# Agent with skills
agent web-researcher:
  model: sonnet
  skills: ["web-search", "summarizer"]

# Agent with permissions
agent file-handler:
  permissions:
    read: ["*.md", "*.txt"]
    write: ["output/"]
    bash: deny
```

### Model Selection

| Model | Use Case |
|-------|----------|
| `haiku` | Fast, simple tasks; quick responses |
| `sonnet` | Balanced performance; general purpose |
| `opus` | Complex reasoning; detailed analysis |

### Execution Semantics

When a session references an agent:

1. The agent's `model` property determines which Claude model is used
2. The agent's `prompt` property is included as system context
3. Session properties can override agent defaults

### Validation Rules

| Check | Severity | Message |
|-------|----------|---------|
| Duplicate agent name | Error | Agent already defined |
| Invalid model value | Error | Must be sonnet, opus, or haiku |
| Empty prompt property | Warning | Consider providing a prompt |
| Duplicate property | Error | Property already specified |

---

## Session Statement

The session statement is the primary executable construct in OpenProse. It spawns a subagent to complete a task.

### Syntax Variants

#### Simple Session (with inline prompt)

```prose
session "prompt text"
```

#### Session with Agent Reference

```prose
session: agentName
```

#### Named Session with Agent

```prose
session sessionName: agentName
```

#### Session with Properties

```prose
session: agentName
  prompt: "Override the agent's default prompt"
  model: opus  # Override the agent's model
```

### Property Overrides

When a session references an agent, it can override the agent's properties:

```prose
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

# Use researcher with different model
session: researcher
  model: opus

# Use researcher with different prompt
session: researcher
  prompt: "Research this specific topic in depth"

# Override both
session: researcher
  model: opus
  prompt: "Specialized research task"
```

### Execution Semantics

When the Orchestrator encounters a `session` statement:

1. **Resolve Configuration**: Merge agent defaults with session overrides
2. **Spawn a Subagent**: Create a new Claude subagent with the resolved configuration
3. **Send the Prompt**: Pass the prompt string to the subagent
4. **Wait for Completion**: Block until the subagent finishes
5. **Continue**: Proceed to the next statement

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
// Simple session
Task({
  description: "OpenProse session",
  prompt: "The prompt from the session statement",
  subagent_type: "general-purpose"
})

// Session with agent configuration
Task({
  description: "OpenProse session",
  prompt: "The session prompt",
  subagent_type: "general-purpose",
  model: "opus"  // From agent or override
})
```

### Validation Rules

| Check | Severity | Message |
|-------|----------|---------|
| Missing prompt and agent | Error | Session requires a prompt or agent reference |
| Undefined agent reference | Error | Agent not defined |
| Empty prompt `""` | Warning | Session has empty prompt |
| Whitespace-only prompt | Warning | Session prompt contains only whitespace |
| Prompt > 10,000 chars | Warning | Consider breaking into smaller tasks |
| Duplicate property | Error | Property already specified |

### Examples

```prose
# Simple session
session "Hello world"

# Session with agent
agent researcher:
  model: sonnet
  prompt: "You research topics thoroughly"

session: researcher
  prompt: "Research quantum computing applications"

# Named session
session analysis: researcher
  prompt: "Analyze the competitive landscape"
```

### Canonical Form

The compiled output preserves the structure:

```
Input:
agent researcher:
  model: sonnet

session: researcher
  prompt: "Do research"

Output:
agent researcher:
  model: sonnet
session: researcher
  prompt: "Do research"
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
2. **Collect Agents**: Register all agent definitions
3. **Execute**: Process each statement in order
4. **Spawn**: Create subagents with resolved configurations
5. **Coordinate**: Manage context passing between sessions

### Orchestrator Behavior

| Aspect | Behavior |
|--------|----------|
| Execution order | Strict - follows program exactly |
| Session creation | Strict - creates what program specifies |
| Agent resolution | Strict - merge properties deterministically |
| Context passing | Intelligent - summarizes/transforms as needed |
| Completion detection | Intelligent - determines when session is "done" |

### State Management

For the current implementation, state is tracked in-context (conversation history):

| State Type | Tracking Approach |
|------------|-------------------|
| Agent definitions | Collected at program start |
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
| E003 | Session missing prompt or agent |
| E004 | Unexpected token |
| E005 | Invalid syntax |
| E006 | Duplicate agent definition |
| E007 | Undefined agent reference |
| E008 | Invalid model value |
| E009 | Duplicate property |
| E010 | Duplicate import |
| E011 | Empty import skill name |
| E012 | Empty import source |
| E013 | Skills must be an array |
| E014 | Skill name must be a string |
| E015 | Permissions must be a block |
| E016 | Permission pattern must be a string |

### Warnings (Non-blocking)

| Code | Description |
|------|-------------|
| W001 | Empty session prompt |
| W002 | Whitespace-only session prompt |
| W003 | Session prompt exceeds 10,000 characters |
| W004 | Empty prompt property |
| W005 | Unknown property name |
| W006 | Unknown import source format |
| W007 | Skill not imported |
| W008 | Unknown permission type |
| W009 | Unknown permission value |
| W010 | Empty skills array |

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

### Research Pipeline with Agents

```prose
# Define specialized agents
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

agent writer:
  model: opus
  prompt: "You are a technical writer"

# Execute workflow
session: researcher
  prompt: "Research recent developments in quantum computing"

session: writer
  prompt: "Write a summary of the research findings"
```

### Code Review Workflow

```prose
agent reviewer:
  model: sonnet
  prompt: "You are an expert code reviewer"

session: reviewer
  prompt: "Read the code in src/ and identify potential bugs"

session: reviewer
  prompt: "Suggest fixes for each bug found"

session: reviewer
  prompt: "Create a summary of all changes needed"
```

### Multi-step Task with Model Override

```prose
agent analyst:
  model: haiku
  prompt: "You analyze data quickly"

# Quick initial analysis
session: analyst
  prompt: "Scan the data for obvious patterns"

# Detailed analysis with more powerful model
session: analyst
  model: opus
  prompt: "Perform deep analysis on the patterns found"
```

### Comments for Documentation

```prose
# Project: Quarterly Report Generator
# Author: Team Lead
# Date: 2024-01-01

agent data-collector:
  model: sonnet
  prompt: "You gather and organize data"

agent analyst:
  model: opus
  prompt: "You analyze data and create insights"

# Step 1: Gather data
session: data-collector
  prompt: "Collect all sales data from the past quarter"

# Step 2: Analysis
session: analyst
  prompt: "Perform trend analysis on the collected data"

# Step 3: Report generation
session: analyst
  prompt: "Generate a formatted quarterly report with charts"
```

### Workflow with Skills and Permissions

```prose
# Import external skills
import "web-search" from "github:anthropic/skills"
import "file-writer" from "./local-skills"

# Define a secure research agent
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
  skills: ["web-search"]
  permissions:
    read: ["*.md", "*.txt"]
    bash: deny

# Define a writer agent
agent writer:
  model: opus
  prompt: "You create documentation"
  skills: ["file-writer"]
  permissions:
    write: ["docs/"]
    bash: deny

# Execute workflow
session: researcher
  prompt: "Research AI safety topics"

session: writer
  prompt: "Write a summary document"
```

---

## Future Features

The following features are specified but not yet implemented:

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
statement   → agentDef | session | comment
agentDef    → "agent" IDENTIFIER ":" NEWLINE INDENT property* DEDENT
session     → "session" ( string | ":" IDENTIFIER | IDENTIFIER ":" IDENTIFIER )
              ( NEWLINE INDENT property* DEDENT )?
property    → ( "model" | "prompt" | IDENTIFIER ) ":" ( IDENTIFIER | string )
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
