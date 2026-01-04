# OpenProse Specification: Orchestrator

> Derived from CEO interviews on 2024-12-30, 2024-12-31

---

## Overview

The Orchestrator is an **intelligent LLM session** that executes OpenProse programs. It follows a **hybrid approach**: strict adherence to program structure, but intelligent handling of context passing and condition evaluation.

The Orchestrator ships as a **Skill**, making it framework-agnostic (works with both Claude Code and OpenCode).

---

## Architecture

### Two-Phase Execution

#### Phase 1: Compile (Static)

The `loom compile` step handles deterministic preprocessing:

1. Parse DSL syntax
2. Install imported skills
3. Validate agent/skill references
4. Expand syntax sugar for easier model interpretation

**Output:** A validated, expanded program ready for the Orchestrator.

#### Phase 2: Run (Intelligent)

The Orchestrator Session executes the program:

- Receives the OpenProse Interpreter (Skill + parser)
- Receives the compiled OpenProse Program
- Uses the most intelligent model (Opus 4.5)
- Executes using existing subagent constructs

---

## Hybrid Responsibility Model

| Aspect | Behavior | Notes |
|--------|----------|-------|
| Execution order | **Strict** | Follows DSL exactly |
| Session creation | **Strict** | Creates what program specifies |
| Parallel coordination | **Strict** | Executes parallel blocks as specified |
| Loop iteration count | **Strict** | `repeat 3` means exactly 3 |
| Error propagation | **Strict** | Follows try/catch/retry as specified |
| Context passing | **Intelligent** | Summarizes/transforms as needed |
| Condition evaluation | **Intelligent** | Interprets `until approved` semantically |
| Choice block routing | **Intelligent** | Decides which path based on context |
| Completion detection | **Intelligent** | Determines when session is "done" |

**Key principle:** The Orchestrator executes structure mechanically but has discretion over data transformation.

---

## Framework Agnostic

The Orchestrator ships as a **Skill** that works with:

- **Claude Code** (primary)
- **OpenCode**
- Potentially other frameworks

This is achieved by:
1. Distributing the interpreter as a Skill (markdown + instructions)
2. Using each framework's native subagent constructs
3. Avoiding framework-specific APIs where possible

---

## Subagent Integration

### Inversion of Control Pattern

The Orchestrator acts as an **IOC container** that coordinates ALL session spawning:

- Subagents do **not** spawn other subagents
- Even "nested" sessions in the DSL are spawned directly by the Orchestrator
- The Orchestrator maintains full control over execution flow
- This matches framework limitations (neither Claude Code nor OpenCode allow subagent nesting)

```
# DSL with apparent nesting:
session "Outer":
  session "Inner"   # NOT spawned by "Outer"

# Actual execution:
# 1. Orchestrator spawns "Outer"
# 2. Orchestrator spawns "Inner" (not "Outer")
# 3. Orchestrator coordinates results
```

### No Custom Tools Required

The Orchestrator uses **existing subagent constructs** rather than custom `loom_*` tools:

| Framework | Subagent Mechanism |
|-----------|-------------------|
| Claude Code | Task tool (sync and async) |
| OpenCode | Task tool (identical API) |

### No Explicit Return/Error Tools

Since the Orchestrator is intelligent, it can determine success/failure from session output directly. The `loom_return` and `loom_error` tools are **not required**.

The Orchestrator:
- Interprets session output semantically
- Determines completion from context
- Handles errors based on output analysis

---

## Condition Evaluation

For constructs like `loop until approved`:

1. **Prompt guidance**: Write session prompts with focused outputs to assist interpretation
2. **Semantic analysis**: Orchestrator interprets output to evaluate conditions
3. **No structured returns required**: Don't need `{ approved: true }` format

The Orchestrator relies on model intelligence for condition evaluation.

---

## State Management

For MVP, the Orchestrator tracks **all state in-context** (conversation history):

| State Type | Tracking Approach |
|------------|-------------------|
| Execution flow | Implicit reasoning ("completed X, now executing Y") |
| Variable bindings | Conceptual memory ("x contains result of session X") |
| Context for passing | Held in history, summarized when passing |
| Loop counters | Explicit tracking ("iteration 47 of 100") |
| Reduce accumulators | Passed session-to-session via context |

### Techniques

The Orchestrator uses "talking aloud to itself" to maintain state clarity:
- Announcing current position in program
- Summarizing key variable values before proceeding
- Confirming loop iteration counts

### Deferred: Filesystem State

Filesystem-based state (`.prose/state/`, `.prose/checkpoint.json`) is deferred. Will be revisited if in-context tracking proves insufficient for long-running programs.

---

## Logging & Transparency

Execution is transparent because:
- Orchestrator runs as a visible session (TUI in Claude Code/OpenCode)
- All reasoning is logged automatically by the framework
- No additional logging implementation needed

---

## Cost

Cost is **not a concern**. The Orchestrator always uses the most intelligent model (Opus 4.5) for correctness over economy.

---

## Implementation Components

### The OpenProse Skill

Distributed as a Skill containing:
1. **Interpreter documentation** (markdown explaining the DSL)
2. **Execution rules** (how to handle each construct)
3. **Parser bundle** (for compile phase)

### Compile Phase CLI

```bash
open-prose compile program.prose
# Outputs: validated, expanded program
```

Or combined:
```bash
open-prose run program.prose
# Compiles then starts Orchestrator session
```

---

## Research Findings (Resolved)

### Subagent APIs ✅

| Question | Answer |
|----------|--------|
| OpenCode Task equivalent? | Yes - identical `Task` tool API |
| Async subagent support? | Claude Code: Yes (recently added). OpenCode: `prompt_async` endpoint |
| Skill assignment? | Claude Code: `skills` field auto-loads. OpenCode: runtime `skill()` calls |
| Context passing? | Via prompt parameter in Task tool |

### Implementation Priority

1. **Phase 1:** Build for Claude Code (primary target)
2. **Phase 2:** Add OpenCode support (skill-loading workaround)
3. **Phase 3:** Evaluate true async needs based on real usage

---

## Example Flow

```
User runs: open-prose run my-program.prose

1. COMPILE PHASE (CLI)
   - Parse my-program.prose
   - Install skills from imports
   - Validate references
   - Expand syntax sugar
   - Generate Orchestrator prompt

2. RUN PHASE (Session)
   - Start Orchestrator session with:
     - System prompt: OpenProse Interpreter
     - First message: Compiled program
   - Orchestrator executes:
     - Creates subagents for each session
     - Follows control flow strictly
     - Passes context intelligently
     - Evaluates conditions semantically
   - Progress visible in TUI
```

---

## Not Supported

| Feature | Status | Notes |
|---------|--------|-------|
| Custom loom_* tools | Not needed | Use native subagents |
| loom_return/loom_error | Not needed | Intelligent interpretation |
| Cost optimization | Deferred | Not a priority |
| Caching/memoization | Deferred | May use filesystem later |
