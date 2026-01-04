# OpenProse Specification: Composition

> Derived from CEO interview on 2024-12-30

---

## Overview

Composition in OpenProse allows grouping sessions into **blocks**—either anonymous (inline) or named (reusable). Blocks can be nested arbitrarily and composed together.

---

## Block Types

OpenProse supports three core block types:

| Block | Behavior |
|-------|----------|
| `do:` | Sequential execution (default) |
| `parallel:` | Concurrent execution (with modifiers for join strategies) |
| `choice **criteria**:` | Orchestrator picks one based on criteria |

### Sequential Block

```
do:
  session "A"
  session "B"
  session "C"
```

### Parallel Block

```
parallel:
  session "A"
  session "B"
  session "C"
```

For race semantics (first to complete wins), use the `"first"` modifier:

```
parallel ("first"):
  session "Fast path"
  session "Slow path"
```

See Parallel specification for all join strategies.

### Choice Block

The Orchestrator decides which branch to take based on the specified criteria. Use `**...**` orchestrator discretion syntax:

```
choice **based on urgency**:
  session "Quick fix for urgent issues"
  session "Thorough solution for complex problems"

choice **user preference**:
  session "Detailed explanation"
  session "Brief summary"
```

The criteria phrase guides the Orchestrator's decision-making based on accumulated context. See Syntax specification for full details on orchestrator discretion syntax.

---

## Anonymous Blocks

Anonymous blocks use **indentation-based syntax** (Python-like):

```
do:
  session "First"
  session "Second"

parallel:
  session "Branch A"
  session "Branch B"
```

---

## Named Blocks

Named blocks use the `block` keyword and can be reused:

### Definition

```
block review-pipeline:
  session "Review"
  session "Synthesize"
```

### Invocation

Block invocation uses the `do` prefix:

```
block my-pipeline:
  session "A"
  session "B"

do my-pipeline  # invoke
do my-pipeline  # invoke again
```

**Rationale:** The `do` prefix provides:
- Consistency with `do:` for anonymous blocks
- Unambiguous execution (vs variable/agent name references)
- Clean transition to parameters: `do my-pipeline topic="AI"`

---

## Implicit Sequence

Top-level statements are implicitly sequential:

```
# These two are equivalent:

session "A"
session "B"
session "C"

# Same as:
do:
  session "A"
  session "B"
  session "C"
```

---

## Nesting

Arbitrary nesting is allowed:

```
block outer:
  session "Start"
  parallel:
    session "A"
    session "B"
  session "End"
```

### Scope

Lexical scope applies (inner blocks see outer bindings):

```
block outer:
  let x = session "Get X"

  block inner:
    session "Use {x}"  # inner sees x
```

**Note:** Scope/binding implementation is deferred.

---

## Block Composition

Blocks can contain and reference other blocks:

```
block review:
  parallel:
    session "Security"
    session "Performance"

block full-pipeline:
  session "Write code"
  do review
  session "Finalize"
```

---

## Block Parameters

Blocks can accept parameters for reusable patterns:

```
block research(topic):
  session "Research {topic}"
  session "Summarize findings about {topic}"

do research("quantum computing")
do research("machine learning")
```

Parameters are passed by name:

```
block analyze(topic, depth):
  session "Analyze {topic} at {depth} level"

do analyze(topic: "AI safety", depth: "deep")
```

---

## Not Supported (Deferred)

| Feature | Status | Notes |
|---------|--------|-------|
| Default parameter values | Deferred | `block foo(x = default):` |
| Block aliases | Not needed | `alias x = y` |
| Block export/import | Deferred | File-local only for now |
| Block return values | TBD | Orchestrator handles via context passing |

---

## Cross-References

- **Parallel execution details**: See Parallel specification
- **Block return values**: See Wiring or Orchestrator specification
- **`choice:` block**: Orchestrator determines branch selection

---

## Example

```
import "web-search" from "github:example/web-search"

agent researcher:
  model: sonnet
  skills: ["web-search"]

# Named reusable block with parameter
block research-phase(topic):
  parallel:
    session search1: researcher
      prompt: "Research {topic} from perspective A"
    session search2: researcher
      prompt: "Research {topic} from perspective B"
  session "Synthesize findings about {topic}"

# Main program (implicit sequence)
session "Initialize"
do research-phase("quantum computing")
session "Finalize report"
```
