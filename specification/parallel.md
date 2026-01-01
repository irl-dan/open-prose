# OpenProse Specification: Parallel Execution

> Derived from CEO interview on 2024-12-31

---

## Overview

OpenProse supports parallel execution of sessions with configurable join strategies and failure policies. The intelligent orchestrator manages parallel subagent spawning and result collection.

---

## Join Strategies

All strategies are supported (implemented via intelligent orchestrator):

| Strategy | Keyword | Behavior |
|----------|---------|----------|
| All | `parallel:` | Wait for all branches (default) |
| First/Race | `parallel ("first"):` | First to complete wins |
| Any | `parallel ("any"):` | First success wins |
| Settled | `parallel ("regardless"):` | All complete, ignore failures |

**Note:** Modifiers use quoted strings to distinguish from keywords.

```
# Default: wait for all
parallel:
  session "A"
  session "B"

# Race: first to complete
parallel ("first"):
  session "Fast path"
  session "Slow fallback"

# Any: first success
parallel ("any"):
  session "Primary"
  session "Backup"

# Settled: complete all regardless of failures
parallel ("regardless"):
  session "Maybe fails"
  session "Also maybe fails"
```

---

## Failure Policy

Default is **fail-fast** (cancel others on first failure).

| Policy | Syntax | Behavior |
|--------|--------|----------|
| fail-fast | (default) | Cancel others on first failure |
| continue | `(on-fail: "continue")` | Let all complete, collect errors |
| ignore | `(on-fail: "ignore")` | Silently ignore failures |

```
# Default: fail-fast
parallel:
  session "A"
  session "B"

# Continue on failure
parallel (on-fail: "continue"):
  session "Might fail"
  session "Also might fail"

# Ignore failures
parallel (on-fail: "ignore"):
  session "Optional A"
  session "Optional B"
```

---

## Named Results

Use assignment syntax to capture results for downstream use:

```
parallel:
  security = session "Security review"
  perf = session "Performance review"
  style = session "Style review"

session "Synthesize":
  context: { security, perf, style }
```

Results remain in context for subsequent sessions.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Parallel of one | Valid, runs normally |
| Empty parallel | Parse error |
| Nested parallel | Allowed |

```
# Valid: single branch
parallel:
  session "Just one"

# Error: empty
parallel:
  # nothing  <- parse error

# Valid: nested
parallel:
  parallel:
    session "A"
    session "B"
  session "C"
```

---

## Error Handling in Parallel

Try/catch works inside parallel branches:

```
parallel:
  try:
    session "Risky A"
  catch:
    session "Handle A"

  try:
    session "Risky B"
  catch:
    session "Handle B"
```

See Error Handling specification for full details.

---

## Not Supported (Deferred)

| Feature | Status | Notes |
|---------|--------|-------|
| Per-branch timeout | Deferred | `session "X" (timeout: 30s)` |
| Per-block timeout | Deferred | `parallel (timeout: 1m):` |
| Cancel semantics | Deferred | Implementation detail |
| State persistence | Deferred | Results to file for recovery |

---

## Cross-References

- **Parallel for-each**: See Loops specification (`parallel for item in items:`)
- **Parallel map**: See Loops specification (`items \| pmap:`)
- **Error handling**: See Error Handling specification
- **Result context**: See Wiring specification

---

## Example

```
import "security-scan" from "github:example/security"
import "perf-test" from "github:example/perf"

agent security-reviewer:
  skills: ["security-scan"]

agent perf-tester:
  skills: ["perf-test"]

# Parallel review with named results
parallel:
  sec = session "Security": security-reviewer
    prompt: "Scan for vulnerabilities"
  perf = session "Performance": perf-tester
    prompt: "Run performance benchmarks"
  docs = session "Documentation"
    prompt: "Check documentation coverage"

# Synthesize all results
session "Final Report":
  context: { sec, perf, docs }
  prompt: "Create unified review report"

# Race pattern: first response wins
parallel ("first"):
  session "Primary API"
    prompt: "Query primary service"
  session "Backup API"
    prompt: "Query backup service"
```
