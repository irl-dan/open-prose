# OpenProse State Management Implementation Plan

**Date:** 2026-01-03
**Status:** Ready for implementation
**Purpose:** Comprehensive plan for implementing state management in the OpenProse interpreter and compiler

---

## Executive Summary

This plan addresses three key areas:
1. **In-Context State Tracking** (MVP) - How the orchestrator manages state in conversation history
2. **Filesystem State Architecture** (Phase 2) - Designed now, implemented later
3. **Interpreter & Compiler Updates** - Changes to `interpreter.md` and `prose.md`

The fundamental insight: **State is not a separate system—it's the orchestrator's working memory.** The orchestrator "thinks aloud" to track state, which is naturally preserved in the conversation history.

---

## Part 1: State Categories & Tracking Approach

### 1.1 What State Needs Tracking

| State Category | Contents | Tracking Method |
|----------------|----------|-----------------|
| **Agent Registry** | Agent definitions with model, prompt, skills, permissions | Collected at program start, held in memory |
| **Block Registry** | Block definitions with parameters | Collected at program start (hoisted), held in memory |
| **Variable Bindings** | Variable name → value mapping | Narrated after each assignment |
| **Variable Mutability** | Which variables are `let` vs `const` | Recorded at binding time |
| **Execution Position** | Current statement index | Narrated before each statement |
| **Loop State** | Counter, max, condition result | Narrated at loop boundaries |
| **Parallel State** | Active branches, completed results | Narrated at parallel start/join |
| **Error State** | Current exception, retry count | Narrated in catch blocks |
| **Call Stack** | Nested block invocations | Implicit via narrative depth |

### 1.2 In-Context Tracking Pattern

The orchestrator uses **explicit narration** to maintain state. This serves three purposes:
1. **State persistence** - The conversation history becomes the state store
2. **Debugging visibility** - Users can see execution progress
3. **Recovery support** - If interrupted, state can be reconstructed from history

**Narration format:**
```
📍 [POSITION] Executing statement 3 of 7: session "Research the topic"
📦 [STATE] Variables: { research: <result>, analysis: pending }
🔄 [LOOP] Iteration 2 of max 5, condition "**task complete**" not yet met
✅ [COMPLETE] Session finished, binding result to `research`
```

---

## Part 2: In-Context State Architecture (MVP)

### 2.1 State Narration Protocol

The orchestrator follows a **structured narration protocol** for each construct:

#### Session Statements
```
Before: 📍 Executing: session "prompt text"
After:  ✅ Session complete. [Summary of result]
        📦 Binding result to `varname` (if let/const)
```

#### Parallel Blocks
```
Start:  🔀 Entering parallel block with 3 branches (strategy: all, on-fail: fail-fast)
        - Branch `security`: pending
        - Branch `perf`: pending
        - Branch `style`: pending

During: [Task tool calls for all branches]

Join:   🔀 Parallel complete:
        - security = [summary]
        - perf = [summary]
        - style = [summary]
```

#### Loop Blocks
```
Start:  🔄 Starting loop until **condition** (max: 10)

Each:   🔄 Iteration 1 of max 10
        📦 Loop variable: i = 0
        [Execute body]
        🔄 Evaluating condition: **the task is complete**
        → Not satisfied, continuing...

Exit:   🔄 Loop exited: condition satisfied at iteration 4
   OR   🔄 Loop exited: max iterations (10) reached
```

#### Error Handling
```
Try:    🛡️ Entering try block
Error:  ⚠️ Session failed: [error description]
        📦 Binding error to `err`
        🛡️ Executing catch block
Finally:🛡️ Executing finally block (cleanup)
```

#### Variable Bindings
```
let:    📦 let research = [value summary]
const:  📦 const config = [value summary] (immutable)
assign: 📦 research = [new value] (was: [old value])
```

### 2.2 Context Summarization Strategy

When passing context between sessions, the orchestrator uses **intelligent summarization**:

| Context Size | Strategy |
|--------------|----------|
| < 2000 chars | Pass verbatim |
| 2000-8000 chars | Summarize to key points |
| > 8000 chars | Extract essentials only |
| Multiple variables | Format as labeled sections |

**Format template:**
```
Context provided:
---
[variable_name]: [value or summary]
[variable_name]: [value or summary]
---
```

### 2.3 Handling Complex State

#### Nested Structures
```
do outer-block
  📍 Entering block: outer-block
  do inner-block
    📍 Entering block: inner-block (depth: 2)
    ...
    📍 Exiting block: inner-block
  📍 Exiting block: outer-block
```

#### Pipeline State
```
🔗 Pipeline: items | filter | map | reduce
   Starting with 5 items
🔗 filter: 3 items passed filter
🔗 map: 3 items transformed
🔗 reduce: final result = [summary]
```

#### Parallel Inside Loops
```
🔄 Iteration 1 of 3
  🔀 Entering parallel (inside loop iteration 1)
  ...
  🔀 Parallel complete
🔄 Iteration 2 of 3
  🔀 Entering parallel (inside loop iteration 2)
  ...
```

---

## Part 3: Filesystem State Architecture (Phase 2 - Designed, Not Implemented)

For very long programs or checkpointing needs, state can overflow to filesystem.

### 3.1 Directory Structure

```
.prose/
├── execution/
│   ├── program.prose          # The running program
│   ├── position.json          # Current statement index
│   └── run-{timestamp}/       # Per-execution directory
│       ├── variables/
│       │   ├── {name}.md      # Variable values (markdown for readability)
│       │   └── manifest.json  # Variable metadata (type, mutability)
│       ├── parallel/
│       │   └── {block-id}/
│       │       ├── {branch}.md
│       │       └── status.json
│       ├── loops/
│       │   └── {loop-id}.json  # Iteration count, condition history
│       └── execution.log       # Full execution trace
└── checkpoints/
    └── {checkpoint-name}.json   # Resumable state snapshots
```

### 3.2 When to Use Filesystem (Future)

| Trigger | Action |
|---------|--------|
| Variable > 10k chars | Write to `variables/{name}.md`, keep summary in-context |
| Parallel > 5 branches | Write each branch to `parallel/{id}/{branch}.md` |
| Loop > 10 iterations | Write loop history to `loops/{id}.json` |
| Explicit checkpoint | Write full state to `checkpoints/` |
| Context window pressure | Selectively offload oldest state |

### 3.3 Session IDs (Future)

Each execution generates a unique session ID:
```
run-20260103-143052-abc123
```

Format: `run-{YYYYMMDD}-{HHMMSS}-{random}`

This enables:
- Multiple concurrent executions
- Execution history and replay
- Checkpoint/resume across sessions

---

## Part 4: Interpreter.md Updates

The current `interpreter.md` has a brief "State Tracking" section (lines 337-355). It needs significant expansion.

### 4.1 New Sections to Add

1. **Detailed State Narration Protocol** (from Part 2)
   - Add explicit narration formats for each construct
   - Add examples of state tracking in action

2. **Variable Binding Semantics**
   - How to track `let` vs `const`
   - Shadow detection and handling
   - Scope rules for loops and blocks

3. **Context Serialization Guidelines**
   - When to summarize vs preserve
   - Format templates
   - Handling very large contexts

4. **Parallel State Coordination**
   - Branch tracking pattern
   - Result aggregation
   - Join strategy implications for state

5. **Loop State Management**
   - Counter maintenance
   - Condition evaluation history
   - Variable scoping per iteration

6. **Error State Handling**
   - Exception propagation rules
   - Error variable lifecycle
   - Retry state tracking

### 4.2 Structural Changes

Current structure (to preserve):
```
1. The Execution Model
2. Syntax Grammar (Condensed)
3. Spawning Sessions
4. Parallel Execution
5. Evaluating Discretion Conditions
6. Context Passing
7. Loop Execution
8. Error Propagation
9. State Tracking           ← EXPAND THIS
10. Choice and Conditional
11. Block Invocation
12. Pipeline Execution
13. String Interpolation
14. Complete Execution Algorithm
15. Implementation Notes
16. Summary
```

Proposed expansion:
```
9. State Tracking
   9.1 The Narration Protocol
   9.2 State Categories
   9.3 Variable Bindings
   9.4 Parallel State Coordination
   9.5 Loop State Management
   9.6 Error State Handling
   9.7 Context Serialization
   9.8 State Recovery (if interrupted)
```

### 4.3 Key Additions to Interpreter.md

**Example: Full execution trace for a complex program**

```prose
agent researcher:
  model: sonnet

let research = session: researcher
  prompt: "Research AI safety"

parallel:
  a = session "Analyze risk A"
  b = session "Analyze risk B"

loop until **analysis complete** (max: 3):
  session "Synthesize findings"
    context: { a, b, research }
```

**Expected narration:**
```
📋 Program Start: Collecting definitions
   - Agent: researcher (model: sonnet)

📍 Statement 1: let research = session: researcher
   Spawning session with prompt: "Research AI safety"
   Model: sonnet
   [Task tool call]
✅ Session complete: "AI safety research covers alignment, robustness..."
📦 let research = <result summary>

📍 Statement 2: parallel block (3 branches)
🔀 Entering parallel (strategy: all, on-fail: fail-fast)
   [Task tool calls for a and b simultaneously]
🔀 Parallel complete:
   - a = "Risk A analysis: potential misalignment..."
   - b = "Risk B analysis: robustness concerns..."
📦 a = <result>, b = <result>

📍 Statement 3: loop until **analysis complete** (max: 3)
🔄 Starting loop

🔄 Iteration 1 of max 3
   📍 session "Synthesize findings" with context: { a, b, research }
   [Task tool call]
   ✅ Session complete: "Initial synthesis shows..."
   🔄 Evaluating: **analysis complete**
   → Not yet satisfied (synthesis is preliminary)

🔄 Iteration 2 of max 3
   [...]
   🔄 Evaluating: **analysis complete**
   → Satisfied! Analysis is comprehensive.

🔄 Loop exited: condition satisfied at iteration 2

📋 Program Complete
```

---

## Part 5: Prose.md (Compiler) Updates

The compiler's role in state management is **validation and preparation**, not runtime tracking.

### 5.1 Validation Rules for State

| Rule | Severity | Description |
|------|----------|-------------|
| Undefined variable | Error | Referenced variable not in scope |
| Const reassignment | Error | Attempting to reassign `const` binding |
| Shadow warning | Warning | Loop/block variable shadows outer |
| Context undefined | Error | Variable in context not defined |
| Unused variable | Warning | Variable defined but never used |

### 5.2 Canonical Form for State Clarity

The compiler should expand syntax sugar to make state tracking unambiguous:

**Input:**
```prose
a = session "Task A"
```

**Canonical:**
```prose
a = session "Task A"   # mutable reassignment
```

**Input:**
```prose
parallel:
  session "A"
  session "B"
```

**Canonical (with implicit names):**
```prose
parallel:
  _branch_0 = session "A"
  _branch_1 = session "B"
```

### 5.3 State Hints in Compiled Output

The compiler could add annotations to help the interpreter:

```prose
# @state: variables=[research, analysis]
# @state: max_parallel_branches=3
# @state: loop_max=10
```

This is optional but could help with:
- Pre-allocating state tracking structures
- Validating state consistency
- Debugging complex programs

### 5.4 Scope Analysis

The compiler should perform scope analysis to:
1. Identify all variable bindings
2. Determine variable lifetimes
3. Detect potential shadowing
4. Verify context references are in scope

**Output of scope analysis:**
```json
{
  "variables": [
    { "name": "research", "type": "let", "line": 5, "scope": "global" },
    { "name": "analysis", "type": "const", "line": 8, "scope": "global" },
    { "name": "i", "type": "implicit", "line": 12, "scope": "loop:12-15" }
  ],
  "shadows": [
    { "name": "item", "outer_line": 3, "inner_line": 10, "inner_scope": "loop:10-13" }
  ]
}
```

---

## Part 6: Implementation Checklist

### Phase 1: Update interpreter.md (Immediate)

- [ ] Expand Section 9 "State Tracking" with full narration protocol
- [ ] Add state narration examples for each construct type
- [ ] Add "Context Serialization Guidelines" subsection
- [ ] Add "State Recovery" subsection for interrupted executions
- [ ] Add complete execution trace example

### Phase 2: Update prose.md (Immediate)

- [ ] Add scope analysis documentation
- [ ] Add state-related validation rules
- [ ] Document canonical form state transformations
- [ ] Add state hints section (optional annotations)

### Phase 3: Test with Examples (Validation)

- [ ] Trace execution of `13-variables-and-context.prose`
- [ ] Trace execution of `19-advanced-parallel.prose`
- [ ] Trace execution of `22-error-handling.prose`
- [ ] Verify state narration is clear and complete

### Phase 4: Document Filesystem State (Deferred)

- [ ] Document directory structure in prose.md
- [ ] Document when to use filesystem state
- [ ] Document session ID format
- [ ] Leave as "Future" section

---

## Part 7: Summary for Blank-Slate Agent

A blank-slate agent implementing this plan needs to understand:

### Core Concepts

1. **State lives in conversation history** - The orchestrator "thinks aloud" to persist state
2. **Narration is the API** - Structured narration format makes state visible and recoverable
3. **Each construct has state patterns** - Variables, loops, parallel, errors each have specific patterns
4. **Context is serialized intelligently** - Summarize large values, preserve small ones

### Implementation Order

1. Read `interpreter.md` to understand execution model
2. Read this plan to understand state management
3. Implement narration protocol for each construct
4. Track state via narration during execution
5. Serialize context appropriately when spawning sessions

### Critical Insight

The state management is not complex code—it's **disciplined narration**. The orchestrator is an AI that can remember what it has said. By saying state explicitly, it persists automatically.

---

## Appendix A: State Narration Emoji Reference

| Emoji | Meaning |
|-------|---------|
| 📋 | Program-level event (start, end) |
| 📍 | Execution position marker |
| 📦 | Variable binding/state |
| ✅ | Completion (success) |
| ⚠️ | Warning or error |
| 🔀 | Parallel execution |
| 🔄 | Loop execution |
| 🔗 | Pipeline execution |
| 🛡️ | Error handling (try/catch) |
| ➡️ | Condition evaluation result |

---

## Appendix B: Example Execution Traces

### B.1 Simple Variable Flow

```prose
let a = session "Get A"
let b = session "Get B"
session "Combine"
  context: [a, b]
```

**Trace:**
```
📋 Program Start

📍 Statement 1: let a = session "Get A"
   [Task: "Get A"]
✅ Result: "Value of A..."
📦 let a = "Value of A..."

📍 Statement 2: let b = session "Get B"
   [Task: "Get B"]
✅ Result: "Value of B..."
📦 let b = "Value of B..."

📍 Statement 3: session "Combine" with context: [a, b]
   Context serialized:
   ---
   a: "Value of A..."
   b: "Value of B..."
   ---
   [Task: "Combine" with context]
✅ Result: "Combined result..."

📋 Program Complete
```

### B.2 Parallel with Named Results

```prose
parallel:
  x = session "Task X"
  y = session "Task Y"

session "Use both"
  context: { x, y }
```

**Trace:**
```
📋 Program Start

📍 Statement 1: parallel block
🔀 Entering parallel (2 branches, strategy: all)
   [Task: "Task X"] [Task: "Task Y"]  # Concurrent
🔀 All branches complete:
   - x = "Result X..."
   - y = "Result Y..."
📦 x = "Result X...", y = "Result Y..."

📍 Statement 2: session "Use both" with context: { x, y }
   Context serialized:
   ---
   x: "Result X..."
   y: "Result Y..."
   ---
   [Task with context]
✅ Result: "Combined..."

📋 Program Complete
```

### B.3 Loop with Condition

```prose
loop until **satisfied** (max: 3):
  session "Iterate"
```

**Trace:**
```
📋 Program Start

📍 Statement 1: loop until **satisfied** (max: 3)
🔄 Starting loop

🔄 Iteration 1 of max 3
   📍 session "Iterate"
   [Task]
   ✅ Result: "First attempt..."
   🔄 Evaluating: **satisfied**
   ➡️ Not satisfied (needs more work)

🔄 Iteration 2 of max 3
   📍 session "Iterate"
   [Task]
   ✅ Result: "Second attempt..."
   🔄 Evaluating: **satisfied**
   ➡️ Satisfied! Work is complete.

🔄 Loop exited: condition satisfied at iteration 2

📋 Program Complete
```

---

## Appendix C: Constraints from Claude Code Task Tool

From research on the Task tool:

| Constraint | Implication for State |
|------------|----------------------|
| **Max 10 concurrent Tasks** | Parallel blocks with >10 branches execute in batches |
| **No shared memory** | All state lives in orchestrator, not subagents |
| **Results as final output** | Subagent results must be captured and narrated |
| **200k token context** | Long programs may need context compaction |

---

## Appendix D: Related Files

| File | Purpose |
|------|---------|
| `TENETS.md` | Core design principles |
| `CEO_PREFERENCES.md` | Decision rationale and quotes |
| `ELEGANT_SIMPLIFICATION.md` | Two-file architecture plan |
| `interpreter.md` | Execution semantics (to be updated) |
| `prose.md` | Full language spec (to be updated) |

