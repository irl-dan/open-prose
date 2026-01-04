# OpenProse Specification: Loops

> Derived from CEO interviews on 2024-12-30, 2024-12-31

---

## Overview

OpenProse supports unbounded loops without requiring explicit bounds. Loop constructs use **keyword-based syntax** and rely on runtime safeguards (timeout, cost limits, manual intervention) rather than compile-time restrictions.

---

## Loop Constructs

### Infinite Loop

```
loop:
  session "Monitor for events"
  session "Handle event"
```

No explicit termination—relies on runtime safeguards or manual intervention.

### Repeat N Times

```
repeat 3:
  session "Attempt solution"
```

With index access:

```
repeat 5 as i:
  session "Attempt {i} of 5"
```

### Loop Until (Conditional)

```
loop until **approved**:
  session "Write draft"
  session "Get feedback"
```

The `**approved**` syntax signals that the Orchestrator should interpret session outputs semantically to determine when the condition is met. See Syntax specification for full details on orchestrator discretion syntax.

### Loop While (Conditional)

```
loop while **needs_work**:
  session "Process next item"
```

Same semantics as `loop until`—the Orchestrator evaluates `**needs_work**` based on context.

### For-Each

```
for item in items:
  session "Process {item}"
```

With index:

```
for item, i in items:
  session "Process item {i}"
```

For functional-style transformations, see **Pipeline Operations** below.

---

## Iteration Variable

Access current iteration count using `as`:

```
loop as i:
  session "Iteration {i}"

repeat 10 as i:
  session "Attempt {i}"
```

---

## Loop + Parallel

### Parallel For-Each (Fan-Out)

```
parallel for item in items:
  session "Process {item}"
```

### Sequential Loop with Parallel Body

```
loop until **done**:
  parallel:
    session "A"
    session "B"
  session "Merge and check"
```

---

## Pipeline Operations

Functional-style transformations using pipe (`|`) syntax. These complement (not replace) traditional for-each loops.

### Map (Transform Each Item)

```
items | map: session "Process {item}"
```

Implicit `{item}` binding refers to the current element.

### Filter (Select Items)

```
items | filter: session "Is {item} relevant?"
```

Uses intelligent orchestrator to determine inclusion based on session output.

### Reduce (Accumulate Results)

```
items | reduce(summary, item):
  session "Add {item} findings to {summary}"
```

The first parameter is the accumulator, the second is the current item.

### Chaining

Pipelines can be chained for complex transformations:

```
files
  | filter: session "Is {item} relevant?"
  | map: session "Extract key info from {item}"
  | reduce(report, info):
      session "Add {info} to {report}"
```

Reads naturally: "Filter files, map each to info, reduce into report."

### Parallel Map

```
items | pmap: session "Process {item}"
```

**Implementation Note:** CEO prefers finding a more obvious keyword than `pmap` if possible (e.g., `parallel` if not overloaded).

---

## Safeguards

Since unbounded loops are allowed, safeguards are essential. These are deferred but documented for future implementation:

| Safeguard | Description |
|-----------|-------------|
| Timeout | `loop (timeout: 1h):` |
| Cost limit | `loop (max-cost: $10):` |
| Iteration warning | `loop (warn-after: 100):` |
| Manual confirmation | `loop (confirm-every: 10):` |

**CEO Note:** Manual intervention should come "for free" if the orchestrator is a normal interactive session (Ctrl+C, etc.).

---

## Dependencies

Several loop features depend on decisions in other specifications:

| Feature | Depends On |
|---------|-----------|
| `loop until **condition**` | Orchestrator discretion syntax (SYNTAX.md) |
| `loop while **condition**` | Orchestrator discretion syntax (SYNTAX.md) |
| Loop state/accumulation | State passing design (WIRING.md) |
| Early exit (`break`) | Deferred pending use cases |

---

## Not Supported (Deferred)

| Feature | Status | Notes |
|---------|--------|-------|
| Early exit (`break`) | Deferred | Pending use cases |
| Explicit condition expressions | Deferred | `until feedback.score > 0.9` |
| Loop error handling | Deferred | `on-fail: retry/break/continue` |
| Named loops for targeted break | Deferred | |
| Loop result semantics | Deferred | What does a loop "return"? |

**Resolved:** Loop state/accumulation addressed via `reduce` pipeline operator.

---

## Syntax

Keyword-based syntax is preferred:

```
loop:
  body

loop until **condition**:
  body

loop while **condition**:
  body

repeat N:
  body

for item in collection:
  body
```

Conditions use `**...**` orchestrator discretion syntax. Lisp-style and hybrid syntaxes were rejected.

---

## Example

```
import "code-review" from "github:example/code-review"

agent reviewer:
  model: sonnet
  skills: ["code-review"]

# Fixed iterations
repeat 3:
  session "Generate solution variant"

# Conditional loop (orchestrator discretion)
loop until **approved**:
  session draft: reviewer
    prompt: "Review and improve the code"
  session "Get stakeholder feedback"

# Parallel fan-out
parallel for file in changed_files:
  session "Review {file}"

# Infinite monitoring loop
loop:
  session "Check for new PRs"
  session "Process if found"

# Pipeline transformation
changed_files
  | filter: session "Has {item} security implications?"
  | map: session "Analyze {item} for vulnerabilities"
  | reduce(report, finding):
      session "Add {finding} to {report}"
```
