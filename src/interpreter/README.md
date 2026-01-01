# OpenProse Interpreter Documentation

This document describes how the Orchestrator (the runtime that executes OpenProse programs) should handle various language features.

## Overview

The OpenProse interpreter operates in two phases:

1. **Compilation Phase**: The compiler transforms OpenProse source code into a canonical form
2. **Execution Phase**: The Orchestrator interprets the compiled output and spawns subagent sessions

## Comments (Tier 0.2)

### Handling in Compilation

Comments are **removed during compilation**. They do not appear in the output sent to the Orchestrator.

### Runtime Behavior

Since comments are stripped during compilation, the Orchestrator never sees them. This means:

- Comments have **no effect on execution**
- They are purely for human documentation
- They cannot influence control flow or session behavior

### Comment Syntax

```prose
# This is a standalone comment
session "Hello"  # This is an inline comment
```

### Important Notes

1. **Comments inside strings are NOT comments**:
   ```prose
   session "Say hello # this is part of the string"
   ```
   The `#` inside the string literal is part of the prompt, not a comment.

2. **Empty comments are valid**:
   ```prose
   #
   session "Hello"
   ```

3. **Comments don't affect indentation**:
   ```prose
   do:
       # This comment is inside the block
       session "Hello"
   # This comment is outside the block
   ```

### Debugging with Comments

While comments are stripped from the compiled output by default, the compiler can optionally preserve them for debugging purposes:

```typescript
import { compile } from 'open-prose';

// Strip comments (default)
const result = compile(program);

// Preserve comments for debugging
const debugResult = compile(program, { preserveComments: true });
```

The `strippedComments` array in the compiler output contains information about all removed comments, including their original positions.

## Simple Session (Tier 1.1)

### Syntax

The simplest executable construct in OpenProse is the session statement:

```prose
session "Do something"
```

### How the Orchestrator Executes a Session

When the Orchestrator encounters a `session` statement, it performs the following steps:

1. **Spawn a Subagent Session**
   - The Orchestrator creates a new subagent session
   - The subagent is a Claude instance that will execute the prompt

2. **Send the Prompt**
   - The prompt string from the session statement is sent to the subagent
   - Example: `session "Analyze this data"` sends "Analyze this data" to the subagent

3. **Wait for Completion**
   - The Orchestrator blocks until the subagent session completes
   - The subagent processes the prompt and produces its output

4. **Continue Execution**
   - Once the session completes, the Orchestrator proceeds to the next statement
   - Any output from the session may be used by subsequent statements (in later tiers)

### Session Execution Flow

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

### Sequential Sessions

Multiple sessions execute sequentially:

```prose
session "First task"
session "Second task"
session "Third task"
```

Each session waits for the previous one to complete before starting.

### Session with Inline Comment

Comments do not affect session execution:

```prose
session "Hello"  # This is just for documentation
```

The Orchestrator only sees `session "Hello"` after compilation.

### Validation Rules

The validator enforces the following rules for sessions:

1. **Required Prompt**: A session must have a prompt (error if missing)
2. **Empty Prompt Warning**: Sessions with empty prompts (`session ""`) generate a warning
3. **Long Prompt Warning**: Prompts over 10,000 characters generate a warning suggesting to break into smaller tasks
4. **Whitespace-only Warning**: Prompts containing only whitespace generate a warning

### Canonical Form

A simple session is already in canonical form. The compiled output matches the input:

```
Input:  session "Hello"
Output: session "Hello"
```

Comments are stripped during compilation, but the session statement itself is unchanged.

## Future Features

This documentation will be expanded as more language features are implemented:

- Tier 1.2: Sequential blocks (do:)
- Tier 2: Agent definitions
- Tier 3: Skills and imports
- Tier 4: Variables and context
- And more...
