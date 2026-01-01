# OpenProse: Concrete Scenarios

Based on CEO answers from QUESTIONS.md (Q49-Q52).

These scenarios use the **confirmed syntax** from other interviews to show complete examples.

---

## Scenario 1: Simple Pipeline

> "Research a topic, then write an article based on research."

### Recommended Syntax

```
import web-search from "github:example/web-search"

agent researcher:
  model: sonnet
  skills: [web-search]

agent writer:
  model: opus

session research: researcher
  prompt: "Research the latest developments in quantum computing"

-> session article: writer
  prompt: "Write a blog post about quantum computing"
```

**Wiring:** `article` automatically receives `research` output (direct passing default).

---

## Scenario 2: Parallel Review

> "Have three reviewers analyze code in parallel, then synthesize their feedback."

### Recommended Syntax

```
agent reviewer:
  model: sonnet

parallel:
  security = session: reviewer
    prompt: "Review this code for security issues"
  performance = session: reviewer
    prompt: "Review this code for performance issues"
  style = session: reviewer
    prompt: "Review this code for style and readability"

session synthesizer:
  model: opus
  prompt: "Synthesize the reviews into a unified report"
  context: { security, performance, style }
```

**Wiring:** Named results from parallel block, explicit context for synthesizer.

---

## Scenario 3: Iterative Refinement

> "Write draft, get feedback, refine until approved."

### Recommended Syntax

```
agent writer:
  model: opus

agent reviewer:
  model: sonnet

let draft = session: writer
  prompt: "Write a first draft about AI safety"

loop until approved:
  let feedback = session: reviewer
    prompt: "Review this draft and provide feedback"
    context: draft

  draft = session: writer
    prompt: "Improve the draft based on feedback"
    context: { draft, feedback }
```

**Condition evaluation:** Orchestrator interprets reviewer output to determine if "approved."

---

## Scenario 4: Conditional Routing

> "Classify a request, then route to the appropriate specialist."

### Recommended Syntax (DSL-level routing)

```
agent classifier:
  model: haiku

agent simple-handler:
  model: sonnet

agent complex-handler:
  model: opus

let classification = session: classifier
  prompt: "Classify this request as simple, complex, or unknown"

if classification.is_simple:
  session: simple-handler
    prompt: "Handle the simple request"
else if classification.is_complex:
  session: complex-handler
    prompt: "Handle the complex request"
else:
  session "I don't know how to handle this request"
```

**Note:** `if/else` syntax not yet confirmed. Alternative: use `choice:` block with intelligent orchestrator.

---

## Scenario 5: Complex Pipeline

Combining multiple patterns:

```
import web-search from "github:example/search"
import code-analysis from "github:example/code-analysis"

agent researcher:
  model: sonnet
  skills: [web-search]

agent analyst:
  model: sonnet
  skills: [code-analysis]

agent writer:
  model: opus

# Phase 1: Parallel research
parallel:
  market = session: researcher
    prompt: "Research market trends"
  tech = session: researcher
    prompt: "Research technical landscape"
  competitors = session: researcher
    prompt: "Research competitor analysis"

# Phase 2: Analysis
let analysis = session: analyst
  prompt: "Analyze the research"
  context: { market, tech, competitors }

# Phase 3: Iterative report writing
let report = session: writer
  prompt: "Write initial report"
  context: analysis

loop until approved:
  let feedback = session "Review the report"
    context: report

  report = session: writer
    prompt: "Revise the report based on feedback"
    context: { report, feedback }

# Phase 4: Final polish
parallel:
  session "Proofread for grammar"
    context: report
  session "Check citations"
    context: report
  session "Format for publication"
    context: report
```

---

## Syntax Patterns Summary

| Pattern | Syntax |
|---------|--------|
| Sequence | `session "A" -> session "B"` or newlines |
| Parallel | `parallel: ...` with `name = session` |
| Named result | `let x = session "..."` |
| Context passing | `context: x` or implicit |
| Loop until | `loop until condition: ...` |
| Retry | `session "..." (retry: 3)` |
| Error handling | `try: ... catch: ... finally: ...` |

---

## Open Questions from Scenarios

### Q1: Conditional Syntax

`if/else` vs `route` vs `choice:` block?

**Recommendation:** `if/else` for explicit conditions, `choice:` for orchestrator-decided routing (requires intelligent orchestrator).

### Q2: Condition Evaluation

For `until approved`, how does orchestrator know?

**Recommendation:** Session returns structured data when possible. Orchestrator interprets semantically as fallback.

**These are addressed in ORCHESTRATOR.md.**
