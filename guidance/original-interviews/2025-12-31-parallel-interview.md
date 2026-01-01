# OpenProse: Parallel Execution

Based on CEO answers from QUESTIONS.md (Q19-Q22).

---

## CEO Direction Summary

- Support both **Promise.all** (wait for all) and **Promise.race** (first wins)
- **Sensible default is "all"**
- **Configurable failure policy**, default is **fail-fast**
- Syntax should be **colloquial**
- **No resource limits** for now

---

## Settled Decisions

Based on your answers, these are confirmed:

### Default Behavior

- **Join strategy**: `all` (wait for all branches)
- **Failure policy**: `fail-fast` (cancel others on first failure)

### Syntax

```
# Default: wait all, fail-fast
parallel:
  session "A"
  session "B"
```

---

## A. Join Strategies ⭐ NEEDS CONFIRMATION

You asked "Is there a third?" — Yes, there are more:

| Strategy | Behavior                      | Syntax                   |
| -------- | ----------------------------- | ------------------------ |
| All      | Wait for all                  | `parallel:` (default)    |
| Race     | First to complete             | `parallel (first):`      |
| Any      | First success                 | `parallel (any):`        |
| Settled  | All complete, ignore failures | `parallel (regardless):` |

**Question: Which do you want for MVP?**

**Inferred Recommendation:**

- `all` (default) — confirmed
- `race` / `first` — confirmed you want this
- `any` and `settled` — likely punt (adds complexity without clear use case yet)

### Proposed MVP:

```
parallel:              # all, fail-fast (default)
parallel (first):      # race - first to complete wins
parallel (on-fail: continue):  # all, but don't fail-fast
```

<CEO timestamp="2025-12-31 12:33:00">We should be able to implement all of these given the IOC Container running this thinng is an intelligent Orchestration Session. These should just be documented in the interpretter, how to behave and invoke/start/stop parallel async subagents. See other files.</CEO>

---

## B. Failure Policy ⭐ CONFIRMED

You said default is fail-fast. Options:

| Policy    | Behavior                                 |
| --------- | ---------------------------------------- |
| fail-fast | Cancel others on first failure (default) |
| continue  | Let all complete, collect errors         |
| ignore    | Silently ignore failures                 |

**Syntax:**

```
parallel:                       # fail-fast (default)
parallel (on-fail: continue):   # let others finish
parallel (on-fail: ignore):     # only collect successes
```

---

## C. Result Collection

**Inferred Recommendation: Named results**

Based on your preference for explicit/named access (from WIRING.md):

```
parallel:
  security = session "Security review"
  perf = session "Performance review"
  style = session "Style review"

session "Synthesize":
  context: { security, perf, style }
```

<CEO timestamp="2025-12-31 12:34:00">This is great. Note that these can stay in context for now at runtime, but there's a world in which we want the Orchestration Agent to start writing outputs like this to a file to preserve the state. Punt on that.</CEO>

---

## D. Open Questions (Simplified)

### Q1: Parallel of one — Valid or error?

```
parallel:
  session "Just one"
```

**Recommendation: Valid** — Runs normally. No reason to error on this edge case.

<CEO timestamp="2025-12-31 12:35:00">Yes.</CEO>

### Q2: Empty parallel — Error or no-op?

```
parallel:
  # nothing
```

**Recommendation: Error** — Empty parallel is likely a mistake. Fail at parse time.

<CEO timestamp="2025-12-31 12:36:00">Yes.</CEO>

### Q3: Nested parallel — Allowed?

```
parallel:
  parallel:
    session "A"
    session "B"
  session "C"
```

**Recommendation: Allowed** — You said arbitrary nesting is fine in COMPOSITION.md.

<CEO timestamp="2025-12-31 12:37:00">Yes.</CEO>

### Q4: Timeout per-branch vs per-block

**Punt** — You've punted on timeouts elsewhere.

<CEO timestamp="2025-12-31 12:38:00">Yes, punt.</CEO>

### Q5: Cancel semantics

**Punt** — Implementation detail. Decide during implementation.

<CEO timestamp="2025-12-31 12:39:00">Yes.</CEO>

---

## Proposed Minimal Syntax

```
# Default: wait all, fail-fast
parallel:
  session "A"
  session "B"

# Race - first to complete
parallel (first):
  session "Fast path"
  session "Slow fallback"

# Continue on failure
parallel (on-fail: continue):
  session "Might fail"
  session "Also might fail"

# Named results (for downstream use)
parallel:
  a = session "A"
  b = session "B"
```

---

## Errors in Parallel (from ERROR-HANDLING.md)

You said to answer parallel error handling here. Confirmed:

- **Default**: fail-fast (one failure cancels others)
- **Override**: `(on-fail: continue)` or `(on-fail: ignore)`
- Try/catch works inside parallel branches:

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

---

## Summary: Confirm or Reject

1. **Join strategies for MVP**: Just `all` and `first`? (Punt `any`, `settled`)
   <CEO timestamp="2025-12-31 12:40:00">No, let's implement them all. These shouldn't be harder to impleement.</CEO>
2. **Named results**: Use `name = session` syntax inside parallel?
   <CEO timestamp="2025-12-31 12:41:00">Yes.</CEO>
3. **Edge cases**: Parallel-of-one is valid, empty is error?
   <CEO timestamp="2025-12-31 12:42:00">Correct.</CEO>
