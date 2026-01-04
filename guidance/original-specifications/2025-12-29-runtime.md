# OpenProse Specification: Runtime

> Derived from CEO interview on 2024-12-31

---

## Overview

OpenProse uses a **two-phase execution model**: a static compile phase followed by an intelligent runtime phase. The system ships as a **Skill** that works with Claude Code (primary) and OpenCode.

---

## Distribution Model

### Skill Folder Structure

**Claude Code:**
```
.claude/skills/open-prose/
├── SKILL.md          # Interpreter documentation
├── parser/           # DSL parser (executable)
└── examples/         # Example programs
```

**OpenCode:**
```
.opencode/skill/open-prose/
├── SKILL.md          # Interpreter documentation
├── parser/           # DSL parser (executable)
└── examples/         # Example programs
```

### Skill Contents

1. **Interpreter documentation** — How to interpret the DSL
2. **Execution rules** — Control flow, context passing, etc.
3. **Parser** — For compile phase (bundled executable)

---

## Two-Phase Execution

### Phase 1: Compile (Static)

```bash
open-prose compile program.prose
```

The compile phase:
1. Parses the DSL
2. Installs imported skills
3. Validates agent/skill references
4. Expands syntax sugar
5. Generates Orchestrator prompt

**Output:** A validated, expanded program ready for the Orchestrator.

**Note:** CEO wants oversight of syntax sugar expansion and prompt generation details during implementation.

### Phase 2: Run (Intelligent)

The Orchestrator Session executes:
- **System prompt:** OpenProse Interpreter (from Skill)
- **First message:** Compiled program

The Orchestrator then:
1. Triggers any remaining compile steps if needed
2. Executes the program using native subagents
3. Passes context intelligently
4. Reports progress (visible in TUI)

---

## CLI Commands

```bash
# Compile and run (wrapper around Claude Code/OpenCode)
open-prose run my-program.prose

# Just compile/validate
open-prose compile my-program.prose

# Install skills from imports
open-prose install my-program.prose

# Validate without compiling
open-prose validate my-program.prose
```

### Alternative: In-Session Execution

Users can also run programs from within an existing Claude Code session:

```
User: Run program.prose
Claude: [Checks if compiled, runs `open-prose compile` if needed, then executes]
```

---

## Build Targets

OpenProse compiles for different target frameworks. Specify the target via CLI flags:

```bash
# Explicit target
open-prose compile program.prose --target claude-code
open-prose compile program.prose --target opencode

# Auto-detect (default)
open-prose compile program.prose
```

### Auto-Detection

When no target is specified, the compiler auto-detects:
1. If `.claude/` exists → targets Claude Code
2. If `.opencode/` exists → targets OpenCode
3. If both exist → error, must specify explicitly
4. If neither exists → defaults to Claude Code

### What Changes Per Target

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| Skill install path | `.claude/skills/` | `.opencode/skill/` |
| Skill loading | Native `skills:` field | Inject prompt instructions |
| Agent config format | `.claude/agents/*.md` | `.opencode/agent/*.md` |

---

## Framework Differences

### Skill Loading

**Claude Code:** Skills listed in agent config are auto-loaded when the subagent starts. The `skills:` field in agent configuration is natively supported.

**OpenCode:** Skills must be loaded at runtime via tool calls. The compile phase injects skill-loading instructions into the session prompt.

| Compile Target | Skill Handling |
|----------------|----------------|
| Claude Code | Native `skills:` field in agent config |
| OpenCode | Prompt prefix: "First, load the following skills: [skill-name]. Use the skill tool to load each one before proceeding." |

This asymmetry is handled automatically by the compiler—authors write the same `.prose` code for both targets.

---

## Logging & Transparency

**No custom logging needed.** The Orchestrator runs as a visible session:

- Claude Code: Visible in TUI, all reasoning logged
- OpenCode: Visible in TUI, all reasoning logged

Progress reporting happens automatically because the Orchestrator's thinking is visible.

---

## State Management

### MVP Approach: In-Context Only

For the initial implementation, **all state is tracked in-context** (conversation history). The Orchestrator uses its own reasoning to track:

| State Type | How Tracked |
|------------|-------------|
| Execution flow | Implicit in conversation ("we just completed X, now executing Y") |
| Variable bindings (`let`, `const`) | Remembered conceptually ("x contains the result of session X") |
| Context for passing | Held in conversation, summarized/transformed when passing |
| Loop state | Implicit iteration tracking ("This is iteration 47 of 100") |
| Reduce accumulator | Flows through context passing session-to-session |

The Orchestrator may use techniques like "talking aloud to itself" to maintain state clarity during execution.

### Deferred: Filesystem State

Filesystem-based state management is **deferred** for future implementation:

- `.prose/state/{variable}.md` — For persisting variables across context overflow
- `.prose/checkpoint.json` — For crash recovery and resume
- `.prose/parallel/{block_id}/` — For large parallel block results

These will be revisited if in-context tracking proves insufficient for long-running programs.

---

## Implementation Order

### Phase 1: MVP (Claude Code)

- CLI that compiles and generates prompt
- OpenProse Skill with interpreter
- Use Task tool for subagents

### Phase 2: OpenCode Support

- Adapt interpreter for OpenCode
- Skill-loading workaround (inject instructions)
- Test parity

### Phase 3: Enhancements

- Filesystem state management
- Better syntax sugar expansion
- Additional framework support

---

## Not Supported (Deferred)

| Feature | Status |
|---------|--------|
| TUI / rich progress display | Use framework TUI |
| Parallel output interleaving | Framework handles |
| REPL / interactive mode | Deferred |
| Cost warnings | Deferred |
| Multiple programs per server | Deferred |

---

## Cross-References

- **Orchestrator behavior**: See Orchestrator specification
- **Session execution**: See Sessions documentation
- **Skill format**: See Skills specification
