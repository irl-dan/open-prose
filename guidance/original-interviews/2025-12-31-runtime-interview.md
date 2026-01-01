# OpenProse: Runtime Behavior

Based on CEO answers from QUESTIONS.md and ORCHESTRATOR.md.

---

## Updates from ORCHESTRATOR.md

**Key revelation:** OpenProse ships as a **Skill**, making it framework-agnostic:

- Works with **Claude Code** (primary)
- Works with **OpenCode**
- Potentially other frameworks

The Orchestrator uses native subagent tools rather than custom implementations.

---

## Distribution Model

### OpenProse as a Skill

```
.opencode/skill/open-prose/
├── SKILL.md          # Interpreter documentation
├── parser/           # DSL parser
└── examples/         # Example programs
```

Or for Claude Code:

```
CLAUDE.md             # Or however Claude Code loads skills
```

<CEO timestamp="2025-12-31 12:46:00">
Note that Claude loads skills the same way:

```
.claude/skills/open-prose
├── SKILL.md          # Interpreter documentation
├── parser/           # DSL parser
└── examples/         # Example programs
```

</CEO>

### What the Skill Contains

1. **Interpreter documentation** — How to interpret the DSL
2. **Execution rules** — Control flow, context passing, etc.
3. **Parser** — For compile phase

---

## Two-Phase Execution

### Phase 1: Compile

```bash
open-prose compile program.prose
```

<CEO timestamp="2025-12-31 12:46:00">This was my expectation. And it's my expectation that you could run this before starting the agent in bash _or_ the agent could run it itself if asked to run a loom program that itself had not yet been compiled after it inspected the state.</CEO>

Or integrated:

```bash
open-prose run program.prose
```

<CEO timestamp="2025-12-31 12:47:00">I'm not sure what this does... is this just a wrapper around Claude Code or OpenCode? If so, then our mental models align. My assumption going into this was that you'd just run `claude ...` and then from inside the session say: "Run program.prose". But this may be worse for any number of reasons so I'm open to having this wrapper. Either way, I do think the latter method should work, and if it's not been compiled yet I would expect Claude Code to first run `open-prose compile program.prose` and then go to town once that was complete.</CEO>

The compile phase:

1. Parses the DSL
2. Installs imported skills
3. Validates references
4. Expands syntax sugar
5. Generates Orchestrator prompt

**Output:** A validated program ready for the Orchestrator.

<CEO timestamp="2025-12-31 12:48:00">This is exactly what I'd expect. I want to flesh out the last two a little more and make sure I have oversight of what we're expanding and what we're generating when we get to that. But this is the right track.</CEO>

### Phase 2: Run

The Orchestrator Session starts with:

- System prompt: OpenProse Interpreter (from Skill)
- First message: Compiled program

The Orchestrator then:

1. Triggers any remaining compile steps
2. Executes the program using native subagents
3. Passes context intelligently
4. Reports progress (visible in TUI)

<CEO timestamp="2025-12-31 12:49:00">This is exactly my mental model. Awesome!</CEO>

---

## CLI Commands

```bash
# Compile and run
open-prose run my-program.prose

# Just compile/validate
open-prose compile my-program.prose

# Install skills from imports
open-prose install my-program.prose

# Validate without compiling
open-prose validate my-program.prose
```

<CEO timestamp="2025-12-31 12:50:00">I like these and my comments above tell the story.</CEO>

---

## Logging & Transparency

**No custom logging needed.** The Orchestrator runs as a visible session:

- Claude Code: Visible in TUI, all reasoning logged
- OpenCode: Visible in TUI, all reasoning logged

Progress reporting happens automatically because the Orchestrator's thinking is visible.

<CEO timestamp="2025-12-31 12:51:00">Exactly.</CEO>

---

## State Management

The Orchestrator may need to track execution state for complex programs:

**Primary:** In-context (conversation history)
**Fallback:** Filesystem-based state files

From CEO:

> "We should consider encouraging the Orchestrator Session to use the filesystem to write 'state'. But let's punt on this."

<CEO timestamp="2025-12-31 12:52:00">Yes, this is right.</CEO>

---

## Framework-Specific Considerations

### Claude Code

- Uses **Task tool** for subagents
- Supports async subagents
- Skill assignment: TBD (needs research)

### OpenCode

- Subagent API: TBD (needs research)
- Async support: TBD
- Skill assignment: TBD

**Action item:** Research OpenCode's subagent capabilities to ensure parity.

<CEO timestamp="2025-12-31 12:53:00">It sounds like we did this research and have confirmed some of these. See the other files.</CEO>

---

## Implementation Order

1. **MVP (Claude Code):**

   - CLI that compiles and generates prompt
   - OpenProse Skill with interpreter
   - Use Task tool for subagents

2. **OpenCode Support:**

   - Research subagent API
   - Adapt interpreter for OpenCode
   - Test parity

3. **Enhancements:**
   - Filesystem state management
   - Better syntax sugar expansion
   - More framework support

<CEO timestamp="2025-12-31 12:54:00">This is great, good ordering.</CEO>

---

## Punted

- TUI / rich progress display (use framework TUI)
- Parallel output interleaving (framework handles)
- REPL / interactive mode
- Cost warnings
- Multiple programs per server

<CEO timestamp="2025-12-31 12:55:00">Correct.</CEO>
