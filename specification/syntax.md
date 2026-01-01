# OpenProse Specification: Syntax

> Derived from CEO interviews on 2024-12-30, 2024-12-31

---

## Overview

OpenProse uses a **hybrid/Python-like syntax** with indentation-based blocks, keyword-driven constructs, and minimal punctuation. The syntax prioritizes readability and TypeScript-like balance between explicit and implicit.

---

## File Format

| Property | Value |
|----------|-------|
| Extension | `.prose` |
| Case sensitivity | Case-sensitive, lowercase convention |
| Indentation | Spaces (Python-like) |
| Comments | `#` (hash) |

---

## String Literals

### Single-line

```
session "This is a prompt"
```

### Multi-line (Triple Quotes)

```
session """
  This is a long
  multi-line prompt
"""
```

### String Interpolation

```
session "Process {item}"
session "Step {i} of {total}"
```

Uses `{variable}` syntax (not `${variable}`).

---

## Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `->` | Inline sequence | `session "A" -> session "B"` |
| `\|` | Pipe/transform | `items \| map: session "..."` |
| `=` | Assignment | `let x = session "..."` |
| `:` | Block start | `parallel:` |
| `**...**` | Orchestrator discretion | `loop until **approved**:` |

---

## Orchestrator Discretion Syntax

When the program needs the Orchestrator to make an intelligent judgment (rather than follow strict rules), use **markdown bold syntax** (`**...**`):

### Single-word Conditions

```
loop until **approved**:
  session "Write draft"
  session "Get feedback"
```

The Orchestrator interprets the session outputs semantically to determine when `**approved**` becomes true.

### Multi-word Phrases

```
loop until **user is satisfied**:
  session "Propose solution"
  session "Get user feedback"

choice **based on urgency**:
  session "Quick fix"
  session "Thorough solution"
```

### Multi-line Conditions (Triple Asterisks)

For complex conditions, use triple asterisks:

```
loop until ***
  the reviewer has approved all changes
  and no further modifications are needed
***:
  session "Make improvements"
  session "Request review"
```

### When to Use

Use `**...**` syntax when:
- Loop termination depends on semantic interpretation (`loop until **done**`)
- Branch selection requires judgment (`choice **based on context**`)
- The condition cannot be expressed as a simple boolean

The Orchestrator will analyze session outputs and accumulated context to evaluate these conditions.

---

## Keywords

### Core

| Keyword | Purpose |
|---------|---------|
| `import` | Import skills |
| `agent` | Define agent template |
| `session` | Create session instance |
| `block` | Define named reusable block |
| `do` | Sequential execution / invoke block |
| `parallel` | Parallel execution |
| `choice` | Orchestrator-selected branch |
| `let` | Mutable variable binding |
| `const` | Immutable variable binding |

### Control Flow

| Keyword | Purpose |
|---------|---------|
| `loop` | Unbounded loop |
| `loop until` | Conditional loop |
| `loop while` | Conditional loop |
| `repeat` | Fixed iterations |
| `for ... in` | Collection iteration |
| `if` / `else` | Conditionals (via orchestrator) |

### Error Handling

| Keyword | Purpose |
|---------|---------|
| `try` | Try block |
| `catch` | Catch block |
| `finally` | Finally block |
| `throw` | Rethrow error to outer handler |
| `retry` | Retry modifier |

### Pipeline

| Keyword | Purpose |
|---------|---------|
| `map` | Transform each item |
| `filter` | Select items |
| `reduce` | Accumulate results |
| `pmap` | Parallel map |

---

## Grammar Summary

```
# Imports (quoted skill names)
import "skill-name" from "source"

# Agent definition (quoted skills array)
agent name:
  model: tier
  skills: ["skill1", "skill2"]
  permissions:
    tool: action

# Session variations
session "prompt"
session: agent
  prompt: "..."
session name: agent
  prompt: "..."

# Composition
do:
  statements

parallel:
  statements

parallel ("first"):    # with quoted modifier
  statements

block name:
  statements

block name(param):     # with parameters
  statements

do name               # invoke block
do name("arg")        # invoke with argument

# Control flow
loop:
  statements

loop until **condition**:    # orchestrator discretion
  statements

repeat N:
  statements

for item in items:
  statements

# Orchestrator choice
choice **criteria**:
  statements

# Pipeline
items | map: session "..."
items | filter: session "..."
items | reduce(acc, item): session "..."

# Error handling
try:
  statements
catch:
  statements
  throw  # optional rethrow
finally:
  statements

# Variables
let name = expression      # mutable
const name = expression    # immutable
```

---

## Rejected Syntax Styles

The following were explicitly rejected by CEO:

- **Lisp-style**: `(session "prompt" (parallel ...))`
- **Java/TS braces**: `parallel { session("A"); session("B"); }`
- **Hybrid do-while**: Mixed keyword/symbol style

---

## Cross-References

- **Composition details**: See Composition specification
- **Loop constructs**: See Loops specification
- **Pipeline operations**: See Loops specification (Pipeline Operations section)
- **Error handling**: See Error Handling specification
