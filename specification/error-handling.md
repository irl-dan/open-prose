# OpenProse Specification: Error Handling

> Derived from CEO interview on 2024-12-30

---

## Overview

Error handling in OpenProse follows standard programming language semantics: **unhandled exceptions terminate the program**. The DSL provides try/catch/finally patterns and retry mechanisms for controlled error recovery.

---

## Default Behavior: Propagation

By default, a failed session terminates the program:

```
do:
  session "A"
  session "B"  # if this fails, program terminates
  session "C"  # never runs

# Error bubbles up to user
```

This matches typical programming language semantics—unhandled exceptions terminate.

---

## Try/Catch/Finally

Standard error handling using **hybrid Python-style syntax**:

### Basic Try/Catch

```
try:
  session "Risky operation"
catch:
  session "Handle the failure"
```

### Try/Catch/Finally

```
try:
  session "Risky operation"
catch:
  session "Handle the failure"
finally:
  session "Always run cleanup"
```

### Catch with Error Access

```
try:
  session "Risky operation"
catch:
  session "Handle the failure based on what went wrong"
```

**Note:** The intelligent Orchestrator interprets error context from session output and passes relevant information to catch blocks. No structured error objects are required—the Orchestrator understands failures semantically.

### Nested Try/Catch

Nesting is fully supported:

```
try:
  session "Outer"
  try:
    session "Inner risky"
  catch:
    session "Handle inner"
  session "Continue outer"
catch:
  session "Handle outer"
```

### Try in Parallel Blocks

Try/catch works within parallel blocks:

```
parallel:
  try:
    session "Risky A"
  catch:
    session "Handle A failure"

  try:
    session "Risky B"
  catch:
    session "Handle B failure"
```

---

## Retry

Retry is a **session property** (not a block-level construct):

### Simple Retry

```
session "Flaky API" (retry: 3)
```

### Retry with Backoff

```
# Exponential backoff
session "API call" (retry: 3, backoff: exponential)

# Explicit delays
session "API call" (retry: 3, backoff: [1s, 5s, 30s])
```

### Retry State

On retry, the session starts **with prior context**—it has access to what happened in previous attempts.

---

## Error Semantics

### Error Inheritance

If a block catches an error, the **outer try/catch is NOT notified**. A caught error is considered handled.

```
try:
  try:
    session "Fails"
  catch:
    session "Handled"  # error is resolved here
  session "This runs"  # continues normally
catch:
  session "Never runs"  # outer catch not triggered
```

### Finally Semantics

Finally blocks follow **language convention**: they run regardless of how the try block exits (success, error, or early return/break).

### Rethrow

Catch blocks can rethrow errors to outer handlers:

```
try:
  session "Risky"
catch:
  session "Log the failure"
  throw  # rethrow to outer handler
```

### Error Logging

All errors are **automatically logged**, even if caught. This ensures good telemetry by default during early development.

---

## Session Failure

Sessions signal failure through their natural output. The intelligent Orchestrator:
1. Interprets session output semantically to detect failures
2. Determines error context from the session's response
3. Routes execution to catch blocks when errors are detected

No explicit error signaling tools are required—the Orchestrator understands failures from context.

---

## Not Supported (Deferred)

The following are explicitly out of scope for now:

| Feature | Status | Notes |
|---------|--------|-------|
| Catch specific error types | Deferred | `catch timeout:` syntax punted |
| Retry configuration block | Deferred | Advanced retry options punted |
| Retry with conditions | Deferred | `retry when transient:` punted |
| Custom error types | No | Cannot define custom error types |
| Structured error objects | Deferred | Error type discrimination punted |

---

## Cross-References

- **Errors in parallel blocks**: See Parallel specification
- **Errors in loops**: See Loops specification
- **Orchestrator error handling**: See Orchestrator specification

---

## Example

```
import "web-search" from "github:example/web-search"

agent researcher:
  model: sonnet
  skills: ["web-search"]

# Default: errors propagate
session "Simple task"

# With retry
session "Flaky API" (retry: 3, backoff: "exponential")

# Full error handling
try:
  session research: researcher
    prompt: "Research topic X"
catch:
  session "Log and handle the failure"
  throw  # rethrow after logging
finally:
  session "Cleanup resources"
```
