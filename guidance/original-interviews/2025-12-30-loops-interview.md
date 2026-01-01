# OpenProse: Loops

Based on CEO answers from QUESTIONS.md (Q15-Q18).

---

## CEO Direction Summary

- Should **not require explicit bounds** - support `while(true)`
- **Loop state** and **early exit**: wait for specific use cases
- Implies we need runtime safeguards (timeout, cost limit, manual intervention)

---

## A. Loop Constructs

### A1. Repeat N Times

```
# Fixed iteration count
repeat 3:
  session "Attempt solution"

# With index access
repeat 5 as i:
  session "Attempt {i} of 5"
```

<CEO timestamp="2025-12-30 09:53:00">This is good.</CEO>

### A2. Until Condition

```
# Orchestrator evaluates condition
loop until approved:
  session "Write draft"
  session "Get feedback"

# Explicit condition expression
loop until feedback.score > 0.9:
  session "Refine"
  let feedback = session "Evaluate"
```

<CEO timestamp="2025-12-30 09:54:00">I like the former if the orchestrator is "intelligent". This is not a reason on its own to make the orchestrator intelligent, but is a nice side benefit. I like the explicit condition less, and we should punt on this until we discuss inputs/outputs.</CEO>

### A3. While Condition

```
# Opposite of until
loop while needs_work:
  session "Process next item"
```

<CEO timestamp="2025-12-30 09:55:00">This is good, again only if the orchestrator is intelligent.</CEO>

### A4. Infinite Loop

You specifically mentioned `while(true)`:

```
# Explicit infinite
loop:
  session "Monitor for events"
  session "Handle event"

# Or explicit keyword
loop forever:
  session "Keep running"
```

<CEO timestamp="2025-12-30 09:56:00">I think the former is better than the latter.</CEO>

### A5. For-Each

```
# Iterate over collection
for item in items:
  session "Process {item}"

# With index
for item, i in items:
  session "Process item {i}"

# Parallel for-each
parallel for item in items:
  session "Process {item}"
```

<CEO timestamp="2025-12-30 09:57:00">I think these are fine. Is there a map/reduce syntax we could use instead of this? ie more like an es6 syntax? I'd like to explore this a little bit.</CEO>

---

## B. Loop State (Deferred)

You said to wait for use cases. Here's the design space:

### B1. Fresh Each Iteration

Each iteration starts clean:

```
loop until done:
  session "Work"  # no memory of previous iteration
```

### B2. Carry Forward

State persists across iterations:

```
loop until done:
  session "Work" with previous  # has access to last iteration's output
```

### B3. Accumulate

Collect results from all iterations:

```
let all_results = loop until done:
  session "Work"

# all_results = [iter1_output, iter2_output, ...]
```

**Recommendation:** Default to fresh, allow explicit accumulation when needed.

<CEO timestamp="2025-12-30 09:58:00">Yeah I'm curious if there's a cleaner more lambda like way of expressing these, I'm not really a fan of these.</CEO>

---

## C. Early Exit (Deferred)

You said to wait for use cases. Options:

### C1. Explicit Break

```
loop:
  let result = session "Check"
  if result.done:
    break

session "After loop"  # reached via break
```

<CEO timestamp="2025-12-30 09:59:00">Punt on this. Maybe later.</CEO>

### C2. Return from Session

The session signals loop termination:

```
loop:
  session "Work until done"
  # Session calls loom_return(:done) or loom_return(:continue)
```

<CEO timestamp="2025-12-30 10:00:00">Punt on this. Maybe later. But I don't really like this one.</CEO>

### C3. Orchestrator Detection

Orchestrator analyzes output and decides:

```
loop:
  session "Keep working"
  # Orchestrator: "looks like we're done, breaking"
```

**Recommendation:** Explicit break is clearest. Defer to use cases.

<CEO timestamp="2025-12-30 10:01:00">Punt on this. Maybe later.</CEO>

---

## D. Safeguards for Unbounded Loops

<CEO timestamp="2025-12-30 10:02:00">Punt on this.</CEO>

Since we allow `while(true)`, we need safeguards:

### D1. Timeout

```
# Per-loop timeout
loop (timeout: 1h):
  session "Monitor"

# Program-wide default
config:
  loop-timeout: 30m
```

### D2. Cost Limit

```
# Stop if cost exceeds limit
loop (max-cost: $10):
  session "Expensive operation"
```

### D3. Iteration Limit (Optional)

```
# Soft limit with warning
loop (warn-after: 100):
  session "Work"
```

### D4. Manual Intervention

Since orchestrator is transparent and interactive:

```
# User can press Ctrl+C or similar
# Or orchestrator pauses after N iterations for confirmation
loop (confirm-every: 10):
  session "Work"
```

<CEO timestamp="2025-12-30 10:03:00">Yes, it's important we can do this. My hope is we just get this "for free" if the orchestrator is a normal session.</CEO>

---

## E. Syntax Options

### E1. Keyword-Based

```
loop:
  body

loop until condition:
  body

loop while condition:
  body

repeat N:
  body

for item in collection:
  body
```

<CEO timestamp="2025-12-30 10:04:00">I like this.</CEO>

### E2. Lisp-Style

```lisp
(loop
  (session "work"))

(loop :until done
  (session "work"))

(repeat 3
  (session "work"))

(for [item items]
  (session "process" item))
```

<CEO timestamp="2025-12-30 10:05:00">Hate this.</CEO>

### E3. Hybrid

```
loop:
  session "work"
until approved

# or

do:
  session "work"
repeat-until approved
```

<CEO timestamp="2025-12-30 10:06:00">Don't really like this.</CEO>

---

## F. Loop + Parallel

```
# Parallel iterations (fan-out)
parallel for item in items:
  session "Process {item}"

# Sequential with parallel body
loop until done:
  parallel:
    session "A"
    session "B"
  session "Merge and check"
```

<CEO timestamp="2025-12-30 10:07:00">I like this.</CEO>

---

## G. Loop + Error Handling

```
# Retry on failure
loop (max: 5, on-fail: retry):
  session "Flaky operation"

# Break on failure
loop (on-fail: break):
  session "Risky operation"

# Continue on failure
loop (on-fail: continue):
  session "Optional operation"
```

<CEO timestamp="2025-12-30 10:08:00">Punt.</CEO>

---

## Open Questions

1. **Condition evaluation**: Who evaluates the `until` condition?

   - Orchestrator analyzes session output?
   - Session explicitly returns a status?
   - DSL expression on session output?

<CEO timestamp="2025-12-30 10:09:00">I think this strikes at the heart of the key question that is yet unanswered: is the orchestrator "intelligent" or not? If it is, then yes, the orchestrator should handle this. If not, we need to figure this out more clearly, and yes it probably has to be the session returning a status that is then programatically tested outside the session in the "classical orchestrator".</CEO>

2. **Iteration variable**: How to access current iteration count?

   ```
   loop as i:  # ?
     session "Iteration {i}"
   ```

<CEO timestamp="2025-12-30 10:10:00">Yes, I think this is the way.</CEO>

3. **Loop result**: What is the "result" of a loop?

   - Last iteration's output?
   - All iterations' outputs?
   - Explicit accumulator?

4. **Nested loops**: Any restrictions on loop nesting?

5. **Loop naming**: Can loops be named for targeted break?
   ```
   loop outer:
     loop inner:
       break outer  # break specific loop
   ```

---

## Proposed Minimal Syntax

```
# Infinite loop
loop:
  session "Work"

# Until condition (orchestrator evaluates)
loop until approved:
  session "Draft"
  session "Review"

# N times
repeat 3:
  session "Attempt"

# For-each
for item in items:
  session "Process {item}"

# With safeguard
loop (timeout: 30m):
  session "Monitor"
```
