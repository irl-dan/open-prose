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

## Future Features

This documentation will be expanded as more language features are implemented:

- Tier 1: Simple sessions and sequences
- Tier 2: Agent definitions
- Tier 3: Skills and imports
- Tier 4: Variables and context
- And more...
