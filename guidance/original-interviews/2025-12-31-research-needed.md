# OpenProse: Research Needed

Action items from ORCHESTRATOR.md interview requiring investigation.

---

## ✅ Priority 1: Subagent Capabilities (COMPLETED)

### Claude Code Task Tool ✅ RESEARCHED

| Question                             | Answer                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Can we pass skills to subagents?     | **Yes** - via `skills` field in agent frontmatter. Skills auto-load when subagent starts. |
| Can we specify model/agent type?     | **Yes** - via `model` field (aliases: sonnet/opus/haiku or 'inherit')                     |
| How do async subagents work?         | **Sync only**, but parallel execution via multiple Task calls in one message              |
| What output format does Task return? | Text result + `<task_metadata>session_id: {id}</task_metadata>`                           |

**Key Details:**

- Agent definitions live in `.claude/agents/*.md`
- Supports `tools`, `model`, `permissionMode`, `skills` configuration
- Subagents cannot spawn subagents (prevents infinite nesting)
- Resumable via `session_id` or `resume` parameter

### OpenCode Subagent API ✅ RESEARCHED

| Question                              | Answer                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Does OpenCode have a Task equivalent? | **Yes** - identical `Task` tool with same parameters                   |
| Can we spawn async subagents?         | **Partially** - `prompt_async` endpoint exists for async prompts       |
| Can we assign skills to subagents?    | **No auto-load** - agents call `skill()` tool during execution         |
| How do we pass agent configuration?   | Via `.opencode/agent/*.md` or `opencode.json` with rich config options |

**Key Details:**

- Agent definitions use `mode: subagent` to distinguish from primary agents
- Supports `model` (full provider/model-id), `tools`, `permission`, `temperature`
- Child sessions linked via `parentID` - TUI supports session navigation
- `task: false` by default in subagents (same nesting prevention)

---

## ✅ Priority 2: Skill Distribution (PARTIALLY ANSWERED)

### Claude Code Skills

| Question                            | Answer                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Current skill loading mechanism?    | `skills` field in agent frontmatter auto-loads at subagent start                           |
| Can skills include executable code? | **Yes** - Skills are folders containing SKILL.md + arbitrary files (including executables) |
| Skill format/structure?             | Same as OpenCode - YAML frontmatter + markdown body                                        |

### OpenCode Skills

| Question                            | Answer                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| How does discovery work?            | Scans `.opencode/skill/*/SKILL.md` and `~/.config/opencode/skill/*/SKILL.md` |
| Can skills include code components? | **Yes** - Skills are folders; can include any files alongside SKILL.md       |
| Bundle parser + docs?               | **Yes** - Parser ships in skill folder, referenced from SKILL.md             |

**Implication:** OpenProse ships as a **skill folder** containing SKILL.md + parser + examples. No plugin needed.

---

## ✅ Priority 3: Framework Parity (COMPLETED)

| Feature                | Claude Code                 | OpenCode                     |
| ---------------------- | --------------------------- | ---------------------------- |
| Subagent spawning      | Task tool                   | Task tool (identical API)    |
| Async subagents        | No (parallel sync only)     | `prompt_async` endpoint      |
| Parallel subagents     | Multiple Task calls         | Multiple Task calls          |
| Skill assignment       | `skills` field (auto-load)  | Via `skill()` tool call      |
| Model selection        | `model` field (aliases)     | `model` field (full ID)      |
| Permission config      | `permissionMode` field      | Rich `permission` object     |
| Tool restrictions      | `tools` list                | `tools` object with patterns |
| Session resumption     | `session_id`/`resume` param | `session_id` param           |
| Child session tracking | `parentID`                  | `parentID`                   |
| Visible reasoning      | TUI                         | TUI                          |
| Subagent nesting       | Blocked                     | Blocked                      |

**Verdict:** Near feature parity. Both frameworks can support OpenProse's session model.

---

## Resolved Blockers

| Concern                              | Resolution                                                      |
| ------------------------------------ | --------------------------------------------------------------- |
| OpenCode lacks subagent capabilities | **False** - full Task tool support                              |
| Skill assignment not possible        | **Partial** - Claude Code native, OpenCode via prompt injection |
| Need custom plugin                   | **Not needed** for session management                           |

---

## Remaining Research

### For MVP Implementation

1. **Skill auto-loading for OpenCode**

   - Options: Inject skill-load instructions in prompt, or pre-load via plugin
   - Decision needed: Accept prompt injection workaround?

2. ~~**Parser bundling**~~ ✅ RESOLVED

   - Skills ARE folders that can include executables
   - OpenProse ships as a skill folder with parser included
   - No plugin needed

3. **True async execution**
   - OpenCode `prompt_async` needs testing for Orchestrator use case
   - Alternative: Parallel sync calls may be sufficient

---

## Notes

From CEO:

> "Ideally we want to use whatever Subagent constructs already exist in both languages. Is this possible?"

**Answer: Yes.** Both frameworks have mature, nearly identical Task tool implementations.

> "I think we'd need to do both [sync and async subagents] in order to take advantage of existing Subagents and not need to roll our own plugin with specialized tools."

**Answer:** Sync is native. True async limited in Claude Code but parallel sync may suffice. OpenCode has `prompt_async` endpoint.

---

## Open Questions for CEO

Based on research findings, the following decisions are needed:

### 1. Skill Handling Asymmetry

Claude Code auto-loads skills via agent config. OpenCode requires runtime `skill()` tool calls.

**Options:**

- A) Accept asymmetry - inject skill-load instructions into OpenCode prompts
- B) Standardize on runtime loading for both (more consistent, slightly more tokens)
- C) Require OpenCode users to pre-load skills via their own plugin

**Recommendation:** Option A is pragmatic for MVP.

<CEO timestamp="2025-12-31 12:43:00">Accept Assymetry, we don't care about that for now. In fact, let's make the MVP work for Claude Code and then we'll do OpenCode second.</CEO>

### ~~2. OpenProse Distribution Format~~ ✅ RESOLVED

~~Skills cannot include executable code.~~ **Correction:** Skills ARE folders that can include any files.

**Resolution:** Ship OpenProse as a **skill folder**:

```
open-prose/
├── SKILL.md          # Interpreter documentation
├── parser/           # Bundled parser (executable)
└── examples/         # Example programs
```

No plugin needed. Original skill-based architecture works as intended.

### 3. Subagent Nesting Limitation

Neither framework allows subagents to spawn subagents.

**Impact on DSL:**

- `session` blocks inside `session` blocks won't work natively
- Orchestrator must handle all session spawning directly

**Question:** Is nested session spawning a requirement? Current DSL seems to avoid this but should confirm.

<CEO timestamp="2025-12-31 12:44:00">No, this is a good callout but I think you have a misconception about how nested blocks should work. Note that the IOC container orchestrates _every_ call between sessions. Even a nested session is co-ordinated by the Orchestrator Session. Do you need me to expand on this more? If so, or if you think I'm missing any complexity that you're worried about, please bubble that up. Otherwise, assuming this is sensible, take this into account in the spec and let's move on.</CEO>

### 4. Async Execution Model

For `parallel` blocks, parallel sync calls are sufficient.

For true background execution (fire-and-forget):

- OpenCode: Use `prompt_async` endpoint
- Claude Code: Not natively supported

**Question:** Is fire-and-forget async actually needed for any OpenProse constructs? Or is "parallel-then-join" sufficient?

<CEO timestamp="2025-12-31 12:45:00">At least of Claude Code, this is an outdated assumption. Claude Code just introduced async subagents a couple weeks ago, where you can kick multiple off in parallel. That said, I'm not sure if OpenCode supports async sessions. This is worth more research if you're unsure.</CEO>

---

## Implementation Path

1. **Phase 1:** Build for Claude Code (primary target)
2. **Phase 2:** Add OpenCode support with skill-loading workaround
3. **Phase 3:** Evaluate true async needs based on real usage
