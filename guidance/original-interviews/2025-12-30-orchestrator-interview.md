# OpenProse: The Orchestrator Agent

Based on CEO answers from QUESTIONS.md (Q23-Q30).

---

## CEO Direction Summary

- Design like a traditional **IoC container** (Spring, NestJS)
- Some sort of **interpreter step** (static) for things like installing skills
- Then a choice: **static container** vs **intelligent container**
- Start with **Opus 4.5** as orchestrator model
- Orchestrator should **not modify the plan** mid-execution
- Responsible for **control flow, context passing**
- Execution should be **transparent** (user sees reasoning)
- Orchestrator sees the **full program** in system prompt
- **Strict adherence** to DSL structure
- Sessions are the primary **managed objects**
- You want to **discuss this together** - push back on poor design

---

## ⭐ THE CENTRAL QUESTION

### Static vs Intelligent Orchestrator

This is the fundamental architectural decision that affects everything else.

**Option A: Static Container (Mechanical Executor)**

The orchestrator is code that follows the DSL exactly:

- Predictable, debuggable
- No LLM reasoning overhead
- Cannot adapt or summarize intelligently
- Condition evaluation (`until approved`) requires explicit structured returns

**Option B: Intelligent Container (LLM Agent)**

The orchestrator is an LLM that interprets the DSL:

- Can summarize context intelligently
- Can evaluate semantic conditions (`until approved`)
- Non-deterministic
- Expensive (reasoning tokens)

**Option C: Hybrid (Recommended)**

Structure is mechanical, data handling is intelligent:

- Program flow: deterministic (follows DSL exactly)
- Context passing: intelligent (can summarize)
- Condition evaluation: intelligent (can interpret session output)

<CEO timestamp="2025-12-30 09:25:00">

    Yes, I love your Hybrid recommended option. We need to be really careful with what we delineate here and how we _describe_ these responsibilities to the Orchestrator Session, since that will be what ultimately makes the decisions.

    My mental model here is that we will give the model (somehow, as a skill or as a plugin or inject directly into the system prompt):

        - The OpenProse Interpretter (a markdown file and parser bundle combination, shipped as a "Skill")
        - An OpenProse Program (a .prose file, loaded into the system prompt or sent as the first message in the conversation)

    The Orchestrator model (always the most intelligent one, ie Opus 4.5 for now) will always start the conversation by triggering the "loom compile" script which does any "classically programmatic" things that need to be done before it begins:
        * installs the imported skills
        * validates the loom and does any expansion to make it more useful/easy to follow for the model itself
        * initializes any state that should be initialized (ie saves state as files on the file system, but let's talk about that elsewhere)

    The model will then "know" the interpretter, all the rules about the language and how to interpret keywords, how to run the control flow, how to "intelligently" pass state/context, etc. And then it will be tasked with invoking subagents, running them in whatever control flow is dictated by the program, receiving state that is returned, intelligently passing it on, etc.

    Before we go further, I want to paste in context I have from a thread that I wrote in response to something I saw:

    >    Is there anyway to chain skills or commands together in claude code?

    >   Yes, just ask claude to invoke skill 1, then skill 2, then skill 3, in natural language. Or ask it to use parallel subagents to invoke the skills in parallel. Then if you want, put that all in a skill.

    >   well shit the alpha is out now
    >   ie claude code itself can be used as a sort of intelligent inversion of control container that can wire up dependencies and orchestrate their interactions

    >   this means you can write complex programs for it
    >   not simple imperative programs
    >   but sprawling service-based architectures
    >   one could, say, design a language that defines agent control flows declaratively
    >   and then write what is effectively an interpreter for that language and distribute it as a skill
    >   the language was originally named loom at claude's insistence, but this term is overloaded. so I'm pivoting it to something else... a decision for which is ironically the main holdup for release. maybe I'll just publish the github repo before it has a name

Core challenge: the Orchestrator Session will need to track execution state across a complex OpenProse Program. Hopefully it can get away with doing this purely "in context" but perhaps we'll resort to writing execution state to files or beads if need be. We'll do that later.

</CEO>

---

## Reconciling Your Requirements

You said:

1. "Strict adherence to DSL structure"
2. "Intelligent context passing"
3. "Transparent execution"
4. "Orchestrator should not modify the plan"

These reconcile as follows:

| Aspect                | Mechanical    | Intelligent  |
| --------------------- | ------------- | ------------ |
| Execution order       | ✓ Exact       |              |
| Session creation      | ✓ Exact       |              |
| Error handling        | ✓ Follows DSL |              |
| Context summarization |               | ✓ Discretion |
| Condition evaluation  |               | ✓ Semantic   |
| Prompt modification   | ✗ Never       |              |
| Step skipping         | ✗ Never       |              |

**Recommendation: Hybrid with clear boundaries**

---

## ⭐ CRITICAL QUESTIONS

### Q1: Is the Orchestrator an LLM Agent? ⭐ MUST ANSWER

Based on your preference for "transparent execution" and running as "an OpenCode CLI session":

<CEO timestamp="2025-12-30 10:11:00">Yes.</CEO>

**Strong Recommendation: Yes**

The orchestrator should be an OpenCode session with:

- Full DSL program in system prompt
- Custom tools for session management
- Visible reasoning in TUI

This gives you transparency and allows intelligent context handling.

<CEO timestamp="2025-12-30 10:12:00">Yes. I know we've talked about this as an OpenCode session to date, but I'm curious if it can actually be system agnostic (maybe with slightly different interpretters, translating the the OpenProse Program into slightly different framework-specific concepts?). But I believe that all of the concepts we've added so far can be distributed as a "Skill", which means they can be OpenCode/ClaudeCode agnostic.</CEO>

### Q2: Where Is the Static/Intelligent Boundary?

**Proposed Boundary:**

| Static (Mechanical)   | Intelligent (LLM Discretion)               |
| --------------------- | ------------------------------------------ |
| Sequence execution    | Context summarization                      |
| Parallel coordination | Condition evaluation (`until approved`)    |
| Loop iteration count  | "Choice" block routing                     |
| Error propagation     | Determining "done" for implicit completion |
| Session creation      |                                            |

<CEO timestamp="2025-12-30 10:13:00">This aligns with my mental model. To be clear: "Static (Mechanical)" is still _operated_ by the Orchestrator Session. It's just that it adheres absolutely to the control flow dictated by the program. On the other hand, the Orchestrator Session is given more leeway to intelligently handle context passing, condition evaluation, choice block routing, etc.</CEO>

### Q3: Can the Orchestrator Retry Autonomously?

Your ERROR-HANDLING.md direction: Retry is a session property.

**Recommendation: No autonomous retries**

If DSL says `session "X" (retry: 3)`, orchestrator retries up to 3 times.
If DSL has no retry, orchestrator fails on first error.

This maintains "strict adherence."

<CEO timestamp="2025-12-30 10:14:00">Yes, this is correct.</CEO>

### Q4: What Tools Does the Orchestrator Have?

**Proposed Tool Set:**

```
loom_create_session(agent, skills, title)
loom_send_prompt(session_id, prompt, context)
loom_await_completion(session_id)
loom_abort_session(session_id)
loom_get_result(session_id)
loom_summarize(content, max_tokens)  # for intelligent context
```

<CEO timestamp="2025-12-30 10:15:00">Ideally we want to use whatever Subagent constructs already exist in both languages. Is this possible? Can we do this? Seems like we need to do more research about OpenCode's API. Do they have a subagent tool? Can I trigger async subagents? I know Claude Code lets you do both. I think we'd need to do both in order to take advantage of existing Subagents and not need to roll our own plugin with specialied tools.

I'm even considering whether we want to implement `loom_complete` and `loom_error` anymore either. I know I had expressed that I had, but if our Orchestrator Session is intelligent then we don't actually need both channels, do you understand? Because it can determine the error purely from the response. So a class Claude Code subagent is sufficient, as long as you can give it skills, etc.</CEO>

### Q5: How Does `loop until approved` Work?

This requires intelligent interpretation.

**Options:**

- A: Session returns `{ approved: true }` explicitly
- B: Orchestrator analyzes output semantically ⭐ RECOMMENDED
- C: DSL expression (`until feedback.score > 0.9`)

<CEO timestamp="2025-12-30 10:16:00">Yes, Option B. Orchestrator Session should handle outputs.</CEO>

**Recommendation: B with A as preferred**

Prompt sessions to return structured data when possible. Orchestrator can interpret semantically as fallback.

<CEO timestamp="2025-12-30 10:17:00">I think this words it too strongly, we don't necessarily _need_ structure like "{ approved }", however this is just classic prompt guidance and so yes, we should write specific prompts with focused outputs to assist the intelligent Orchestrator Session in doing its thing.</CEO>

## Two-Phase Architecture (Confirmed)

### Phase 1: Static (Pre-Runtime)

1. Parse DSL syntax
2. Clone/install skills from imports
3. Validate agent/skill references
4. Generate orchestrator system prompt

**Deterministic and reproducible.**

<CEO timestamp="2025-12-30 10:18:00">Yes, exactly. Beyond the validation it may do some expansion or other helpful syntactical sugar to help the intelligent Orchestrator keep track of execution state.</CEO>

### Phase 2: Runtime (Orchestrator)

Orchestrator LLM executes with:

- Full program in system prompt
- Tools for session management
- Discretion over context transformation

<CEO timestamp="2025-12-30 10:19:00">Yes, exactly. This is just a long-running Claude Code or OpenCode Session which uses the advanced model, is given the OpenProse Interpretter logic and instructions in the system prompt, given the OpenProse Program and any expansions/helpful sugar in the prompt.</CEO>

---

## My Pushback

### Concern 1: Cost

Opus 4.5 as orchestrator = expensive for every decision.

**Mitigation options:**

- Use cheaper model for simple orchestration steps
- Minimize orchestrator "thinking" for straightforward sequences
- Cache/memoize decisions where possible

**Question: Is cost a concern, or is correctness the priority?**

<CEO timestamp="2025-12-30 10:20:00">Cost is not a concern for now.</CEO>

### Concern 2: Debugging Non-Determinism

If orchestrator summarizes context differently each run, debugging is hard.

**Recommendation:** Log all context transformations. Make them auditable.

<CEO timestamp="2025-12-30 10:21:00">Yes, hopefully we can just see the logs because the Orchestrator Session is always logged anyway (in Claude Code and OpenCode). And yes, we don't care about non-determinism because we'll rely on the intelligence of the model.</CEO>

### Concern 3: Condition Evaluation Reliability

"Until approved" is ambiguous. What counts as approved?

**Recommendation:** Encourage explicit returns. Document that semantic evaluation is best-effort.

<CEO timestamp="2025-12-30 10:22:00">Yes, we should encourage explicit returns from sessions, but we should also rely on the intelligence of the model being pretty damn good.</CEO>

---

## Proposed Implementation

```
┌─────────────────────────────────────────┐
│           STATIC PHASE (CLI)            │
├─────────────────────────────────────────┤
│  open-prose run program.prose             │
│    1. Parse DSL                         │
│    2. Install skills                    │
│    3. Validate                          │
│    4. Generate orchestrator prompt      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      RUNTIME PHASE (OpenCode Session)   │
├─────────────────────────────────────────┤
│  Orchestrator Agent                     │
│                                         │
│  System Prompt:                         │
│  - "You are the OpenProse orchestrator" │
│  - Full DSL program                     │
│  - Execution rules                      │
│                                         │
│  Tools:                                 │ < -- <CEO timestamp="2025-12-30 10:23:00"> My hope is that we can just use the Subagent tool calls in Claude Code and some equivalent tool calls in OpenCode. Hopefully we can get rid of this block.</CEO>
│  - loom_create_session                  │ < --
│  - loom_send_prompt                     │ < --
│  - loom_await_completion                │ < --
│  - loom_summarize                       │
│                                         │
│  Behavior:                              │
│  - Execute structure EXACTLY            │
│  - Use intelligence for context only    │
│  - Report progress transparently        │ < -- <CEO timestamp="2025-12-30 10:24:00"> This happens for free, we don't need to implement this.</CEO>
└─────────────────────────────────────────┘
```

---

## Summary: Questions That Need Answers

### ⭐ CRITICAL

1. **Q1: Is the orchestrator an LLM agent?** (Recommended: Yes, for transparency and intelligent context)
   <CEO timestamp="2025-12-30 10:26:00">Yes.</CEO>
2. **Q2: Static/intelligent boundary** — Confirm the proposed split
   <CEO timestamp="2025-12-30 10:27:00">Confirmed.</CEO>
3. **Cost tolerance** — Is Opus 4.5 cost acceptable for all orchestration?
   <CEO timestamp="2025-12-30 10:28:00">Yes.</CEO>

### Inferred Defaults (Confirm)

- Orchestrator runs as OpenCode session (visible in TUI)
  <CEO timestamp="2025-12-30 10:26:00">Yes. Or Claude Code. It should just ship as a skill so theoretically it can do both.</CEO>
- Strict structure, intelligent data
  <CEO timestamp="2025-12-30 10:25:00">Confirmed.</CEO>
- No autonomous retries beyond DSL specification
  <CEO timestamp="2025-12-30 10:27:00">Confirmed.</CEO>
- Condition evaluation is semantic (LLM interprets)
  <CEO timestamp="2025-12-30 10:28:00">Confirmed.</CEO>
- Context summarization at orchestrator discretion
  <CEO timestamp="2025-12-30 10:29:00">Confirmed.</CEO>

### Punted

- Specific tool implementations
- Caching/memoization strategies
  <CEO timestamp="2025-12-30 10:30:00">I think we should consider encouraging the Orchestrator Session to use the filesystem to write "state". But let's punt on this.</CEO>
- Detailed cost optimization
