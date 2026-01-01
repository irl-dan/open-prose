# OpenProse: Composition

Based on CEO answers from QUESTIONS.md (Q12-Q14).

---

## CEO Direction Summary

- Support **anonymous inline composition** and **named/reused blocks**
- **Parameterization** is interesting but wait for concrete use cases
- **No limit** to nesting depth - arbitrary nesting allowed
- Want to see **example files** showing different approaches

---

## Example Files Created

See `examples/syntax/` for full examples:

- `01-lisp-minimal.prose` - Lisp-like with `defblock`
- `02-yaml-declarative.prose` - YAML-style with `blocks:` section
- `03-typescript-inspired.prose` - TS-like with `block` keyword
- `04-hybrid-clean.prose` - Indentation-based clean syntax

---

## A. Block Syntax Options

### A1. Anonymous Inline Composition

How do we group sessions without naming them?

```
# Option A: Parentheses (Lisp-like)
(->
  (session "A")
  (session "B"))

# Option B: Indentation (Python-like)
do:
  session "A"
  session "B"

# Option C: Braces (C-like)
{
  session("A");
  session("B");
}

# Option D: Keywords
sequence:
  session "A"
  session "B"
```

**My recommendation:** Indentation-based (Option B) is cleanest and most readable.

<CEO timestamp="2025-12-30 09:07:00">Agreed, Indentation-based is cleanest and most readable.</CEO>

### A2. Named Blocks

How do we define reusable blocks?

```
# Option A: defblock (Lisp-like)
(defblock review-pipeline
  (session "Review")
  (session "Synthesize"))

# Option B: block keyword
block review-pipeline:
  session "Review"
  session "Synthesize"

# Option C: function-like
fn review-pipeline():
  session "Review"
  session "Synthesize"
```

**My recommendation:** `block` keyword (Option B) - clear, simple, not overloaded.

<CEO timestamp="2025-12-30 09:08:00">Agreed, `block` keyword is the way to go.</CEO>

### A3. Block Invocation

How do we call a named block?

```
# Option A: Function call syntax
review-pipeline()

# Option B: Just the name
review-pipeline

# Option C: Keyword
run review-pipeline

# Option D: Reference
use review-pipeline
```

**My recommendation:** Just the name (Option B) when unambiguous. Function syntax when parameterized.

<CEO timestamp="2025-12-30 09:09:00">Hmmm... just the name is sort of confusing. Would preceeding it with `do` ever make sense? Or does that overload `do` too much? If so, let's stick with just the name. If not, I like `do review-pipeline`</CEO>

---

## B. Parameterization

You said to wait for use cases. Here's the design space when we're ready:

### B1. Parameter Syntax

```
# Option A: Parentheses
block analyze(topic, depth):
  session "Research {topic}"

# Option B: Angle brackets
block analyze<topic, depth>:
  session "Research {topic}"

# Option C: With types
block analyze(topic: string, depth: number):
  session "Research {topic}"
```

<CEO timestamp="2025-12-30 09:10:00">When it's time to do this, Option A is the way to go. But let's punt on this for now.</CEO>

### B2. Parameter Passing

```
# Option A: Positional
analyze "AI" 3

# Option B: Named
analyze topic="AI" depth=3

# Option C: Mixed
analyze "AI" depth=3
```

<CEO timestamp="2025-12-30 09:11:00">When it's time to do this, Named is the way to go.</CEO>

### B3. Default Values

```
block analyze(topic, depth = 2):
  session "Research {topic} at depth {depth}"

analyze "AI"  # uses depth=2
```

**Recommendation:** Defer until concrete use cases emerge. For now, blocks have no parameters.

<CEO timestamp="2025-12-30 09:12:00">Defer for now.</CEO>

---

## C. Nesting

You confirmed arbitrary nesting is allowed.

### C1. Nesting Example

```
block outer:
  session "Start"
  block inner:
    parallel:
      session "A"
      session "B"
    session "Merge"
  session "End"
```

<CEO timestamp="2025-12-30 09:13:00">Yes, good.</CEO>

### C2. Scope Questions

When blocks nest, what's the scope of bindings?

```
block outer:
  let x = session "Get X"

  block inner:
    session "Use {x}"  # Can inner see x?
```

**Options:**

- Lexical scope (inner sees outer's bindings)
- Isolated scope (inner cannot see outer)
- Explicit passing (must pass x to inner)

**Recommendation:** Lexical scope by default (like most languages).

<CEO timestamp="2025-12-30 09:14:00">Yes, good. But punt on implementing this, I don't think we need this yet.</CEO>

---

## D. Block Types

Should we distinguish block types?

### D1. Sequential Block

```
do:  # or 'sequence:' or just indentation
  session "A"
  session "B"
  session "C"
```

### D2. Parallel Block

```
parallel:
  session "A"
  session "B"
  session "C"
```

### D3. Choice Block

```
choice:  # one of these, orchestrator decides
  session "Option A"
  session "Option B"
```

### D4. Race Block

```
race:  # first to complete wins
  session "Fast path"
  session "Slow path"
```

**Recommendation:** Support `do` (or implicit sequence), `parallel`, and `race` as block types.

<CEO timestamp="2025-12-30 09:15:00">Yes, I actually really like these. Notably, if we have a "choice" block, the orchestrator needs to be intelligent. This should not be cause to choose an intelligent orchestrator in itself. So if we decide against it in another doc then we'll drop the "choice" one.</CEO>

---

## E. Block Reuse Patterns

### E1. Inline vs Named

When should blocks be named?

```
# Inline (anonymous) - use once
do:
  session "A"
  session "B"

# Named - reuse multiple times
block my-pipeline:
  session "A"
  session "B"

my-pipeline  # use 1
my-pipeline  # use 2
```

<CEO timestamp="2025-12-30 09:16:00">Yes, I like this.</CEO>

### E2. Composition of Blocks

Blocks can contain other blocks:

```
block review:
  parallel:
    session "Security"
    session "Performance"

block full-pipeline:
  session "Write code"
  review
  session "Finalize"
```

<CEO timestamp="2025-12-30 09:17:00">Yes, I like this.</CEO>

### E3. Block Aliases

Should we support aliasing?

```
alias quick-review = review  # not sure if needed
```

**Recommendation:** Probably not needed initially.

<CEO timestamp="2025-12-30 09:18:00">Correct, not needed initially.</CEO>

---

## Open Questions

1. **Block keyword**: Is `block` the right keyword, or something else? (`define`, `def`, `fn`, `proc`?)

<CEO timestamp="2025-12-30 09:19:00">I like `block`.</CEO>

2. **Implicit sequence**: Should top-level statements be implicitly sequential?

   ```
   # Is this a sequence?
   session "A"
   session "B"
   ```

<CEO timestamp="2025-12-30 09:20:00">Yes.</CEO>

3. **Block return**: Can blocks have explicit return values?

   ```
   block get-data:
     let x = session "Fetch"
     return x.data  # explicit return?
   ```

<CEO timestamp="2025-12-30 09:21:00">Let's discuss return values elsewhere, in WIRING.md or ORCHESTRATOR.md. Unsure yet.</CEO>

4. **Block visibility**: Are blocks only visible in the file they're defined, or can they be exported?

<CEO timestamp="2025-12-30 09:22:00">For now, local to file. Later we'll implement exporting.</CEO>

---

## Proposed Minimal Syntax

```
# Anonymous sequence
do:
  session "A"
  session "B"

# Anonymous parallel
parallel:
  session "A"
  session "B"

# Named block
block my-pipeline:
  session "A"
  session "B"

# Use named block
my-pipeline

# Nested composition
block outer:
  session "Start"
  parallel:
    session "A"
    session "B"
  session "End"
```

<CEO timestamp="2025-12-30 09:23:00">Factor in my feedback from above, but this is on the right track.</CEO>
