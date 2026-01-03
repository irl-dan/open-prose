# CEO Preferences for OpenProse

> This document synthesizes all CEO preferences and decisions from the guidance directory, serving as the definitive reference for understanding how the CEO thinks and what they want.

**Last Updated:** Synthesized from guidance documents dated 2025-12-29 through 2026-01-03 (includes Tweet Thread, Landing Page, and Elegant Simplification)

---

## Overview: Who is the CEO?

The CEO of OpenProse is a technical founder with deep expertise in AI systems, language design, and developer tooling. Their communication style is direct, pragmatic, and iterative. They prefer:

- **Collaborative decision-making** through structured interviews
- **Incremental progress** over perfect upfront design
- **Simplicity and elegance** over unnecessary complexity
- **Pragmatic deferral** of features that don't provide immediate value
- **TypeScript-like balance** between explicit and implicit (see Quote below)

> "We want to balance, use your judgement. Something like typescript with type inference is a decent balance for example. Strongly typed, but not overkill where redundant."
>
> *Source: 2025-12-29-questions-interview.md, timestamp 2025-12-29 11:03:00*

The CEO's overarching philosophy can be summarized as: **Build for an intelligent orchestrator, not a dumb interpreter.** This fundamental insight shapes nearly every design decision in OpenProse.

### Target Audience

The CEO is clear about who uses OpenProse:

> "Both." (in response to whether developers or AI models write programs in this DSL)
>
> *Source: 2025-12-29-questions-interview.md, timestamp 2025-12-29 11:20:00*

> "Easily readable by a programmer familiar with Typescript, but may require some tutorial."
>
> *Source: 2025-12-29-questions-interview.md, timestamp 2025-12-29 11:21:00*

---

## Public Framing & Vision (January 2026)

> **Source:** CEO Tweet Thread (https://x.com/irl_danB/status/2007259356103094523) and Landing Page Copy (January 2026)
>
> *The CEO wrote and approved all copy below. Every word matters.*

### The Foundational Insight

> "everyone is building an agent framework
>
> we already have an agent framework: it's called English"
>
> *Source: Tweet Thread*

This captures the CEO's contrarian positioning: OpenProse isn't competing with agent frameworks—it's recognizing that natural language itself is already the framework, and AI sessions are the runtime.

### What OpenProse Is (And Isn't)

> "it's not a product or service, it requires no dependencies, it ships as a skill
>
> it's barely even anything at all, it's just language
>
> but it works"
>
> *Source: Tweet Thread*

The CEO deliberately positions OpenProse as maximally minimal—"barely even anything at all." This reflects a philosophy of doing the least possible thing that works, rather than building a framework empire.

### The Design Journey

> "I've built three inversion of control frameworks in the last few months to see if I could make an agent language that was more declarative and service-oriented
>
> I wasn't satisfied with any until this one. it's the simplest and most elegant. it's more of a pattern than a framework"
>
> *Source: Tweet Thread*

Key insight: OpenProse is **"more of a pattern than a framework."** The CEO explicitly chose simplicity and elegance over feature richness after trying more complex approaches.

### Platform Independence

> "you install it as a skill so it works with any of the major agent frameworks, present and future"
>
> *Source: Tweet Thread*

This is the strategic choice: by shipping as a skill rather than a platform, OpenProse achieves portability across Claude Code, OpenCode, Codex, Amp, and any future AI assistant.

### The Core Design Principle

> "the language is written to be structured but self-evident, so it can be interpreted unambiguously but with minimal documentation"
>
> *Source: Tweet Thread*

Two properties that seem contradictory but aren't:
1. **Structured** - unambiguous control flow
2. **Self-evident** - minimal documentation required

### The Pièce de Résistance: Breaking the Fourth Wall

> "and the pièce de résistance is the notation for breaking the fourth wall and speaking directly to the orchestrator when you want to lean on its wisdom"
>
> *Source: Tweet Thread*

The `**...**` syntax is the CEO's proudest invention—it's the mechanism for stepping outside strict program semantics and speaking directly to the AI orchestrator.

---

## Landing Page Philosophy (January 2026)

> **Source:** Landing Page Copy at openprose.org (CEO wrote/approved)

### The Tagline

> "A new kind of language for a new kind of computer."
>
> *Source: Landing Page Header*

### The Core Proposition

> "A long-running AI session is a Turing-complete computer. OpenProse is a programming language for it."
>
> *Source: Landing Page Subhead*

This framing is fundamental: the CEO conceptualizes an AI session not as a tool but as a **computer**—specifically, a Turing-complete one. OpenProse is its programming language.

### The Intelligent Inversion of Control

> "Traditional orchestration requires explicit coordination code. OpenProse inverts this—you declare agents and control flow, and an AI session wires them up. The session is the IoC container."
>
> *Source: Landing Page - "The intelligent inversion of control"*

And further:

> "Traditional IoC wires up dependencies from configuration. OpenProse's container is an AI session that wires up agents using *understanding*—it knows context, not just config."
>
> *Source: Landing Page - Feature 1: "Intelligent IoC Container"*

The emphasis on *understanding* (italicized in original) is deliberate—the orchestrator uses semantic understanding, not just pattern matching.

### The Fourth Wall Explained

> "When you need AI judgment instead of strict execution, break out of structure: `loop until **the code is production ready**`. The interpreter evaluates this semantically."
>
> *Source: Landing Page - Feature 2: "The Fourth Wall"*

This is the public explanation of the `**...**` syntax: it's for when you want AI judgment, not strict execution.

### Open Standard, Zero Lock-in

> "OpenProse is a skill you import into Claude Code, OpenCode, Codex, Amp, or any compatible AI assistant. Switch platforms anytime—your `.prose` files work everywhere."
>
> *Source: Landing Page - Feature 3*

This is a strategic positioning decision: OpenProse is not tied to any platform. The `.prose` files are the portable artifact.

### Structure + Flexibility

> "Plain English prompts are ambiguous. Rigid frameworks are inflexible. OpenProse gives you unambiguous control flow with natural language conditions where you want flexibility."
>
> *Source: Landing Page - Feature 4*

This captures the balance OpenProse strikes: structure where it matters (control flow), flexibility where you want it (conditions).

### Why Structure Matters

> "'Why not just describe agents in plain English?' You can—that's what `**...**` is for. But complex workflows need unambiguous structure for control flow. The AI shouldn't have to guess whether you want sequential or parallel execution."
>
> *Source: Landing Page - "Why structure matters" section*

This addresses the obvious objection head-on: yes, you can use plain English (via `**...**`), but structural clarity for control flow is non-negotiable. The AI shouldn't guess about execution order.

---

## Core Philosophy: The Intelligent Orchestrator

The most important architectural decision in OpenProse is that the "Orchestrator Session" is an intelligent AI agent, not a traditional programming language runtime.

> "The orchestrator IS the Claude Code session (or OpenCode)... it HAS to use a SUBAGENT mechanism for spawning new inner Sessions... These all seem like qualities of the parent session--ie the orchestrator session--which is a full-blown agent. So I'm inclined to use its innate abilities."
>
> *Source: 2025-12-30-orchestrator-interview.md*

This leads to several implications:

1. **Semantic interpretation over parsing**: The orchestrator can understand natural language conditions rather than requiring strict syntax
2. **No custom tools needed**: Native subagent mechanisms (Claude Code's Task tool, OpenCode's equivalent) are sufficient
3. **Intelligent error handling**: The orchestrator interprets session outputs to determine success/failure without explicit error tools

> "I like the direction of "the intelligent Orchestrator", since this is essentially an LLM-native language we can just trust that it's smart enough to figure this stuff out."
>
> *Source: 2025-12-30-loops-interview.md*

---

## Language Design Preferences

### Syntax Philosophy

The CEO has strong preferences about syntax that emphasize readability and explicitness:

#### Quotes for References, Keywords Unquoted

> "I think quotes are better in this case. We should reserve unquoted strings for keywords and use quoted strings for references like this."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:26:00*

This applies to:
- Import statements: `import "skill-name" from "github:owner/repo"` (quoted skill name)
- Skills arrays: `skills: ["web-search", "summarizer"]` (quoted strings)
- Parallel join strategies: `parallel ("first")` (quoted, not bare `first`)

#### The `**...**` Discretion Syntax

A novel syntax invention for delegating decisions to the intelligent orchestrator:

> "My proposal for that syntax would be to use **classic markdown bolding syntax**. I'm curious what you think of this... This syntax clearly delineates the distinction for the model between control flow decisions that it's supposed to 'strictly adhere to' and what it's given leeway on to make decisions for itself."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:33:00*

This enables constructs like:
- `loop until **approved**:` - Orchestrator interprets when "approved" becomes true
- `choice **criteria**:` - Orchestrator decides which branch to take

### Canonical vs Sugar Syntax

The CEO prefers canonical forms during compilation to reduce ambiguity for the orchestrator:

> "My expectation is that on the 'expansion' step (part of 'compile'), that we standardize it to canonical. Ideally the canonical one is the most verbose, most well-typed, most explicit version, to reduce confusion for the Orchestrator Session who has to interpret it."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:38:00*

### Variable Semantics

The CEO supports both `let` (mutable) and `const` (immutable) bindings:

> "Yes, I think variable reassignment is fine. Perhaps we should also add `const` (and prefer that) for immutable variable assignment. I'm still anticipating that we'll want to write variable state to files to persist context across a long time."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:36:00*

### Syntax Style Preferences

The CEO explicitly rejected certain syntax styles:

**Lisp-style syntax: REJECTED**
> "Hate this."
>
> *Source: 2025-12-30-loops-interview.md, timestamp 2025-12-30 10:05:00*

**Java/TS braces syntax: REJECTED**
> "I don't like this."
>
> *Source: 2025-12-30-error-handling-interview.md, timestamp 2025-12-30 09:42:00*

**Hybrid do-while syntax: REJECTED**
> "Don't really like this."
>
> *Source: 2025-12-30-loops-interview.md, timestamp 2025-12-30 10:06:00*

**Python-style indentation: APPROVED**
> "Agreed, Indentation-based is cleanest and most readable."
>
> *Source: 2025-12-30-composition-interview.md, timestamp 2025-12-30 09:07:00*

### Confirmed Syntax Details

| Item | Decision | Source |
|------|----------|--------|
| File extension | `.prose` | Settled |
| Case sensitivity | Case-sensitive, lowercase | Settled |
| String interpolation | `{variable}` | Settled |
| Multi-line strings | `"""..."""` | Inferred from Python preference |
| Comments | `#` | Settled |

---

## Architectural Decisions

### No Custom Tools (loom_return, loom_error Removed)

A major simplification came from realizing the intelligent orchestrator doesn't need custom completion signaling:

> "Yes, this should be removed. This was an outdated idea that was resolved by designing an intelligent orchestrator. The Orchestrator Session, being an intelligent agent, will be able to simply understand the output to determine if there was an error coming out of the inner session or not."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:25:00*

### Session Spawning Architecture

The orchestrator handles ALL session spawning, even for nested sessions:

> "No, this is a good callout but I think you have a misconception about how nested blocks should work. Note that the IOC container orchestrates _every_ call between sessions. Even a nested session is co-ordinated by the Orchestrator Session."
>
> *Source: 2025-12-31-research-needed.md, timestamp 2025-12-31 12:44:00*

### Two-Phase Execution Model

> "This was my expectation. And it's my expectation that you could run this before starting the agent in bash _or_ the agent could run it itself if asked to run a loom program that itself had not yet been compiled after it inspected the state."
>
> *Source: 2025-12-31-runtime-interview.md, timestamp 2025-12-31 12:46:00*

The compile phase:
1. Parses the DSL
2. Installs imported skills
3. Validates references
4. Expands syntax sugar
5. Generates Orchestrator prompt

---

## State Management Preferences

### In-Context as Primary

For MVP, state lives in the orchestrator's conversation history:

> "I like the recommendation. I think we should keep the in-context tracking for MVP. For very long programs, filesystem checkpoints could be added later."
>
> *Source: 2026-01-01-state-interview.md, timestamp 2025-01-01 01:36:00*

> "For now, we're not going to use any of the below, and I'll want to revisit it later before we build it. The key takeaway is that the Orchestrator Session should be tracking state 'in context' for now, and should use tricks like 'talking aloud to itself' to remember state when it needs to."
>
> *Source: 2026-01-01-state-interview.md, timestamp 2025-01-01 01:41:00*

### Deferred: Filesystem State Persistence

While anticipated for the future, file-based state is deferred:

> "I like the file-based approach for later, but for now I think we should keep everything in-context for MVP and defer file persistence."
>
> *Source: 2026-01-01-state-interview.md, timestamp 2025-01-01 01:37:00*

---

## Error Handling Philosophy

### Default Behavior: Failure Throws/Propagates

> "Great, agreed." (confirming that session failure should throw/propagate up by default)
>
> *Source: 2025-12-30-error-handling-interview.md, timestamp 2025-12-30 09:24:00*

### Try/Catch/Finally Pattern

> "Great, awesome." (confirming try/catch/finally patterns)
>
> *Source: 2025-12-30-error-handling-interview.md, timestamp 2025-12-30 09:25:00*

> "Yes, let's do this." (confirming hybrid Python-style try/catch/finally syntax)
>
> *Source: 2025-12-30-error-handling-interview.md, timestamp 2025-12-30 09:44:00*

### Retry with Context

> "With prior context." (on whether retry starts fresh or with prior context)
>
> *Source: 2025-12-30-error-handling-interview.md, timestamp 2025-12-30 09:48:00*

### Retry Attached to Sessions

> "I think perhaps the retry and backoff properties should be inverted and attached as properties of the session itself."
>
> *Source: 2025-12-30-error-handling-interview.md, timestamp 2025-12-30 09:31:00*

### Good Telemetry by Default

> "Yes, we should be doing good telemetry/logging by default, especially early. We can always turn this down if it's too much."
>
> *Source: 2025-12-30-error-handling-interview.md, timestamp 2025-12-30 09:49:00*

### Error Object Properties Deprecated

> "This is completely deprecated now with our new thinking about error handling. Remove mentions of this from the specifications. Errors will be given as normal responses back from the subagent sessions, and can be trivially interpreted by the intelligent Orchestrator Session, who will follow the program flow accordingly."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:44:00*

### Parallel Failure Policy

Default is fail-fast, with configurable alternatives:

> From: 2025-12-31-parallel-interview.md
> - **Default**: fail-fast (one failure cancels others)
> - **Override**: `(on-fail: continue)` or `(on-fail: ignore)`

---

## Agent & Session Preferences

### Agent as Class/Template

> "This was my mental model coming into this." (confirming Agent is a class, Session is an instance)
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 08:52:00*

### Agent Definition: Declarative Block

> "I like this." (for declarative block syntax)
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 08:41:00*

> "This is ugly." (rejecting function-like agent definition)
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 08:42:00*

> "This leads to bad patterns." (rejecting inheritance-based agent definition)
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 08:43:00*

### Agent Properties

> "I think we want a 'prompt' field (which will presumably be added to the system prompt). None of the rest for now, we'll add them in later."
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 08:46:00*

### Agent Instantiation: Type Annotation + Implicit Sugar

> "I like your recommendation. C1+C3 (Type Annotation + Implicit Sugar) is the way to go."
>
> *Source: 2025-12-30-agents-followup.md, timestamp 2025-12-30 08:39:00*

This means:
- `session my-task: researcher` - Type annotation style
- `researcher:` as shorthand (syntactic sugar, later deprecated for ambiguity)

### Sessions Can Override Agent Properties

> "A session should be able to override any agent properties."
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 08:58:00*

### No Agent Composition/Mixins

> "I think Agents should NOT support composition by mixing in with one another. What we _should_ do is allow them to compose across control flow blocks (ie think functions), but that's a separate question."
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 08:59:00*

### Both Named Agents and Inline Config Supported

> "Yes, I like the recommendation. We should support both." (named agents for reuse, inline for one-offs)
>
> *Source: 2025-12-30-agents-interview.md, timestamp 2025-12-30 09:00:00*

---

## Distribution & Hosting Preferences

### Self-Hosted Marketplace

> "Yes, we need Option B."
>
> *Source: 2025-01-01-hosting-plan.md, timestamp 2025-01-01 05:48:00*

The repository serves as both marketplace and plugin.

### Skills-Only Architecture

After discovering the Command environment variable bug (#9354), the CEO pivoted to skills-only:

> "Can we execute the script from a skill instead of a plugin? Perhaps plugin is the wrong construct?"
>
> *Source: 2025-01-01-hosting-plan.md, timestamp 2025-01-01 06:41:00*

### Source Distribution Over Binary

> "We should actually start with Option B since it doesn't require an external dependency on node or us creating an npm repository."
>
> *Source: 2025-01-01-hosting-plan.md, timestamp 2025-01-01 05:50:00*

### Plugin Naming Preference

> "I like `prose`."
>
> *Source: 2025-01-01-hosting-plan.md, timestamp 2025-01-01 06:10:00*

### Documentation Structure

> "I think the 'interpreter' should go in a file next to SKILL.md called `prose.md`. This file needs to contain the absolute full documentation of the DSL, introducing the concept, including all syntax, examples, and other relevant information for how to interpret and execute a program."
>
> *Source: 2025-01-01-hosting-plan.md, timestamp 2025-01-01 06:07:00*

---

## Development Philosophy

### Immediately Usable, Incrementally Built

> "The skill should be immediately usable. We should be building out the skill such that we can use it end to end even with very limited language features."
>
> *Source: 2025-01-01-hosting-plan.md, timestamp 2025-01-01 06:10:00*

### Claude Code First, OpenCode Second

> "Accept Asymmetry, we don't care about that for now. In fact, let's make the MVP work for Claude Code and then we'll do OpenCode second."
>
> *Source: 2025-12-31-research-needed.md, timestamp 2025-12-31 12:43:00*

### Minimal Marketing

> "No, I will tweet about it and that's it for now."
>
> *Source: 2025-01-01-hosting-plan.md, timestamp 2025-01-01 06:10:00* (on external discovery channels)

---

## Feature Decisions by Topic

### Parallel Execution

**Join Strategies**: Implement all of them (not just MVP subset)

> "No, let's implement them all. These shouldn't be harder to implement."
>
> *Source: 2025-12-31-parallel-interview.md, timestamp 2025-12-31 12:40:00*

Strategies: `all` (default), `first`, `any`, `settled`

**Named Results Syntax**:

> "Yes." (confirming `name = session` syntax inside parallel)
>
> *Source: 2025-12-31-parallel-interview.md, timestamp 2025-12-31 12:41:00*

**Edge Cases**:
- Parallel of one: Valid
- Empty parallel: Error at parse time

### Loops

**Loop Iteration Limit**:

> "For MVP there is no limit but maybe we want a reasonably high one just in case?"
>
> *Source: 2025-12-30-loops-interview.md*

**Reduce Syntax**:

> "I like Pattern A, let's get rid of Pattern B."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:40:00*

Pattern A: `items | reduce(summary, item): session "Add {item} to {summary}"`

### Block Parameters

Not deferred - should be implemented:

> "Let's not defer block parameters, since this is actually fairly straightforward to implement now that we're using the intelligent orchestrator."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:43:00*

### Keywords

- `throw`: Needed, should be documented
- `log`: Not needed
- `context`: Needs more examples before deciding

> "We don't need `log`. We do need `throw` so we should update that."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:31:00*

### Time Units

No formal parsing needed - the orchestrator interprets them:

> "Keep in mind that an intelligent agent (ie the Orchestrator Session) will be responsible for 'understanding' (not parsing) these intervals, so the ones we're using are fine and self-evident."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:32:00*

---

## Deferred/Punted Items

The CEO explicitly punted these items for later consideration:

1. **Timeout handling** - "Yes, punt." (2025-12-31-parallel-interview.md)
2. **Cancel semantics** - "Yes." (2025-12-31-parallel-interview.md)
3. **Filesystem state persistence** - Deferred for MVP
4. **Error/recovery checkpointing** - "Yes, let's defer this entirely for now." (2026-01-01-state-interview.md)
5. **Custom orchestrator agent** - "Let's research this later and punt on it for now." (2025-01-01-hosting-plan.md)
6. **TUI/rich progress display** - Use framework TUI
7. **REPL/interactive mode** - Punted
8. **Cost warnings** - Punted

---

## Syntax Decisions Consolidated

### Confirmed Syntax Patterns

| Pattern | Syntax | Source |
|---------|--------|--------|
| Simple session | `session "prompt"` | Settled |
| Session with agent | `session: agent` or `session name: agent` | agents.md |
| Parallel (default) | `parallel:` | Settled |
| Parallel (race) | `parallel ("first"):` | CEO decision |
| Named results | `x = session "..."` | Settled |
| Variable binding | `let x = session "..."` / `const x = session "..."` | CEO decision |
| Context (single) | `context: x` | Settled |
| Context (multiple) | `context: { a, b, c }` | Settled |
| Orchestrator discretion | `**condition**` | CEO invention |
| Loop until | `loop until **approved**:` | CEO decision |
| Imports | `import "skill" from "source"` | CEO decision |

### Removed/Changed Syntax

| Old | New | Reason | Source |
|-----|-----|--------|--------|
| `race:` block | `parallel ("first"):` | Consolidate parallel variants | 2025-12-31 12:28:00 |
| `reduce("") as acc, item:` | `reduce(acc, item):` | Simplification | 2025-12-31 12:40:00 |
| Bare identifiers in skills | Quoted strings | Consistency | 2025-12-31 12:26:00 |

---

## Ambiguities Flagged for Resolution

The CEO identified these as needing resolution:

1. **Session declaration patterns**: Need a canonical recommendation
2. **Implicit shorthand disambiguation**: "This ambiguity is not acceptable and we should clean this up" (2025-12-31 12:41:00)
3. **Build target specification**: Need syntax to specify Claude Code vs OpenCode compilation target

---

## Evolution of Preferences Over Time

### December 29, 2025: Initial Questions Interview
- Established foundational preferences about syntax, control flow, and error handling
- Introduced the concept of the "intelligent orchestrator"

### December 30, 2025: Core Architecture Interviews
- Composition interview established block structure
- Orchestrator interview confirmed native subagent usage
- Agents interview defined template system
- Loops interview embraced semantic condition evaluation

### December 31, 2025: Syntax Refinement
- Resolved syntax conflicts (quotes vs bare identifiers)
- Removed deprecated concepts (loom_error, race: block)
- Established `**...**` discretion syntax
- Confirmed parallel strategies and failure policies

### January 1, 2025: State Management & Distribution
- Deferred filesystem state for MVP
- Pivoted from Commands to Skills-only architecture
- Established source distribution model
- Confirmed documentation structure (SKILL.md + prose.md)

---

## Skills & Imports Preferences

### Import Syntax: Package-Style

> "I like the recommendation. Let's go with Option B for now and we can always add versioning later if need be."
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:07:00*

Syntax: `import "skill" from "github:owner/repo"`

### Compile-Time Resolution

> "I like the recommendation. Let's go with Compile time for now..."
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:08:00*

### Clone to Project

> "I like the recommendation. Let's go with Option A." (clone to project for reproducibility)
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:09:00*

### No Lock File (For Now)

> "No, a lock file is overkill for now, we'll add this later."
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:10:00*

### Skills Do Not Need Parameters

> "No, skills do not need parameters."
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:12:00*

### 100% OpenCode Skills (No Custom Format)

> "No, these are 100% OpenCode skills, we shouldn't be adding anything. The syntax for installing them is all we're concerned about."
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:14:00*

### Imports Hoisted to Top

> "All at the top."
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:19:00*

### No Skill Marketplace

> "No." (on skill marketplace/registry vision)
>
> *Source: 2025-12-30-skills-interview.md, timestamp 2025-12-30 09:23:00*

---

## Composition & Block Preferences

### Block Keyword Preferred

> "I like `block`."
>
> *Source: 2025-12-30-composition-interview.md, timestamp 2025-12-30 09:19:00*

### Implicit Sequence at Top Level

> "Yes." (confirming top-level statements are implicitly sequential)
>
> *Source: 2025-12-30-composition-interview.md, timestamp 2025-12-30 09:20:00*

### Lexical Scope for Nested Blocks

> "Yes, good. But punt on implementing this, I don't think we need this yet."
>
> *Source: 2025-12-30-composition-interview.md, timestamp 2025-12-30 09:14:00*

### Block Types (Including Choice)

> "Yes, I actually really like these. Notably, if we have a 'choice' block, the orchestrator needs to be intelligent."
>
> *Source: 2025-12-30-composition-interview.md, timestamp 2025-12-30 09:15:00*

### Block Invocation with `do`

> "I like your recommendation, let's go with that. Use the `do` syntax."
>
> *Source: 2025-12-30-composition-followup.md, timestamp 2025-12-30 09:06:00*

### Block Visibility: File-Local for Now

> "For now, local to file. Later we'll implement exporting."
>
> *Source: 2025-12-30-composition-interview.md, timestamp 2025-12-30 09:22:00*

---

## Pipeline Preferences (Map/Filter/Reduce)

### Pipes Approved

> "This is phenomenal, you were right about the pipes."
>
> *Source: 2025-12-31-loops-followup.md, timestamp 2025-12-31 12:30:00*

### Reduce Parentheses OK

> "This is the first time we're introducing parentheses. Is this okay? I'm inclined to think it is fine."
>
> *Source: 2025-12-31-loops-followup.md, timestamp 2025-12-31 12:29:00*

### Parallel Map (pmap)

> "If you can think of a better word than that, perhaps just `parallel`? Or is that already taken. I'm fine with `pmap`, but add a note to the implementation that the CEO would like to find a more obvious keyword if possible."
>
> *Source: 2025-12-31-loops-followup.md, timestamp 2025-12-31 12:31:00*

---

## Resolved Ambiguities (From December 31, 2025)

### Implicit Shorthand Removed

> "No, this ambiguity is not acceptable and we should clean this up a little bit."
>
> *Source: 2025-12-31-open-questions-interview.md, timestamp 2025-12-31 12:41:00*

Resolution: Require `session` keyword always (Option A).

> "I like Option A. Let's go with that."
>
> *Source: 2025-12-31-decisions-interview.md, timestamp 2025-12-31 17:43:00*

### Markdown Bold for Multi-Line

> "Confirmed that we should use Option A (Markdown Bold) and triple asterisks for multi-line."
>
> *Source: 2025-12-31-decisions-interview.md, timestamp 2025-12-31 17:35:00*

### Build Target via CLI Flags

> "We don't need to support a config file. We can just use the CLI flags, and I like the ones you've proposed. I also like the auto-detection from the .claude or .opencode presence."
>
> *Source: 2025-12-31-decisions-interview.md, timestamp 2025-12-31 17:44:00*

### Context Keyword Confirmed

> "I like the examples. I think we should add `context` to the spec. I think we should document it fully. I think we should keep it as a session property, not a keyword."
>
> *Source: 2025-12-31-decisions-interview.md, timestamp 2025-12-31 17:45:00*

---

## Key Quotes by Theme

### On Trusting AI Intelligence

> "We rely on its intelligence to handle this." (Multiple occurrences)

> "I like the direction of 'the intelligent Orchestrator', since this is essentially an LLM-native language we can just trust that it's smart enough to figure this stuff out."
>
> *Source: 2025-12-30-loops-interview.md*

### On Simplification

> "This is completely deprecated now with our new thinking about error handling."

### On Pragmatic Deferral

> "Yes, punt." / "Let's defer this entirely for now." (Multiple occurrences)

> "Punt on this. Maybe later." (on early exit from loops)
>
> *Source: 2025-12-30-loops-interview.md, timestamp 2025-12-30 09:59:00*

### On Consistency

> "I think quotes are better in this case. We should reserve unquoted strings for keywords and use quoted strings for references."

### On Immediate Usability

> "The skill should be immediately usable. We should be building out the skill such that we can use it end to end even with very limited language features."

### On Iterative Development

> "Yes, I think you're doing well here, thank you, keep it up!"
>
> *Source: 2025-12-31-loops-followup.md, timestamp 2025-12-31 12:32:00*

### On Manual Intervention

> "Yes, it's important we can do this. My hope is we just get this 'for free' if the orchestrator is a normal session." (on Ctrl+C and manual intervention during loops)
>
> *Source: 2025-12-30-loops-interview.md, timestamp 2025-12-30 10:03:00*

---

## Source Files Reference

This document synthesizes preferences from the following guidance files:

### Public Communications (January 2026)
- **Tweet Thread** (https://x.com/irl_danB/status/2007259356103094523) - Public framing and vision
- **Landing Page Copy** (openprose.org) - Core positioning and feature descriptions
- **ELEGANT_SIMPLIFICATION.md** - The two-file architecture plan and CEO clarifications

### Original Interviews (2025-12-29 - 2026-01-01)
- `2025-12-29-questions-interview.md` - Initial questions and foundational preferences
- `2025-12-30-composition-interview.md` - Block structure and composition
- `2025-12-30-composition-followup.md` - Block invocation syntax
- `2025-12-30-orchestrator-interview.md` - Intelligent orchestrator architecture
- `2025-12-30-loops-interview.md` - Loop constructs and conditions
- `2025-12-30-error-handling-interview.md` - Error handling philosophy
- `2025-12-30-skills-interview.md` - Skills and imports
- `2025-12-30-agents-interview.md` - Agent templates
- `2025-12-30-agents-followup.md` - Agent instantiation syntax
- `2025-12-31-decisions-interview.md` - Resolved ambiguities
- `2025-12-31-syntax-interview.md` - Settled syntax decisions
- `2025-12-31-wiring-settled.md` - Context passing confirmed
- `2025-12-31-loops-followup.md` - Pipeline operators (map/filter/reduce)
- `2025-12-31-parallel-interview.md` - Parallel execution strategies
- `2025-12-31-runtime-interview.md` - Compile and runtime phases
- `2025-12-31-open-questions-interview.md` - Specification gaps resolved
- `2025-12-31-research-needed.md` - Framework research
- `2025-12-31-scenarios-examples.md` - Use case examples
- `2026-01-01-state-interview.md` - State management

### Planning Documents
- `2024-12-31-sessions-research.md` - Session research
- `2025-01-01-how-to-host-plugin-reference.md` - Plugin hosting reference
- `2025-01-01-hosting-plan.md` - Distribution strategy
- `2025-01-02-build-plan-tiers-0-12.md` - Feature implementation plan

---

## Elegant Simplification (January 2026)

> **Source:** ELEGANT_SIMPLIFICATION.md and CEO clarifications (2026-01-03)

### The Ultimate Expression of "Pattern Over Framework"

<CEO timestamp="2026-01-03 04:30:00">
"We remove the compiler and validator packages completely from the skill. Instead, those will be published to an npm package that ships completely separately, not bundled with the skill, and only used for development purposes like hosting the LSP, etc.

Then we make the `prose.md` file the _compiler_... This markdown file _will be interpreted_ by the orchestrator. It doesn't need to happen with a classical lexical parser, it can happen semantically."
</CEO>

**Key insight:** If the language is truly self-evident, the intelligent orchestrator can validate and interpret it without a classical lexer/parser.

### `prose.md` as Both Compiler and Validator

<CEO timestamp="2026-01-03 05:15:00">
"I want you to think of the `prose.md` more as both a compiler and validator. It does both—it compiles it (ie. it modifies it into 'best practice .prose' as judged by the orchestrator using the knowledge from the `prose.md` file) and it validates it (decides whether a blank agent with only access to the 'interpreter.md' file 'understands' it as a self-evident system).

This is what it means to 'compile'. And I want this self-aware compiler to be named as an iconic `prose.md` file."
</CEO>

**The dual role:**
1. **Compiler:** Transforms input into "best practice .prose"
2. **Validator:** Determines whether a blank agent with only `interpreter.md` would understand the program

### Self-Evidence as Validation Criterion

The CEO defines a novel validation approach: a program is valid if an agent with **only** the interpreter file (no full spec) would understand it. This operationalizes "structured but self-evident."

### Interpreter Scope: Lean Toward Success

<CEO timestamp="2026-01-03 05:30:00">
"I do think we want at least some [syntax reference]. The syntax matters and we don't want high-level misinterpretations. In fact we'd rather lean on the 'higher rate of success' than the 'too concise'."
</CEO>

The `interpreter.md` file should include a condensed syntax grammar (without validation rules). Completeness over brevity—reduce misinterpretation risk.

### Examples Are Critical

<CEO timestamp="2026-01-03 05:15:00">
"YES the plugin should still ship with examples, this is very important! Keep those in whatever gets cloned in the skill!"
</CEO>

### Repository Separation

<CEO timestamp="2026-01-03 05:15:00">
"Claude Code plugins cannot clone just a subdirectory—the entire repo gets cloned. So we need to move the plugin to its own repository: `git@github.com:openprose/prose.git`"
</CEO>

**Result:** The plugin lives in a dedicated repo (`openprose/prose`), while dev tools, API, and landing page remain in the main repo.

### Meta-Orchestrator (Future Concept)

<CEO timestamp="2026-01-03 05:15:00">
"There are ways of having a meta-orchestrator with access to the full `prose.md` file periodically check in on the orchestrator to raise up any potential mistakes or divergences from the orchestration plan. Add this as a concept for future implementation."
</CEO>

---

## Summary: What the CEO Wants

### Vision & Positioning
1. **"A new kind of language for a new kind of computer"** - AI sessions are Turing-complete computers; OpenProse is their programming language
2. **"More of a pattern than a framework"** - Maximally minimal; "barely even anything at all"
3. **"Structured but self-evident"** - Unambiguous control flow with minimal documentation required
4. **Platform-agnostic skill** - Works with Claude Code, OpenCode, Codex, Amp, and future AI assistants

### Technical Philosophy
5. **A language that trusts AI intelligence** rather than requiring strict programmatic constraints
6. **Clean, consistent syntax** with clear distinctions between keywords and references
7. **The `**...**` discretion syntax** - "the pièce de résistance" for breaking the fourth wall and speaking directly to the orchestrator
8. **Structure where it matters, flexibility where you want it** - The AI shouldn't guess about sequential vs parallel execution

### Execution Approach
9. **Pragmatic MVP approach** that works end-to-end, even with limited features
10. **Claude Code first**, OpenCode support later
11. **In-context state management** for MVP, with filesystem persistence deferred
12. **Skills-only distribution** to work around platform bugs
13. **Immediate usability** over feature completeness
