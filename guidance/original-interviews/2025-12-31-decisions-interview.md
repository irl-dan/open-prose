# OpenProse: Decisions Needed

> Follow-up decisions required from specification review and CEO feedback.
> Generated 2025-12-31

---

## Completed Updates

The following changes have been made to specifications based on CEO feedback:

| Change                                            | Files Updated                      |
| ------------------------------------------------- | ---------------------------------- |
| Removed `loom_error` references                   | error-handling.md                  |
| Standardized quoted imports                       | skills.md, agents.md, all examples |
| Standardized quoted skills arrays                 | agents.md, all examples            |
| Removed `race:` block (use `parallel ("first"):`) | composition.md, parallel.md        |
| Added quoted modifiers for parallel               | parallel.md                        |
| Added `throw` keyword                             | syntax.md, error-handling.md       |
| Added `const` keyword                             | syntax.md                          |
| Removed reduce Pattern B                          | loops.md                           |
| Added block parameters syntax                     | composition.md                     |
| Updated all example files                         | examples/\*.prose                   |

---

## Decision 1: Orchestrator Discretion Syntax

**CEO's Proposal:**

> "I'm wondering if we need a slightly different syntax to 'call out to the orchestrator' to let it know that we're sort of 'putting the operating ball in his court'. My proposal for that syntax would be to use **classic markdown bolding syntax**."

**Current situation:**

```
loop until approved:     # "approved" is just a bare identifier
  session "Write draft"
```

**Proposed with bold syntax:**

```
loop until **approved**:     # Bold signals orchestrator discretion
  session "Write draft"
```

### Options

**Option A: Markdown Bold (CEO's suggestion)**

```
loop until **approved**:
choice **based on priority**:
  session "Option A"
  session "Option B"
```

Pros:

- Visually distinct
- Can include multi-word phrases: `**user is satisfied with the result**`
- Familiar markdown syntax

Cons:

- Unusual in programming languages
- May be awkward with syntax highlighting
- Multi-line unclear

**Option B: Backticks (Alternative)**

```
loop until `approved`:
choice `based on priority`:
```

Pros:

- Also familiar from markdown
- Cleaner for single words

Cons:

- Less visually distinct than bold
- Backticks often mean "code" not "natural language"

**Option C: Angle Brackets**

```
loop until <approved>:
choice <based on priority>:
```

Pros:

- XML-like, distinct from strings
- Clear delimiter

Cons:

- Could conflict with future generics syntax
- Verbose

**Option D: Natural Language Strings**

```
loop until "approved":
choice "based on priority":
```

Pros:

- Already have string syntax
- Clearly "interpreted text"

Cons:

- Doesn't feel different from prompts
- Less semantic distinction

**Recommendation:** Option A (Markdown Bold) for its visual distinctiveness and ability to handle phrases naturally. Multi-line could use triple asterisks:

```
loop until ***
  the reviewer has approved all changes
  and no further modifications are needed
***:
```

<CEO timestamp="2025-12-31 17:35:00">Confirmed that we should use Option A (Markdown Bold) and triple asterisks for multi-line.</CEO>

---

## Decision 2: Canonical Session Declaration Pattern

**Current state:** Multiple patterns exist across specs and examples:

| Pattern        | Example                         | When to Use?                |
| -------------- | ------------------------------- | --------------------------- |
| Simple prompt  | `session "Do X"`                | Quick one-off               |
| Named + agent  | `session my-task: researcher`   | Named with agent type       |
| Agent only     | `session: researcher`           | Unnamed with agent          |
| Named + inline | `session synth:\n  model: opus` | Named with inline config    |
| Implicit       | `researcher:`                   | Shorthand when agent exists |

### Recommendation: Canonical Verbose Form

After expansion (compile phase), all sessions should normalize to this canonical form:

```
session <name>:
  agent: <agent-name-or-null>
  model: <model>
  skills: [<skills>]
  prompt: "<prompt>"
  context: <context-spec>
```

**Example transformations:**

```
# Input: Simple prompt
session "Do X"

# Canonical:
session anon-001:
  agent: null
  model: inherit
  skills: []
  prompt: "Do X"
  context: implicit
```

```
# Input: Named + agent
session my-task: researcher
  prompt: "Research AI"

# Canonical:
session my-task:
  agent: researcher
  model: inherit       # from agent
  skills: inherit      # from agent
  prompt: "Research AI"
  context: implicit
```

**Simplification for authors:** Keep allowing all shorthand forms in source code, but compile to canonical. This gives authors flexibility while giving the Orchestrator a single form to interpret.

<CEO timestamp="2025-12-31 17:41:00">I like the canonical form approach. I think we should also recommend a "preferred" shorthand for documentation examples. I think we should use the implicit shorthand for documentation examples. But let's keep the canonical form for the spec.</CEO>

---

## Decision 3: Remove Implicit Shorthand Ambiguity

**Problem:** The implicit shorthand `researcher:` (meaning "create session from researcher agent") is ambiguous with:

- Starting a property block
- Defining something new

**CEO said:** "No, this ambiguity is not acceptable and we should clean this up."

### Options

**Option A: Require `session` keyword always**

Remove implicit shorthand entirely. Always require `session`:

```
# Always explicit
session: researcher
  prompt: "Research AI"

session my-task: researcher
  prompt: "Research AI"
```

Pros: Unambiguous, consistent
Cons: Slightly more verbose

**Option B: Use `@` prefix for agent reference**

```
@researcher:
  prompt: "Research AI"
```

Pros: Short, distinct
Cons: New symbol to learn

**Option C: Use `do` for agent invocation**

```
do researcher:
  prompt: "Research AI"
```

Pros: Consistent with `do block-name`
Cons: `do` means "invoke block", conflating meanings

**Recommendation:** Option A - require `session` keyword always.

The implicit shorthand saves only 8 characters and introduces parsing ambiguity. For clarity:

- `agent foo:` = agent definition
- `session: foo` = unnamed session with agent
- `session name: foo` = named session with agent

<CEO timestamp="2025-12-31 17:43:00">I like Option A. Let's go with that.</CEO>

---

## Decision 4: Build Target Specification

**Context:** Installation paths differ between frameworks:

- Claude Code: `.claude/skills/open-prose/`
- OpenCode: `.opencode/skill/open-prose/`

**CEO said:** "Yes, we need some way to dictate whether we're compiling with a build target of OpenCode or Claude Code."

### Recommendation

**CLI flag during compile:**

```bash
open-prose compile program.prose --target claude-code
open-prose compile program.prose --target opencode
open-prose compile program.prose  # auto-detect from .claude or .opencode presence
```

**Config file (optional):**

```yaml
# open-prose.yaml
target: claude-code
```

**What changes per target:**

| Aspect              | Claude Code           | OpenCode                   |
| ------------------- | --------------------- | -------------------------- |
| Skill install path  | `.claude/skills/`     | `.opencode/skill/`         |
| Skill loading       | Auto via agent config | Inject prompt instructions |
| Agent config format | `.claude/agents/*.md` | `.opencode/agent/*.md`     |

**Compile output:** Generates framework-specific agent configs and skill instructions as needed.

<CEO timestamp="2025-12-31 17:44:00">We don't need to support a config file. We can just use the CLI flags, and I like the ones you've proposed. I also like the auto-detection from the .claude or .opencode presence.</CEO>

---

## Decision 5: `context` Keyword Examples

**CEO said:** "As for `context`, I'd want to see some examples of how that would be used in realistic use cases before deciding on that one."

### Example Use Cases

**Use Case 1: Explicit Single Context**

```
let research = session: researcher
  prompt: "Research quantum computing"

session: writer
  prompt: "Write a blog post"
  context: research          # Explicitly pass research output
```

Without `context:`, the writer would receive research output implicitly (as predecessor). With `context:`, it's explicit and survives refactoring.

**Use Case 2: Multiple Contexts**

```
let research = session "Research topic"
let outline = session "Create outline"
let style-guide = session "Load style guide"

session "Write article":
  context: [research, outline, style-guide]  # All three as input
```

**Use Case 3: Parallel Results**

```
parallel:
  sec = session "Security review"
  perf = session "Performance review"

session "Synthesize":
  context: { sec, perf }    # Object syntax for named contexts
```

**Use Case 4: Skip Predecessor**

```
session "Step 1"
session "Step 2"
session "Step 3":
  context: []               # Empty: receive NO predecessor context
```

**Verdict:** `context` is useful for:

- Explicit is better than implicit (clarity)
- Combining multiple sources
- Skipping predecessors when not needed

**Recommendation:** Keep `context` as a session property, document it fully. It's a property, not a keyword—appears only in session blocks.

<CEO timestamp="2025-12-31 17:45:00">I like the examples. I think we should add `context` to the spec. I think we should document it fully. I think we should keep it as a session property, not a keyword. It's a property, not a keyword—appears only in session blocks.</CEO>

---

## Decision 6: Document Skill Auto-Loading Asymmetry

**CEO said:** "Yes, we need to document this. This should be injected as a special segment of the system prompt when we've compiled for OpenCode."

**Proposed documentation addition to runtime.md:**

```markdown
## Framework Differences

### Skill Loading

**Claude Code:** Skills listed in agent config are auto-loaded when the subagent starts.

**OpenCode:** Skills must be loaded at runtime. The compile phase injects skill-loading
instructions into the session prompt:

| Compile Target | Skill Handling                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Claude Code    | Native `skills:` field in agent config                                                                                  |
| OpenCode       | Prompt prefix: "First, load the following skills: [skill-name]. Use the skill tool to load each one before proceeding." |

This asymmetry is handled automatically by the compiler—authors write the same
.prose code for both targets.
```

<CEO timestamp="2025-12-31 17:46:00">I like the documentation approach. I think we should add it to the spec. I think we should document it fully. I think we should keep it as a session property, not a keyword. It's a property, not a keyword—appears only in session blocks.</CEO>

---

## Deferred to STATE.md

The following state management questions are in a separate interview document (STATE.md):

- Variable persistence (`let` vs `const`)
- Context overflow handling
- Recovery/checkpointing
- Directory structure for state files

---

## Summary of Decisions Needed

| #   | Decision                       | Options                                      | Recommendation      |
| --- | ------------------------------ | -------------------------------------------- | ------------------- |
| 1   | Orchestrator discretion syntax | A: Bold, B: Backticks, C: Angles, D: Strings | A (Bold)            |
| 2   | Canonical session form         | Verbose canonical + shorthand source         | Confirm approach    |
| 3   | Remove implicit shorthand      | A: Require session, B: @prefix, C: do        | A (Require session) |
| 4   | Build target specification     | CLI flag + config                            | Confirm approach    |
| 5   | `context` keyword              | Document as session property                 | Confirm             |
| 6   | Skill asymmetry docs           | Add to runtime.md                            | Confirm             |
