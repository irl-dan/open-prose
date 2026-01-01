# OpenProse: Wiring & Context Passing

The central challenge: how do we pass context between sessions intelligently?

---

## Updates from ORCHESTRATOR.md

**Confirmed:** The Orchestrator uses **intelligent context passing**. This is part of its "intelligent discretion" (vs strict structure adherence for control flow).

Key points:
- Orchestrator has full discretion over context summarization
- No structured return format required
- Orchestrator interprets session output semantically
- Write prompts with focused outputs to assist interpretation

---

## Settled Design

### Who Controls Transformation?

**Answer: Orchestrator (Intelligent)**

The Orchestrator decides how to pass context between sessions:
- Summarizes when output is too large
- Extracts relevant information
- Formats for the receiving session

### Context Accumulation

**Default: Direct passing (immediate predecessor only)**

```
session A -> session B -> session C
# C receives B's output only (default)
```

**Override: Explicit context**
```
session C:
  context: [A, B]  # receives both
```

### Parallel Merge

**Named object access:**
```
parallel:
  research = session "Research"
  analysis = session "Analysis"

session "Synthesize":
  context: { research, analysis }
```

---

## How It Works

### 1. Session Completes

A subagent finishes and returns output to the Orchestrator.

### 2. Orchestrator Interprets

The Orchestrator:
- Reads the full output
- Understands what was accomplished
- Extracts key information

### 3. Context is Passed

For the next session, the Orchestrator:
- Summarizes if output is large
- Includes relevant context in the prompt
- May transform format for clarity

### 4. Prompt Guidance Helps

Write session prompts with focused outputs:
```
session reviewer:
  prompt: """
    Review this code and provide:
    - A summary of issues found
    - Severity of each issue
    - Recommendations
  """
```

This helps the Orchestrator extract and pass relevant information.

---

## No Structured Returns Required

From the CEO:
> "We don't necessarily _need_ structure like `{ approved }`... this is just classic prompt guidance."

The Orchestrator can interpret natural language output. Structured returns are helpful but not required.

---

## Syntax (Confirmed)

```
# Implicit passing (default)
session "A"
  -> session "B"

# Explicit context
session "C":
  context: A

# Multiple contexts
session "D":
  context: [A, B, C]

# Named from parallel
parallel:
  x = session "X"
  y = session "Y"

session "Z":
  context: { x, y }
```

---

## Remaining Considerations

### Large Outputs

When a session produces very large output:
- Orchestrator summarizes intelligently
- No explicit token limits configured
- Trust the model to be reasonable

### Lost Information

Some information will be lost in summarization. This is acceptable:
- Orchestrator uses judgment
- Can request more detail if needed
- Programs should be designed with this in mind

---

## Summary

Context passing is simple because the Orchestrator is intelligent:

1. Sessions produce natural language output
2. Orchestrator interprets and extracts
3. Orchestrator passes relevant context to next session
4. No structured formats or explicit returns required
5. Prompt guidance helps but isn't mandatory

This is the "intelligent" part of the hybrid model.
