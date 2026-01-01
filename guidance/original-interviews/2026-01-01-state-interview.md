# OpenProse: State Management Interview

> Interview document to clarify state management design. Based on references in existing specs.

---

## Context from Existing Specifications

### From ORCHESTRATOR.md

> The Orchestrator tracks execution state:
>
> - **Primary**: In-context (conversation history)
> - **Fallback**: Filesystem-based state files (if context grows too large)
>
> State management implementation is deferred.

### From RUNTIME.md

> | Method     | Usage                                |
> | ---------- | ------------------------------------ |
> | In-context | Primary (conversation history)       |
> | Filesystem | Fallback (for complex/long programs) |

### From CEO Response (OPEN-QUESTIONS.md #12)

> Yes, I think variable reassignment is fine. Perhaps we should also add `const` (and prefer that) for immutable variable assignment. I'm still anticipating that we'll want to write variable state to files to persist context across a long time. Variables written with `const` for example could be prepend the contents of the file with something like "DO NOT CHANGE, THIS IS A CONSTANT UNMODIFIABLE FILE" or something (more effective) along those lines.

---

## Types of State

Based on the specification review, the Orchestrator needs to track several types of state:

### 1. Execution Flow State

**What:** Where the program is in its execution (current block, loop iteration, etc.)

**Current approach:** Orchestrator tracks this implicitly in its conversation context.

**Questions:**

- Is this sufficient for long-running programs?
- Should there be explicit program counter / stack tracking?

**Recommendation:** For MVP, in-context tracking is sufficient. The intelligent Orchestrator can understand "we just completed session X, now executing Y". For very long programs, filesystem checkpoints could be added later.

<CEO timestamp="2025-01-01 01:36:00">I like the recommendation. I think we should keep the in-context tracking for MVP. For very long programs, filesystem checkpoints could be added later.</CEO>

---

### 2. Variable State (`let` and `const` bindings)

**What:** Values bound via `let x = session "..."` or `const y = session "..."`

**Current approach:** Variables are conceptual—the Orchestrator remembers "x contains the result of session X" and can reference that in context passing.

**Questions:**

- Should variables be materialized to files?
- How do we persist across context overflow?
- What's the difference between `let` and `const` at runtime?

**Recommendation:**

For `const` bindings:

- Write to `.prose/state/{variable_name}.md` with a header like `# CONSTANT: {variable_name} - DO NOT MODIFY`
- Contents are the session output
- Orchestrator can re-read if context overflows

For `let` bindings:

- Write to `.prose/state/{variable_name}.md` (no constant header)
- Overwritten on reassignment
- Marked with last-updated timestamp

<CEO timestamp="2025-01-01 01:37:00">I like the file-based approach for later, but for now I think we should keep everything in-context for MVP and defer file persistence.</CEO>

---

### 3. Context State (Session Outputs for Passing)

**What:** The output of completed sessions that need to be passed to subsequent sessions.

**Current approach:** Orchestrator holds outputs in its conversation history and summarizes/transforms when passing.

**Questions:**

- For parallel blocks with many branches, does this become unwieldy?
- Should we write parallel branch results to files?
- How does the Orchestrator handle "context: [A, B, C]" when A, B, C were completed much earlier?

**Recommendation:**

Keep in-context as primary for most cases. The Orchestrator's intelligent summarization handles this naturally.

For parallel blocks with many (5+?) branches, consider writing results to `.prose/parallel/{block_id}/{branch_name}.md` for reference.

<CEO timestamp="2025-01-01 01:38:00">I like the recommendation. I think we should keep the in-context tracking for MVP. For very long programs, filesystem checkpoints could be added later.</CEO>

---

### 4. Loop State

**What:** Current iteration count, accumulated values in reduce operations.

**Questions:**

- How does `repeat 100 as i:` track i across iterations?
- For `reduce(acc, item):`, where does the accumulator live?

**Recommendation:**

The Orchestrator tracks these naturally:

- `repeat` counter: implicit in conversation ("This is iteration 47 of 100")
- `reduce` accumulator: passed session-to-session via context

No explicit file storage needed for loop state—it flows through execution naturally.

<CEO timestamp="2025-01-01 01:39:00">Let's go with the recommendation. I like the in-context tracking for this. Hopefully we don't ever need to put these in a file.</CEO>

---

### 5. Error/Recovery State

**What:** State needed to resume after failure or checkpoint for recovery.

**Questions:**

- Can a crashed Orchestrator session resume?
- Should we checkpoint before expensive operations?
- How does retry state work (what attempt are we on)?

**Recommendation:**

For MVP: No explicit checkpointing. If the Orchestrator session dies, the program starts over.

For future:

- Write `.prose/checkpoint.json` before each session spawn
- Contains: current position, variable bindings, context summary
- On crash, `loom resume` reads checkpoint and continues

<CEO timestamp="2025-01-01 01:40:00">Yes, let's defer this entirely for now.</CEO>

---

<CEO timestamp="2025-01-01 01:41:00">For now, we're not going to use any of the below, and I'll want to revisit it later before we build it. The key takeaway is that the Orchestrator Session should be tracking state "in context" for now, and should use tricks like "talking aloud to itself" to remember state when it needs to.</CEO>
