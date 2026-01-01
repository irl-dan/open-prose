# OpenProse: Composition Follow-up

Open question from COMPOSITION.md interview.

---

## Block Invocation Syntax

You asked: "Would preceding it with `do` ever make sense? Or does that overload `do` too much?"

### Option A: Just the Name

```
block review-pipeline:
  session "Review"
  session "Synthesize"

# Invocation:
review-pipeline
```

**Pros:**

- Minimal syntax
- Familiar from languages where function names are expressions

**Cons:**

- Could be confused with a bare identifier or variable reference
- Less explicit about "execute this block"

### Option B: Prefix with `do` ⭐ RECOMMENDED

```
block review-pipeline:
  session "Review"
  session "Synthesize"

# Invocation:
do review-pipeline
```

**Pros:**

- Clear and explicit: "do this block"
- Consistent with `do:` for anonymous sequential blocks
- Unambiguous—`do X` always means "execute X"

**Cons:**

- Slightly more verbose
- Could be seen as overloading `do` (though the meanings are related)

### Option C: Function Call Syntax

```
# Invocation:
review-pipeline()
```

**Pros:**

- Very familiar from most programming languages
- Clear distinction between definition and invocation
- Natural when parameters are added later

**Cons:**

- Empty parens feel unnecessary for non-parameterized blocks

---

## My Recommendation (Strengthened)

**Option B (`do review-pipeline`)** aligns best with your established preferences:

1. **Consistency with existing syntax**: You chose `do:` for anonymous blocks, `block` for definitions. `do name` completes the pattern.
2. **Unambiguous**: You've preferred explicit > implicit throughout (TypeScript-like balance).
3. **Clean transition to parameters**: `do review-pipeline topic="AI"` feels natural.
4. **Not really overloading**: Both uses mean "execute"—one anonymous, one named.

The "just the name" option (A) risks confusion in a language where you also have variables, agent names, and session names as identifiers.

---

## Question

**Which block invocation syntax do you prefer?**

- [ ] A: Just the name (`review-pipeline`)
- [x] B: Prefix with do (`do review-pipeline`) — **Recommended based on your pattern preferences**
- [ ] C: Function call syntax (`review-pipeline()`)

<CEO timestamp="2025-12-30 09:06:00">I like your recommendation, let's go with that. Use the `do` syntax.</CEO>
