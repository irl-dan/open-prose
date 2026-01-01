# OpenProse: Error Handling

Based on CEO answers from QUESTIONS.md (Q31-Q33).

---

## CEO Direction Summary

- **Default behavior**: Session failure should **throw** (propagate up)
- Enable **try/catch/finally** patterns in the DSL
- Make it easy to declare **retry with backoff** (e.g., up to 3x or 5x)
- Hopefully figured out how sessions trigger failure (see SESSIONS.md)
- Punt on fallback sessions, modified retry context, human intervention for now

---

## A. Failure Propagation (Default)

By default, a failed session terminates the program:

```
do:
  session "A"
  session "B"  # if this fails, program terminates
  session "C"  # never runs

# Error bubbles up to user
```

This matches typical programming language semantics - unhandled exceptions terminate.

<CEO timestamp="2025-12-30 09:24:00">Great, agreed.</CEO>

---

## B. Try/Catch/Finally

Standard error handling pattern:

```
try:
  session "Risky operation"
catch:
  session "Handle the failure"
finally:
  session "Always run cleanup"
```

<CEO timestamp="2025-12-30 09:25:00">Great, awesome.</CEO>

### B1. Catch with Error Access

```
try:
  session "Risky operation"
catch error:
  session "Handle: {error.message}"
```

<CEO timestamp="2025-12-30 09:26:00">I think there's some open question about how state like this is passed around. I think we want to enable something like this but I'm not sure we can confidently access a `message` property on the error. Hopefully we can flesh this out somewhere else where we're deciding on state.</CEO>

### B2. Catch Specific Errors

```
try:
  session "API call"
catch timeout:
  session "Handle timeout"
catch auth:
  session "Handle auth failure"
catch:
  session "Handle other errors"
```

<CEO timestamp="2025-12-30 09:27:00">This is overkill for now, but I like this pattern and we should develop it in the future. Punt for now.</CEO>

### B3. Nested Try/Catch

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

<CEO timestamp="2025-12-30 09:28:00">Yes, this should work.</CEO>

### B4. Try in Parallel

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

<CEO timestamp="2025-12-30 09:29:00">Yes, this should work.</CEO>

---

## C. Retry with Backoff

You wanted this to be easy to declare:

### C1. Simple Retry

```
# Retry up to 3 times
session "Flaky API" (retry: 3)

# Or explicit block
retry 3:
  session "Flaky API"
```

<CEO timestamp="2025-12-30 09:30:00">I think perhaps the retry should be inverted and attached as a property of the session itself.</CEO>

### C2. Retry with Backoff

```
# Exponential backoff
session "API call" (retry: 3, backoff: exponential)

# Explicit delays
session "API call" (retry: 3, backoff: [1s, 5s, 30s])

# Block form
retry 5 with-backoff exponential:
  session "Flaky operation"
```

<CEO timestamp="2025-12-30 09:31:00">I think perhaps the retry and backoff properties should be inverted and attached as properties of the session itself.</CEO>

### C3. Retry Configuration Options

```
retry:
  max: 5
  backoff: exponential  # or: linear, fixed, [1s, 5s, 30s]
  base-delay: 1s
  max-delay: 60s
  jitter: true  # add randomness
  on-exhausted: throw  # or: continue, fallback

session "API call"
```

<CEO timestamp="2025-12-30 09:32:00">This is overkill for now. Punt on this.</CEO>

### C4. Retry with Condition

```
# Only retry certain errors
retry 3 when transient:
  session "API call"

# Don't retry certain errors
retry 3 unless fatal:
  session "Operation"
```

<CEO timestamp="2025-12-30 09:33:00">This is overkill for now. Punt on this.</CEO>

---

## D. Error Types

What kinds of errors can occur?

<CEO timestamp="2025-12-30 09:34:00">Distinguishing between error types like this is overkill for now, punt on these.</CEO>

### D1. Session Errors

From the session itself (via `loom_error`):

```typescript
{
  type: "session_error",
  message: "Could not complete task",
  recoverable: true,
  details: { ... }
}
```

<CEO timestamp="2025-12-30 09:35:00">This is overkill for now. Punt on this.</CEO>

### D2. Infrastructure Errors

From OpenCode/network:

```typescript
{
  type: "infrastructure_error",
  message: "API rate limited",
  code: "rate_limit",
  retryAfter: 30
}
```

<CEO timestamp="2025-12-30 09:36:00">This is overkill for now. Punt on this.</CEO>

### D3. Timeout Errors

```typescript
{
  type: "timeout",
  message: "Session exceeded 5 minute timeout"
}
```

<CEO timestamp="2025-12-30 09:37:00">This is overkill for now. Punt on this.</CEO>

### D4. Abort Errors

User or orchestrator initiated:

```typescript
{
  type: "abort",
  message: "User cancelled execution"
}
```

<CEO timestamp="2025-12-30 09:38:00">This is overkill for now. Punt on this.</CEO>

---

## E. Error in Parallel Blocks

How do errors interact with parallel execution?

<CEO timestamp="2025-12-30 09:39:00">Let's answer these in the PARALLEL.md file.</CEO>

### E1. Fail-Fast (Default)

One failure cancels others:

```
parallel:  # default: fail-fast
  session "A"
  session "B"  # if this fails, A is cancelled
```

### E2. Continue on Failure

Complete all, collect errors:

```
parallel (on-fail: continue):
  session "A"
  session "B"  # if this fails, A continues

# Result: { successes: [A], failures: [B] }
```

### E3. Ignore Failures

Only collect successes:

```
parallel (on-fail: ignore):
  session "A"
  session "B"

# Result: [A] (B's failure is silent)
```

---

## F. Error in Loops

<CEO timestamp="2025-12-30 09:40:00">Let's answer these in the LOOPS.md file.</CEO>

### F1. Loop Terminates on Error

```
loop until done:
  session "Work"  # error breaks loop

catch:
  session "Handle loop failure"
```

### F2. Continue Loop on Error

```
loop (on-fail: continue) until done:
  session "Work"  # error continues to next iteration
```

### F3. Retry within Loop

```
loop until done:
  retry 3:
    session "Flaky work"
```

---

## G. Syntax Options

### G1. Python-Style

```
try:
  session "Risky"
except:
  session "Handle"
finally:
  session "Cleanup"
```

<CEO timestamp="2025-12-30 09:41:00">I like this.</CEO>

### G2. Java/TS-Style

```
try {
  session "Risky"
} catch (error) {
  session "Handle"
} finally {
  session "Cleanup"
}
```

<CEO timestamp="2025-12-30 09:42:00">I don't like this.</CEO>

### G3. Lisp-Style

```lisp
(try
  (session "Risky")
  (catch
    (session "Handle"))
  (finally
    (session "Cleanup")))
```

<CEO timestamp="2025-12-30 09:43:00">I really don't like this.</CEO>

### G4. Hybrid (Recommended)

```
try:
  session "Risky"
catch:
  session "Handle"
finally:
  session "Cleanup"
```

<CEO timestamp="2025-12-30 09:44:00">Yes, let's do this.</CEO>

---

## H. Integration with Session Return

Sessions can explicitly fail via `loom_error`:

```
# In session:
loom_error({
  message: "Cannot complete task",
  code: "invalid_input",
  recoverable: false
})

# In DSL:
try:
  session "Might fail"
catch error when error.recoverable:
  retry 3:
    session "Try again"
catch:
  session "Give up"
```

<CEO timestamp="2025-12-30 09:45:00">Yes, this leads me to believe we need to create some plugin that exposes tool calls to the sessions: "loom_return" and "loom_error". Make sure we cover those questions in another existing document, so we don't need to address that here.</CEO>

---

## Open Questions

1. **Error inheritance**: If a block catches an error, is the outer try/catch notified?

<CEO timestamp="2025-12-30 09:46:00">No.</CEO>

2. **Finally semantics**: Does finally run if there's a return/break?

<CEO timestamp="2025-12-30 09:47:00">What is convention? Follow convention.</CEO>

3. **Retry state**: On retry, does the session start fresh or with prior context?

<CEO timestamp="2025-12-30 09:48:00">With prior context.</CEO>

4. **Error logging**: Are all errors automatically logged, even if caught?

<CEO timestamp="2025-12-30 09:49:00">Yes, we should be doing good telemetry/logging by default, especially early. We can always turn this down if it's too much.</CEO>

5. **Custom error types**: Can DSL authors define custom error types?

<CEO timestamp="2025-12-30 09:50:00">No, not yet.</CEO>

6. **Rethrow**: Can catch blocks rethrow or throw new errors?
   ```
   catch error:
     log error
     throw error  # rethrow
   ```

<CEO timestamp="2025-12-30 09:51:00">Yes.</CEO>

---

## Proposed Minimal Syntax

```
# Default: errors propagate
session "Work"

# Try/catch
try:
  session "Risky"
catch:
  session "Handle"

# Try/catch/finally
try:
  session "Risky"
catch error:
  session "Handle {error.message}"
finally:
  session "Cleanup"

# Simple retry
session "Flaky" (retry: 3)

# Retry with backoff
retry 3 with-backoff exponential:
  session "Flaky"

# Parallel with failure policy
parallel (on-fail: continue):
  session "A"
  session "B"
```

<CEO timestamp="2025-12-30 09:52:00">I've given the relevant feedback here above.</CEO>
