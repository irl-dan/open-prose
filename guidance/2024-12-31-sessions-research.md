# OpenProse: Sessions Deep Dive

Follow-up questions expanding on the Sessions primitive.

---

## Updates from ORCHESTRATOR.md

**Major simplification:** The CEO confirmed that we should use **native subagent constructs** (Claude Code's Task tool, OpenCode's equivalent) rather than custom tools. This means:

- ❌ ~~`loom_return` / `loom_error` tools~~ — Not needed
- ❌ ~~Custom plugin for completion signaling~~ — Not needed
- ✅ Use existing subagent mechanisms
- ✅ Orchestrator interprets output intelligently

---

## Research Findings: Native Subagent Constructs

### Claude Code: Task Tool (AgentTool)

Claude Code provides a mature subagent system via the **Task tool**:

**How It Works:**
1. Parent agent invokes `Task` tool with parameters
2. A child session is created with its own context
3. Subagent executes with specified configuration
4. Result returns to parent as tool output

**Task Tool Parameters:**
```typescript
{
  description: string,    // Short (3-5 words) description
  prompt: string,         // Task for the agent to perform
  subagent_type: string,  // Which agent type to use
  session_id?: string,    // Resume existing session (optional)
  command?: string        // Command that triggered task (optional)
}
```

**Agent Configuration (in .claude/agents/*.md):**
```yaml
---
name: agent-name
description: When to use this agent
tools: tool1, tool2, tool3       # Optional - inherits if omitted
model: sonnet | opus | haiku     # Optional - or 'inherit'
permissionMode: default          # Optional - permission handling
skills: skill1, skill2           # Optional - auto-loaded skills
---

System prompt goes here...
```

**Key Capabilities:**
- ✅ **Skill assignment**: Native `skills` field in agent config
- ✅ **Model selection**: `model` field (alias or 'inherit')
- ✅ **Permission modes**: `permissionMode` field
- ✅ **Tool restrictions**: `tools` field limits available tools
- ✅ **Parallel execution**: Multiple Task calls in single message
- ✅ **Async execution**: Native async subagents (recently added)
- ✅ **Resumable sessions**: `session_id` or `resume` parameter
- ✅ **Child sessions**: Each Task creates a child session with `parentID`

**Subagent Limitation:** Subagents **cannot spawn other subagents** (Orchestrator handles all spawning).

**Output Format:**
```
{task result text}

<task_metadata>
session_id: {session_id}
</task_metadata>
```

---

### OpenCode: Task Tool

OpenCode has **feature parity** with Claude Code through its own Task tool:

**Task Tool Implementation (from source):**
```typescript
TaskTool.define("task", {
  parameters: z.object({
    description: z.string(),
    prompt: z.string(),
    subagent_type: z.string(),
    session_id: z.string().optional(),
    command: z.string().optional()
  })
})
```

**How It Works:**
1. Creates child session with `parentID` linking to parent
2. Loads agent configuration from `mode: subagent` agents
3. Executes with specified model (or inherits from parent)
4. Returns text output with session metadata

**Agent Configuration (in .opencode/agent/*.md or opencode.json):**
```yaml
---
description: Agent description
mode: subagent              # Required for subagents
model: provider/model-id    # Optional - inherits if omitted
temperature: 0.1            # Optional
tools:
  write: false
  edit: false
permission:
  edit: deny
  bash: ask
---

System prompt goes here...
```

**Key Capabilities:**
- ✅ **Model selection**: `model` field (full provider/model-id format)
- ✅ **Permission configuration**: Rich permission system per tool
- ✅ **Tool restrictions**: `tools` field with boolean or pattern matching
- ✅ **Parallel execution**: Multiple task calls possible
- ✅ **Session resumption**: `session_id` parameter
- ✅ **Child sessions**: `parentID` creates parent-child relationships
- ✅ **Session navigation**: TUI supports cycling through child sessions
- ⚠️ **Skill assignment**: Via `skill` tool, not auto-loaded in agent config

**Subagent Tools Disabled By Default:**
- `todowrite: false`
- `todoread: false`
- `task: false` (prevents subagent spawning subagents)

---

## Simplified Session Model

Since the Orchestrator is intelligent and uses native subagents:

### Session Creation
- Orchestrator uses native Task/subagent tool
- Passes agent configuration, skills, prompt
- Framework handles session lifecycle

### Session Completion
- Orchestrator interprets subagent output
- No explicit return tool needed
- Success/failure determined semantically

### Session Errors
- Subagents can fail naturally
- Orchestrator interprets error from output
- Retry handled per DSL specification

---

## Answered Questions

### Q1: Skill Assignment to Subagents ✅ ANSWERED

**Claude Code:** Native support via `skills` field in agent frontmatter
```yaml
---
name: researcher
skills: web-search, summarizer
---
```
Skills are auto-loaded when subagent starts.

**OpenCode:** Skills must be loaded via the `skill` tool call
- No `skills` field in agent config (based on docs/source review)
- Agent can call `skill({ name: "skill-name" })` during execution
- Skill discovery and loading works identically to main session

**Implication for OpenProse:** May need to inject skill-loading instructions into OpenCode subagent prompts.

### Q2: Agent Configuration ✅ ANSWERED

**Both frameworks support it natively:**
- Model selection: Native `model` field
- Permissions: Native `permission`/`permissionMode` fields
- Tools: Native `tools` field

**Option A confirmed:** Framework supports configuration natively.

### Q3: Parallel Subagents ✅ ANSWERED

**Claude Code:** Yes - "Launch multiple agents concurrently... use a single message with multiple tool uses"

**OpenCode:** Yes - Same pattern, multiple Task tool calls in one response

**Both frameworks support parallel execution.**

---

## Deferred (No Longer Needed)

These questions are resolved by using native subagents:

- ~~Completion trigger mechanism~~
- ~~Implicit vs explicit completion~~
- ~~Completion tool injection~~
- ~~Session termination after completion~~
- ~~Return value shape~~
- ~~Error value shape~~

The intelligent Orchestrator handles all of this through semantic interpretation.

---

## Session Configuration Mapping

From AGENTS.md, sessions can specify:

```
session my-task: researcher
  prompt: "Do the task"
  model: opus
  skills: [extra-skill]
```

**Claude Code Mapping:**
```typescript
Task({
  description: "my-task",
  prompt: "Do the task",
  subagent_type: "researcher"  // Pre-configured with opus + skills
})
```

**OpenCode Mapping:**
```typescript
Task({
  description: "my-task",
  prompt: "Do the task. First load skill: extra-skill",
  subagent_type: "researcher"  // Pre-configured with opus
})
```

---

## Async Subagent Considerations

### Current Status

Both frameworks support **async** subagent execution:

| Framework | Async Mechanism |
|-----------|-----------------|
| Claude Code | Native async subagents (recently added) |
| OpenCode | `prompt_async` endpoint |

### Parallel Execution

Both frameworks support parallel via multiple simultaneous Task calls in a single message.

### Implication for OpenProse

For `parallel` blocks: Both frameworks fully support parallel execution.

True fire-and-forget async is available in both frameworks if needed.

---

## Summary

The session model is now much simpler:

1. **Creation**: Use native subagent tools
2. **Execution**: Subagent runs autonomously
3. **Completion**: Orchestrator interprets output
4. **Errors**: Orchestrator handles semantically

**Key Findings:**
- Both frameworks have mature, nearly feature-equivalent Task tools
- Claude Code has slightly better skill auto-loading
- OpenCode has more granular permission patterns
- Both support parallel execution and session resumption
- Neither allows subagents to spawn subagents (prevents infinite nesting)
