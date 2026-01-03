# OpenProse Language Feature Requests

This document describes potential language features for OpenProse, with proposed syntax based on the language's design principles.

---

## Design Principles (Reference)

From `prose.md`, the core design principles are:

1. **Readability**: Human friendly syntax with indentation-based blocks
2. **Self-evident**: Programs should be understandable without extensive documentation
3. **Framework-agnostic**: Works with Claude Code, OpenCode, and other agent frameworks
4. **Hybrid execution**: Strict control flow with intelligent context passing

### Inferred Syntax Patterns

From the existing language implementation:

| Pattern       | Example                               | Usage                            |
| ------------- | ------------------------------------- | -------------------------------- |
| Keywords      | `agent`, `session`, `let`, `parallel` | Lowercase English words          |
| Blocks        | `agent name:` / `parallel:`           | Colon + indentation              |
| Properties    | `model: sonnet`                       | `name: value` inside blocks      |
| Arrays        | `["a", "b", "c"]`                     | Square brackets, comma-separated |
| Objects       | `{ a, b, c }`                         | Curly braces for shorthand       |
| Discretion    | `**condition**`                       | AI-evaluated expressions         |
| Interpolation | `"Hello {name}"`                      | Curly braces in strings          |
| Binding       | `let x = ...` / `as i`                | Variable capture                 |
| Modifiers     | `parallel ("first"):`                 | Parentheses before colon         |
| Operators     | `->` sequence, `\|` pipe              | Infix operators                  |

---

## Table of Contents

1. [Persistent State via Markdown Files](#1-persistent-state-via-markdown-files)
2. [Agent Identity Persistence](#2-agent-identity-persistence)
3. [Inter-Agent Messaging](#3-inter-agent-messaging)
4. [Work Queues (Hooks)](#4-work-queues-hooks)
5. [Async Dispatch](#5-async-dispatch)
6. [Work Order Tracking (Convoys)](#6-work-order-tracking-convoys)
7. [Session Handoff and Continuation](#7-session-handoff-and-continuation)
8. [Workflow Templates with Instantiation](#8-workflow-templates-with-instantiation)
9. [External Tool Integration](#9-external-tool-integration)
10. [Checkpointing and Resume](#10-checkpointing-and-resume)

---

## 1. Persistent State via Markdown Files

**Priority: High**

### Description

All orchestrator state—variables, context, execution progress, agent status—should be persisted to markdown files with YAML frontmatter. This enables workflows to survive session restarts, be inspected by humans, be version-controlled in Git, and be manipulated by both AI agents and traditional tools.

### Use Cases

#### 1.1 Variable Persistence

When a session produces a result bound to a variable, that result should be written to a markdown file. The file's frontmatter contains metadata (variable name, type, timestamp, producing session), and the body contains the actual content.

This allows:

- Resuming a workflow after a crash or context limit
- Inspecting intermediate results
- Manually editing state if needed
- Sharing state between independent runs

#### 1.2 Execution Progress Tracking

The orchestrator's position in a program—which statements have executed, which are pending—should be persisted. This enables:

- Picking up exactly where we left off after interruption
- Visualizing workflow progress in external tools
- Debugging failed runs by examining state at failure point

#### 1.3 Context Accumulation

As sessions execute and context flows between them, the accumulated context should be persisted. This prevents context loss across session boundaries and allows for:

- Long-running workflows spanning hours or days
- Human review of context before critical decisions
- Pruning/editing context when it becomes unwieldy

#### 1.4 Agent State

Each agent's current status, assigned work, and history should be stored in markdown. This enables:

- Agents that "remember" across sessions
- Dashboards showing agent utilization
- Auditing what each agent has done

### Integration with Existing Stack

- `let`/`const` bindings would write to state files
- `context:` property would read from state files
- The orchestrator would write a progress file after each statement
- On startup, the orchestrator would read existing state and resume

### Relationship to Gas Town

This feature replaces Gas Town's Beads system—the Git-backed issue tracker that stores everything. By using plain markdown instead of JSONL, we gain:

- Human readability (markdown renders nicely on GitHub)
- Easy manual editing
- Familiar tooling (editors, grep, git diff)
- No custom database format

### Proposed Syntax

#### State Directory Declaration

```prose
# Declare where state lives (optional - defaults to .prose-state/)
state ".prose-state/"
```

Following the pattern of `import ... from "..."`, state location is a top-level declaration.

#### Persistent Variables

```prose
# persist keyword marks a variable for file-based persistence
persist let research = session "Research the topic"

# Immutable persistent variable
persist const config = session "Get configuration"

# Without persist, variables are session-scoped (current behavior)
let temp = session "Temporary result"
```

The `persist` keyword is a modifier, similar to how `parallel` modifies `for`. It's self-evident: "persist this variable."

#### Reading Persisted State

```prose
# load reads a variable from state files
# If not found, evaluates the default expression
load research = session "Research the topic"

# load without default - errors if not found
load config

# load with explicit file path
load research from "research-results.md"
```

The `load` keyword mirrors common programming patterns and is self-evident.

#### State File Format

State files would be markdown with YAML frontmatter:

```markdown
---
name: research
type: session-result
created: 2026-01-03T10:30:00Z
updated: 2026-01-03T10:32:15Z
program: workflow.prose
session: abc123
---

# Research Results

The research found that...

[Full session output here]
```

#### Execution Progress

The orchestrator automatically maintains a progress file:

```markdown
---
program: workflow.prose
started: 2026-01-03T10:30:00Z
updated: 2026-01-03T10:45:00Z
status: in-progress
---

# Execution Progress

## Completed

- [x] Line 1: agent researcher defined
- [x] Line 5: persist let research = session "..."
- [x] Line 8: parallel block (3 branches)

## Current

- [ ] Line 15: session "Synthesize results"

## Pending

- [ ] Line 18: if **quality is sufficient**
- [ ] Line 22: session "Final report"
```

---

## 2. Agent Identity Persistence

**Priority: High**

### Description

Agents should be first-class persistent entities, not just templates. An agent's identity, state, and history should survive across sessions. When you define an agent, you're creating an entity that exists independently of any particular Claude Code session.

### Use Cases

#### 2.1 Long-Lived Workers

A "crew member" agent should maintain its identity across days or weeks. It accumulates:

- History of tasks completed
- Learned preferences and patterns
- Reputation/reliability metrics
- Personal notes and context

#### 2.2 Agent Addressing

Other agents and the orchestrator should be able to address agents by name for communication, work assignment, and status queries. This requires agents to have stable identities.

#### 2.3 Agent Lifecycle

Agents should have lifecycle states:

- Idle (no work, waiting)
- Active (running a session)
- Busy (has work queued)
- Recycling (context full, preparing handoff)
- Offline (explicitly paused)

#### 2.4 Agent Specialization Over Time

An agent that consistently handles certain types of work could accumulate specialized context, becoming more effective at that work over time.

### Integration with Existing Stack

- Agent definitions create/update a persistent agent file
- Sessions reference the persistent agent, not just the template
- Agent state files store current status, assigned work, history
- The `session:` statement would "activate" a persistent agent

### Relationship to Gas Town

Gas Town represents each agent as a "Bead" (issue) with properties. We would achieve similar persistence through markdown agent files, but with clearer separation between the agent template (in .prose) and the agent instance (in .md state).

### Proposed Syntax

#### Persistent Agent Declaration

```prose
# persist modifier makes the agent persistent
persist agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
```

Alternatively, since most production agents would be persistent:

```prose
# Use 'instance' keyword to create a persistent agent identity
instance researcher from agent:
  model: sonnet
  prompt: "You are a research assistant"

# Or shorthand when template and instance have same name
instance researcher:
  model: sonnet
  prompt: "You are a research assistant"
```

The `instance` keyword conveys "this is a live entity, not just a template."

#### Agent State Properties

```prose
persist agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
  # New: lifecycle management
  lifecycle:
    idle-timeout: 300        # seconds before going idle
    max-context: 80%         # trigger handoff at this context usage
    history: 100             # keep last N task summaries
```

#### Querying Agent State

```prose
# Check agent status using discretion markers
if **researcher is idle**:
  session: researcher
    prompt: "Start new research task"

# Or with explicit status property
if researcher.status == "idle":
  ...
```

The dotted property access (`researcher.status`) follows common conventions.

#### Agent State File Format

```markdown
---
name: researcher
template: researcher # from agent definition
status: idle
created: 2026-01-01T00:00:00Z
last-active: 2026-01-03T10:45:00Z
tasks-completed: 47
context-usage: 23%
---

# Agent: researcher

## Current Context

Last worked on quantum computing research...

## Recent History

- 2026-01-03: Completed "Research AI safety" (success)
- 2026-01-03: Completed "Analyze competition" (success)
- 2026-01-02: Completed "Market research" (success)
```

---

## 3. Inter-Agent Messaging

**Priority: Medium-High**

### Description

Agents should be able to send messages to each other asynchronously. This enables coordination, notifications, and event-driven workflows without tight coupling between sender and receiver.

### Use Cases

#### 3.1 Notifications

When one agent completes work, it should be able to notify interested parties:

- "Convoy landed" → notify Mayor
- "MR ready" → notify Refinery
- "Error encountered" → notify Witness

#### 3.2 Nudges

A supervising agent should be able to "nudge" a worker to check its queue and start working. This is the GUPP principle: if you have work, you must run it.

#### 3.3 Requests

An agent should be able to send a request to another agent and optionally wait for a response. This is different from a session—it's peer-to-peer rather than hierarchical.

#### 3.4 Broadcasts

Some messages should go to all agents in a group:

- "Town waking up" → all workers
- "Shutdown imminent" → all active sessions
- "New work available" → all idle polecats

### Integration with Existing Stack

- Messages would be stored as markdown files in a queue directory
- Each agent would have an inbox path
- The orchestrator could check inboxes at defined points
- Messages could trigger workflow transitions

### Relationship to Gas Town

Gas Town has `gt nudge` for real-time messaging via tmux. Our approach would be file-based (poll rather than push), which is simpler but has latency. For true real-time, we'd need integration with the host agent framework's notification system.

### Proposed Syntax

#### Sending Messages

```prose
# send statement - fire and forget
send "Task completed" to researcher

# send with structured content
send to researcher:
  type: "notification"
  message: "Your MR has been merged"
  context: merge_result

# send to multiple recipients
send "Wake up" to [polecat1, polecat2, polecat3]

# broadcast to a role (all agents of that type)
send "New work available" to polecats
```

The `send ... to ...` pattern is natural English and self-evident.

#### Receiving Messages

```prose
# receive blocks until a message arrives (with optional timeout)
let msg = receive from researcher

# receive with timeout
let msg = receive from researcher (timeout: 60)

# receive any message (from anyone)
let msg = receive

# receive and pattern match
receive from researcher as msg:
  if msg.type == "error":
    session "Handle error"
      context: msg
```

#### Checking for Messages (Non-blocking)

```prose
# inbox returns pending messages without blocking
let messages = inbox researcher

# check if there are messages
if **researcher has pending messages**:
  let msg = receive from researcher
```

#### Message Handlers (Event-driven)

```prose
# on statement registers a handler
on message from researcher:
  session "Process researcher notification"
    context: message

# on with type filtering
on message (type: "error") from any:
  session "Handle error"
    context: message
```

The `on` keyword is used in many event-driven systems and reads naturally.

#### Nudge (Special Message)

```prose
# nudge is a special message that triggers GUPP
nudge researcher

# nudge all agents of a type
nudge polecats
```

---

## 4. Work Queues (Hooks)

**Priority: Medium-High**

### Description

Each agent should have a "hook"—a queue of pending work that persists independently of sessions. When an agent starts, it checks its hook and runs any pending work. This is the core of GUPP (Gas Town Universal Propulsion Principle).

### Use Cases

#### 4.1 Deferred Execution

Assign work to an agent now, but let them run it later:

- Schedule overnight batch processing
- Queue work for a specialized agent that's currently busy
- Distribute work across a pool without waiting

#### 4.2 Crash Recovery

If a session crashes mid-work, the work is still on the hook. A new session picks it up automatically. No manual intervention required.

#### 4.3 Work Distribution

A supervisor can load up multiple workers' hooks, then let them all run in parallel. This is more flexible than `parallel:` because:

- Workers can start at different times
- Work can be added incrementally
- Workers self-manage their throughput

#### 4.4 Priority Queues

Hooks could support priority levels, allowing urgent work to jump the queue.

### Integration with Existing Stack

- Each agent has a hook file (markdown) listing pending work
- Work items are molecules/workflows or single tasks
- On session start, agent checks hook before awaiting user input
- Completing work removes it from hook

### Relationship to Gas Town

Gas Town's hooks are Beads (issues) linked to agent Beads. Our approach would use markdown files—each agent's hook is a file listing work IDs. The work items themselves would be separate state files.

### Proposed Syntax

#### Adding Work to a Hook

```prose
# hook statement adds work to an agent's queue
hook researcher:
  session "Research quantum computing"

# hook with priority
hook researcher (priority: high):
  session "Urgent research needed"

# hook a workflow (block invocation)
hook researcher:
  do research-pipeline("AI safety")

# hook multiple items
hook researcher:
  session "Task 1"
  session "Task 2"
  session "Task 3"
```

The `hook` keyword is borrowed from Gas Town and conveys "hang this work on the agent."

#### Checking an Agent's Hook

```prose
# hooked returns the agent's pending work queue
let pending = hooked researcher

# check if hook is empty
if **researcher has no pending work**:
  send "All done" to overseer

# count pending items
let count = hooked researcher | count
```

#### Agent Auto-Start from Hook (GUPP)

```prose
# Agents with persist can declare GUPP behavior
persist agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
  # GUPP: on startup, run hooked work
  on-start: run-hook
```

The `on-start: run-hook` property is self-evident within the agent definition.

#### Hook File Format

```markdown
---
agent: researcher
updated: 2026-01-03T10:45:00Z
count: 3
---

# Hook: researcher

## Pending Work

### 1. High Priority

- **ID**: work-abc123
- **Added**: 2026-01-03T10:30:00Z
- **Type**: session
- **Prompt**: "Urgent research on X"

### 2. Normal Priority

- **ID**: work-def456
- **Added**: 2026-01-03T09:00:00Z
- **Type**: block
- **Block**: research-pipeline
- **Args**: ["quantum computing"]

### 3. Normal Priority

- **ID**: work-ghi789
- **Added**: 2026-01-02T15:00:00Z
- **Type**: session
- **Prompt**: "Background research on Y"
```

---

## 5. Async Dispatch

**Priority: Medium**

### Description

The ability to dispatch work to an agent without waiting for completion. The caller continues immediately; the work runs in the background. Results can be checked later or trigger callbacks.

### Use Cases

#### 5.1 Fire and Forget

Kick off a task and move on:

- Start a long-running analysis
- Trigger a deployment pipeline
- Send a notification

No need to wait for these to complete before continuing.

#### 5.2 Parallel Swarms

Start many workers on a batch of work, continue orchestrating while they run, then collect results when ready. More flexible than `parallel:` because:

- Don't have to define all branches upfront
- Can add more workers mid-flight
- Workers can complete in any order

#### 5.3 Background Processing

Keep a background task running while the main workflow continues. Check in on it periodically or wait for it at a sync point.

### Integration with Existing Stack

- A dispatch statement would queue work on an agent's hook and return immediately
- A separate statement would wait for dispatched work to complete
- Dispatch could return a "future" or "promise" ID for later reference
- Could integrate with `parallel:` for hybrid sync/async patterns

### Relationship to Gas Town

Gas Town's `gt sling` is async dispatch—it puts work on a hook and returns. The caller can then do other things. We would need a similar primitive, but expressed declaratively in the language.

### Proposed Syntax

#### Async Dispatch

```prose
# spawn keyword starts work without waiting
let task = spawn session: researcher
  prompt: "Long-running research task"

# spawn returns a handle immediately
# Work runs in background

# Continue with other work while spawn runs
session "Do something else"

# await waits for the spawned work to complete
let result = await task
```

The `spawn`/`await` pattern is familiar from many async programming models.

#### Spawn with Hook (Sling Pattern)

```prose
# sling combines hook + spawn: queues work and returns handle
let task = sling researcher:
  session "Research this topic"

# sling to multiple agents (fan-out)
let tasks = sling [polecat1, polecat2, polecat3]:
  session "Process item"
    context: item
```

The `sling` keyword is borrowed from Gas Town's `gt sling`.

#### Checking Spawn Status

```prose
# status check without blocking
if **task is complete**:
  let result = await task

# or with explicit property
if task.status == "complete":
  let result = await task

# await with timeout
let result = await task (timeout: 300)

# await any of multiple tasks
let first_result = await any [task1, task2, task3]

# await all tasks
let all_results = await all [task1, task2, task3]
```

#### Spawn Block (Multiple Async)

```prose
# spawn block starts multiple async tasks
spawn:
  research = session: researcher
    prompt: "Research"
  analysis = session: analyst
    prompt: "Analyze"

# Both run concurrently, but unlike parallel:, we don't wait
session "Continue immediately"

# Later, await them
let results = await all [research, analysis]
```

---

## 6. Work Order Tracking (Convoys)

**Priority: Medium**

### Description

A "convoy" or work order is a trackable unit of work that may span multiple agents, sessions, and workflows. It provides:

- A single ID to reference a logical piece of work
- Progress tracking across all constituent tasks
- Completion notification when everything is done
- Failure aggregation if things go wrong

### Use Cases

#### 6.1 Feature Development

A feature request becomes a convoy. It might involve:

- Design session with crew
- Implementation swarm with polecats
- Review with reviewer agents
- Merge through refinery

All tracked under one convoy ID, with status visible in a dashboard.

#### 6.2 Release Management

A release is a convoy containing:

- Version bump
- Changelog generation
- Build and test
- Deployment
- Verification

Track progress through each phase.

#### 6.3 Incident Response

An incident creates a convoy:

- Initial triage
- Investigation
- Fix development
- Fix deployment
- Postmortem

Everything related stays grouped.

### Integration with Existing Stack

- Convoys would be special state files (markdown) that reference other work items
- The orchestrator could automatically create convoys for top-level work
- Status updates would propagate to convoy state
- Completion of last item closes the convoy

### Relationship to Gas Town

Gas Town's convoys wrap every `gt sling` in a trackable unit. We could make this automatic (every top-level workflow creates a convoy) or explicit (declare a convoy, add work to it).

### Proposed Syntax

#### Creating a Convoy

```prose
# convoy block groups related work
convoy "Feature: User Authentication":
  session "Design auth flow"
  parallel:
    session "Implement backend"
    session "Implement frontend"
  session "Integration testing"
  session "Deploy to staging"
```

The `convoy` keyword wraps a block of work, similar to `do:` but with tracking.

#### Convoy with Explicit ID

```prose
# convoy with ID for external reference
convoy "auth-feature" as auth:
  session "Design"
  session "Implement"
  session "Test"

# Reference the convoy later
if **auth is complete**:
  send "Auth feature ready" to overseer
```

#### Adding to Existing Convoy

```prose
# track adds work to an existing convoy
track auth:
  session "Additional testing"
  session "Documentation"

# or inline
session "Extra work"
  convoy: auth
```

The `track` keyword means "track this work under convoy X."

#### Convoy Status

```prose
# check convoy status
if **auth is in-progress**:
  session "Wait for completion"

# convoy properties
let progress = auth.progress    # e.g., "3/5 complete"
let status = auth.status        # e.g., "in-progress"
let failed = auth.failures      # list of failed items
```

#### Convoy File Format

```markdown
---
id: auth-feature
name: "Feature: User Authentication"
status: in-progress
created: 2026-01-03T10:00:00Z
updated: 2026-01-03T11:30:00Z
progress: 3/5
---

# Convoy: Feature: User Authentication

## Status: In Progress (3/5 complete)

## Work Items

### Completed

- [x] Design auth flow (completed 10:15)
- [x] Implement backend (completed 10:45)
- [x] Implement frontend (completed 11:30)

### In Progress

- [ ] Integration testing (started 11:30)

### Pending

- [ ] Deploy to staging

## Timeline

- 10:00 - Convoy created
- 10:15 - Design completed
- 10:15 - Parallel implementation started
- 10:45 - Backend completed
- 11:30 - Frontend completed
- 11:30 - Integration testing started
```

---

## 7. Session Handoff and Continuation

**Priority: Medium**

### Description

When a session reaches its context limit or needs to restart for any reason, it should be able to gracefully hand off to a successor. The successor picks up exactly where the predecessor left off, with no work lost and no manual intervention.

### Use Cases

#### 7.1 Context Limit Management

Long workflows will hit context limits. Rather than failing:

1. Current session detects approaching limit
2. Writes state to persistent storage
3. Summarizes key context for successor
4. Terminates gracefully
5. New session starts
6. Reads state and summary
7. Continues from where predecessor stopped

#### 7.2 Planned Recycling

Even without hitting limits, periodic recycling can improve performance:

- Clear accumulated context noise
- Apply any configuration changes
- Reset from known-good state

#### 7.3 Crash Recovery

If a session crashes unexpectedly:

1. State was being persisted incrementally
2. New session starts
3. Reads last known state
4. Determines where crash occurred
5. Resumes (possibly retrying the crashed step)

### Integration with Existing Stack

- Persistent state (Feature 1) enables handoff
- Progress tracking tells successor where to resume
- Context accumulation gives successor necessary context
- Could add explicit "handoff" or "checkpoint" statements

### Relationship to Gas Town

Gas Town's `/handoff` command triggers graceful recycling. The agent writes notes, the session ends, a new one starts and reads the notes. With persistent state, we can make this more robust—not just notes, but full state transfer.

### Proposed Syntax

#### Explicit Handoff

```prose
# handoff statement triggers graceful session recycling
handoff

# handoff with notes for successor
handoff "Completed design phase, ready for implementation"

# handoff with explicit state to pass
handoff:
  notes: "Key findings: ..."
  context: research_results
  resume-from: "implementation-phase"
```

The `handoff` keyword is borrowed from Gas Town.

#### Automatic Handoff Triggers

```prose
# Agent with automatic handoff on context limit
persist agent researcher:
  model: sonnet
  prompt: "..."
  lifecycle:
    max-context: 80%        # trigger handoff at 80% context
    handoff: auto           # vs "manual" or "prompt"
```

#### Resume Points

```prose
# checkpoint creates a named resume point
checkpoint "after-research"

# ... more work ...

checkpoint "after-analysis"

# On resume, orchestrator jumps to last checkpoint
```

The `checkpoint` keyword is familiar from game saves and transaction logs.

#### Continuation Block

```prose
# continue statement resumes from a checkpoint
continue from "after-research"

# continue with modified context
continue from "after-research":
  context: updated_data
```

---

## 8. Workflow Templates with Instantiation

**Priority: Medium**

### Description

Define workflow templates with parameters (like Gas Town's "formulas" and "protomolecules"). Instantiate templates with specific values to create executable workflows. This enables reusable, composable workflow libraries.

### Use Cases

#### 8.1 Standard Workflows

Define once, use many times:

- "Review Pipeline" template: takes code, produces reviewed code
- "Release Process" template: takes version, produces release
- "Research Cycle" template: takes topic, produces report

#### 8.2 Composition

Build complex workflows from simpler ones:

- "Full Feature" = Design + Implement + Review + Deploy
- Each component is a template
- Composed templates can have their own parameters

#### 8.3 Workflow Libraries

Share workflows across projects or teams:

- Import from a marketplace (Gas Town's "Mol Mall")
- Customize with project-specific parameters
- Version and update independently

#### 8.4 Dynamic Workflow Generation

AI agents could generate workflow templates based on high-level goals, then instantiate them for specific tasks. This is a step toward self-programming agents.

### Integration with Existing Stack

- `block` definitions are already templates—extend with richer parameters
- Add template instantiation semantics (variable substitution throughout)
- Allow blocks to be defined in separate files and imported
- Consider template composition operators

### Relationship to Gas Town

Gas Town has:

- Formulas (TOML source files)
- Cooking (formula → protomolecule)
- Instantiation (protomolecule → molecule)
- Variable substitution throughout

We could simplify this to:

- Block definitions with parameters (already exist)
- Block imports from files
- Enhanced instantiation with complex substitutions

### Proposed Syntax

#### Enhanced Block Parameters

```prose
# Block with typed parameters and defaults
block research-cycle(topic, depth: "standard", agents: 3):
  repeat agents:
    session "Research {topic} at {depth} depth"
  session "Synthesize findings about {topic}"

# Invoke with named arguments
do research-cycle("quantum computing", depth: "deep", agents: 5)

# Invoke with positional + named
do research-cycle("AI safety", agents: 2)
```

This extends existing block syntax with defaults and named arguments.

#### Block Import from Files

```prose
# Import blocks from external files
import block "review-pipeline" from "./workflows/review.prose"
import block "release" from "github:company/workflows"

# Use imported block
do review-pipeline(code)
```

This extends existing `import` syntax to support blocks.

#### Template Composition

```prose
# compose combines blocks into a new block
block full-feature(feature) = compose:
  do design(feature)
  do implement(feature)
  do review(feature)
  do deploy(feature)

# wrap adds steps around an existing block
block audited-release(version) = wrap release(version):
  before:
    session "Pre-release audit"
  after:
    session "Post-release verification"
```

The `compose` and `wrap` keywords enable declarative composition.

#### Template with Spread/Rest Parameters

```prose
# Rest parameter for variable arguments
block parallel-research(...topics):
  parallel for topic in topics:
    session "Research {topic}"

# Invoke with multiple arguments
do parallel-research("AI", "ML", "DL", "NLP")
```

---

## 9. External Tool Integration

**Priority: Low-Medium**

### Description

Standardized ways to integrate external tools and services into workflows. This could include git operations, HTTP APIs, database access, file system operations, and host agent framework features.

### Use Cases

#### 9.1 Git Operations

Many workflows need git:

- Create branch
- Commit changes
- Create PR
- Merge

Rather than relying on session prompts, have first-class git primitives.

#### 9.2 HTTP/API Calls

Integrate with external services:

- Fetch data from APIs
- Post updates to webhooks
- Query external systems

#### 9.3 File System

Beyond state persistence:

- Watch for file changes
- Process file batches
- Generate artifacts

#### 9.4 Host Framework Integration

Leverage features of Claude Code, Codex, etc.:

- Real-time notifications
- UI integration
- Permission management

### Integration with Existing Stack

- Could be handled through skills (already exist)
- Could add built-in primitives for common operations
- Could define standard interfaces that implementations provide

### Relationship to Gas Town

Gas Town has `gt` commands for everything. We could either:

- Keep tool integration in skills (current approach)
- Add language primitives for critical operations
- Define a standard "toolbox" that implementations must provide

### Proposed Syntax

#### Built-in Tool Statements

```prose
# git operations as first-class statements
git branch "feature/auth"
git commit "Implement authentication"
git push

# http requests
let data = http get "https://api.example.com/data"
http post "https://hooks.slack.com/..." body: notification

# file operations
let contents = read "config.json"
write "output.txt" content: results
```

These could be reserved keywords or could be implemented as built-in skills.

#### Tool Block (Grouping)

```prose
# tool block for complex operations
git:
  branch "feature/auth"
  add "src/"
  commit "Implement authentication"
  push

# equivalent to individual statements but clearer grouping
```

#### Skill Invocation (Current Pattern, Extended)

```prose
# skills remain the primary extension mechanism
import "git-ops" from "github:anthropic/skills"
import "slack-notify" from "npm:@company/skills"

# invoke skill explicitly
use git-ops:
  branch: "feature/auth"
  commit: "Implement"

# or let agent use skill naturally in session
session: developer
  skills: ["git-ops"]
  prompt: "Create a branch and commit the changes"
```

---

## 10. Checkpointing and Resume

**Priority: Low-Medium**

### Description

Explicit checkpointing: mark points in a workflow where state should be saved such that the workflow can resume from that exact point. Different from automatic persistence—this is intentional "save game" functionality.

### Use Cases

#### 10.1 Long Running Workflows

Multi-day workflows need explicit sync points:

- End of day checkpoint
- Before risky operation checkpoint
- After expensive computation checkpoint

#### 10.2 Branching Experiments

Save state, try something risky, restore if it fails:

- Checkpoint before refactoring attempt
- Try the refactor
- If tests fail, restore checkpoint and try different approach

#### 10.3 Workflow Debugging

Set checkpoints to capture state at interesting points:

- Before the step that fails
- After data transformation
- At decision points

Replay from checkpoint with modified inputs to debug.

#### 10.4 Time Travel

With checkpoints stored in Git, you can:

- See workflow state at any point in history
- Compare states across runs
- Roll back to previous states

### Integration with Existing Stack

- If persistent state (Feature 1) is always-on, checkpoints are automatic
- Explicit checkpoints could be "named" save points for easier reference
- Resume statement could target a specific checkpoint
- Could integrate with try/catch for rollback semantics

### Relationship to Gas Town

Gas Town's durability comes from Beads + Git. Every state change is committed. Checkpoints would be similar but more intentional—marking points you specifically want to be able to return to.

### Proposed Syntax

#### Explicit Checkpoints

```prose
# checkpoint statement creates a named save point
checkpoint "before-refactor"

session "Attempt risky refactor"

checkpoint "after-refactor"
```

#### Checkpoint with Metadata

```prose
# checkpoint with description
checkpoint "pre-deploy":
  description: "State before production deployment"
  tags: ["deploy", "critical"]
```

#### Restore from Checkpoint

```prose
# restore rolls back to a checkpoint
try:
  session "Risky operation"
catch:
  restore "before-refactor"
  session "Try alternative approach"
```

#### Branch from Checkpoint

```prose
# branch creates a parallel execution path from checkpoint
branch from "pre-deploy" as experiment:
  session "Try experimental approach"

# original flow continues
session "Continue with main approach"

# later, compare branches
if **experiment succeeded**:
  merge experiment
```

The `branch`/`merge` pattern borrows from git concepts.

#### Checkpoint File Format

```markdown
---
name: before-refactor
created: 2026-01-03T10:30:00Z
program: workflow.prose
line: 15
---

# Checkpoint: before-refactor

## Variables

- research: .prose-state/var-research-abc123.md
- analysis: .prose-state/var-analysis-def456.md

## Execution State

- Current line: 15
- Completed: [1, 2, 5, 8, 10, 12]
- Pending: [15, 18, 22, 25]

## Agent States

- researcher: idle (context: 45%)
- analyst: idle (context: 30%)

## Git State

- Branch: feature/refactor
- Commit: abc123def
```

---

## Implementation Priority

Based on value to the language's goals and dependency ordering:

| Priority | Feature                     | Rationale                                      |
| -------- | --------------------------- | ---------------------------------------------- |
| **P0**   | Persistent State (Markdown) | Foundation for all other features              |
| **P1**   | Agent Identity Persistence  | Required for meaningful agent-based workflows  |
| **P1**   | Session Handoff             | Required for workflows longer than one session |
| **P2**   | Work Queues (Hooks)         | Enables async patterns and crash recovery      |
| **P2**   | Inter-Agent Messaging       | Enables coordination in multi-agent systems    |
| **P3**   | Async Dispatch              | Builds on hooks, enables true parallelism      |
| **P3**   | Work Order Tracking         | Quality of life for complex workflows          |
| **P3**   | Workflow Templates          | Already partially exists in blocks             |
| **P4**   | External Tool Integration   | Can be handled through skills for now          |
| **P4**   | Checkpointing               | Nice to have once persistence exists           |

---

## Proposed New Keywords Summary

| Keyword      | Feature        | Usage                                   |
| ------------ | -------------- | --------------------------------------- |
| `state`      | Persistence    | `state ".prose-state/"`                 |
| `persist`    | Persistence    | `persist let x = ...` / `persist agent` |
| `load`       | Persistence    | `load x from "file.md"`                 |
| `instance`   | Agent Identity | `instance researcher:`                  |
| `send`       | Messaging      | `send "msg" to agent`                   |
| `receive`    | Messaging      | `let msg = receive from agent`          |
| `inbox`      | Messaging      | `let msgs = inbox agent`                |
| `on`         | Messaging      | `on message from agent:`                |
| `nudge`      | Messaging      | `nudge agent`                           |
| `hook`       | Work Queues    | `hook agent: session "..."`             |
| `hooked`     | Work Queues    | `let work = hooked agent`               |
| `spawn`      | Async          | `let task = spawn session "..."`        |
| `await`      | Async          | `let result = await task`               |
| `sling`      | Async          | `let task = sling agent: ...`           |
| `convoy`     | Tracking       | `convoy "name": ...`                    |
| `track`      | Tracking       | `track convoy: session "..."`           |
| `handoff`    | Continuation   | `handoff "notes"`                       |
| `checkpoint` | Checkpointing  | `checkpoint "name"`                     |
| `restore`    | Checkpointing  | `restore "checkpoint"`                  |
| `continue`   | Continuation   | `continue from "checkpoint"`            |
| `compose`    | Templates      | `block x = compose: ...`                |
| `wrap`       | Templates      | `block x = wrap y: ...`                 |
| `branch`     | Checkpointing  | `branch from "cp" as x:`                |
| `merge`      | Checkpointing  | `merge branch`                          |

---

## Open Questions

### Syntax Questions

1. **`persist` vs `state` modifier** — Should persistence be opt-in (`persist let x`) or opt-out (`volatile let x`)? Opt-in is safer but more verbose for production use.

2. **Agent instance vs template** — Is `persist agent` sufficient, or do we need explicit `instance` keyword to separate the template (class) from the instance (object)?

3. **Message syntax** — Is `send "msg" to agent` the right order, or should it be `send to agent: "msg"` for consistency with `session: agent`?

4. **`spawn` vs `async`** — Should we use `spawn`/`await` (process metaphor) or `async`/`await` (JavaScript metaphor)?

5. **Hook as noun vs verb** — Is `hook agent: work` clear, or would `enqueue agent: work` be clearer?

6. **Convoy wrapping** — Should convoys be explicit blocks, or should all top-level work automatically create a convoy?

### Semantic Questions

7. **Checkpoint granularity** — Should checkpoints capture full state (expensive) or just deltas (complex)?

8. **Message delivery guarantees** — At-least-once? At-most-once? Exactly-once? File-based implies at-least-once.

9. **Hook ordering** — FIFO? Priority-based? Agent-chosen?

10. **Spawn lifetime** — What happens to spawned work if the spawner's session ends? Orphaned work continues? Gets cancelled?

11. **Cross-program state** — Can one .prose program read state from another? Same directory? Import-based?

### File Format Questions

12. **State directory structure** — Flat files? Nested by type? By agent? By run?

13. **State file naming** — Human-readable names? Hash-based? Combination?

14. **Git integration** — Auto-commit state changes? Manual? Configurable?

15. **Cleanup policy** — When is old state garbage collected? Manual? TTL? After workflow completion?

### Implementation Questions

16. **Concurrency control** — File locking for concurrent writes? Optimistic concurrency? Event sourcing?

17. **State size limits** — What happens when a variable's content exceeds reasonable file size? Chunking? Summarization?

18. **Framework abstraction** — How do we maintain framework-agnosticism while supporting framework-specific features (e.g., Claude Code's Task tool vs Codex's equivalent)?

19. **Backward compatibility** — Should programs without persistence features still work unchanged?

20. **Error handling for I/O** — What happens if state files can't be read/written? Built-in retry? Propagate error?
