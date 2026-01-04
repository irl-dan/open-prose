# OpenProse Specification: Wiring & Context Passing

> Derived from CEO interviews on 2024-12-30

---

## Overview

Context passing between sessions is handled **intelligently by the Orchestrator**. This is the "intelligent" part of the hybrid execution model—while control flow is strict, data transformation is discretionary.

---

## Design Principles

1. **Orchestrator controls transformation** — Summarizes, extracts, formats as needed
2. **No structured returns required** — Natural language output is interpreted semantically
3. **Prompt guidance helps** — Write focused prompts to assist interpretation

---

## Context Passing Modes

### Default: Implicit Passing

Immediate predecessor's output passes to next session automatically:

```
session "A" -> session "B" -> session "C"
# C receives B's output only (B received A's output)
```

### Explicit Single Context

Override the default with `context:` property:

```
let research = session "Research topic"

session "Write article":
  context: research    # Explicitly pass research output
```

Without `context:`, the writer would receive research output implicitly (as predecessor). With `context:`, it's explicit and survives refactoring.

### Explicit Multiple Contexts

Combine multiple sources:

```
let research = session "Research topic"
let outline = session "Create outline"
let style = session "Load style guide"

session "Write article":
  context: [research, outline, style]    # All three as input
```

### Named Results (from Parallel)

Capture parallel branch results by name using object syntax:

```
parallel:
  sec = session "Security review"
  perf = session "Performance review"

session "Synthesize":
  context: { sec, perf }    # Object syntax for named contexts
```

### Skip Predecessor Context

To receive no predecessor context, use empty list:

```
session "Step 1"
session "Step 2"
session "Step 3":
  context: []    # Receive NO context from Step 2
```

This is useful when a session should start fresh without prior context.

---

## How It Works

1. **Session completes** — Subagent returns output to Orchestrator
2. **Orchestrator interprets** — Reads output, extracts key information
3. **Context is passed** — Summarized/transformed as needed for next session
4. **Prompt guidance helps** — Focused prompts assist extraction

---

## Large Outputs

When session output is large:
- Orchestrator summarizes intelligently
- No explicit token limits configured
- Trust the model to be reasonable

Some information loss is acceptable—programs should be designed with this in mind.

---

## The `context` Property

The `context:` property is used on session blocks to control what information flows into the session.

| Syntax | Meaning |
|--------|---------|
| (omitted) | Implicit: receive predecessor's output |
| `context: var` | Single explicit context |
| `context: [a, b, c]` | Multiple contexts (array) |
| `context: { x, y }` | Named contexts (object, from parallel) |
| `context: []` | No context (start fresh) |

## Syntax Summary

```
# Implicit (default)
session "A"
  -> session "B"

# Explicit single
session "C":
  context: research

# Explicit multiple
session "D":
  context: [research, outline, style]

# Named from parallel
parallel:
  x = session "X"
  y = session "Y"

session "Z":
  context: { x, y }

# No context
session "Fresh Start":
  context: []
```

---

## Cross-References

- **Orchestrator behavior**: See Orchestrator specification
- **Parallel execution**: See Parallel specification
- **Named results**: See Composition specification
