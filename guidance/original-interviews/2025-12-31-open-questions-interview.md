# OpenProse: Open Questions & Specification Gaps

> Generated from specification review on 2024-12-31

This document captures conflicts, ambiguities, and unresolved design questions discovered during specification review.

---

## Critical Conflicts

### 1. `loom_error` Tool Contradiction

**Conflict between:**

- `error-handling.md:166-176` references `loom_error` tool for session failure signaling
- `orchestrator.md:106-108` explicitly states `loom_return` and `loom_error` tools are **not required**
- `2024-12-31-sessions-research.md:11-14` confirms these tools are cancelled

**Question:** Should the `loom_error` reference in error-handling.md be removed? How do sessions signal failure if not via explicit tool?

<CEO timestamp="2025-12-31 12:25:00">Yes, this should be removed. This was an outdated idea that was resolved by designing an intelligent orchestrator. The Orchestrator Session, being an intelligent agent, will be able to simply understand the output to determine if there was an error coming out of the inner session or not.</CEO>

---

### 2. Import Syntax Inconsistency

**Conflict between:**

- `skills.md:46-48` shows: `import "skill-name" from "github:owner/repo"` (quoted skill name)
- All examples show: `import web-search from "github:owner/repo"` (unquoted skill name)

**Question:** Which is correct? Quoted or unquoted skill names in imports?

<CEO timestamp="2025-12-31 12:26:00">I think quotes are better in this case. We should reserve unquoted strings for keywords and use quoted strings for references like this.</CEO>

---

### 3. Skills Array Syntax Inconsistency

**Conflict between:**

- `skills.md:117-119` shows: `skills: ["web-search", "summarizer"]` (quoted strings)
- `agents.md:21` shows: `skills: [web-search, summarizer]` (unquoted identifiers)
- Examples use unquoted form

**Question:** Should skill references be quoted strings or bare identifiers?

<CEO timestamp="2025-12-31 12:27:00">I think quotes are better in this case. We should reserve unquoted strings for keywords and use quoted strings for references like this.</CEO>

---

### 4. `race:` Block vs `parallel (first):`

**Conflict between:**

- `composition.md:48-50` defines `race:` as a distinct block type
- `parallel.md:30-34` shows `parallel (first):` for the same behavior

**Question:** Are both syntaxes valid? Is `race:` syntactic sugar for `parallel (first):`? Or should one be removed?

<CEO timestamp="2025-12-31 12:28:00">Let's stick with `parallel (first)` since there are a number of other ways we can do this. In fact, given our decision above about quotes, I suspect it should actually be: `parallel ("first")`. I think this would be more consistent. Perhaps do another scan of the specification to see if there's anything else like this that could also use examination.</CEO>

---

## Missing Specifications

### 5. No `sessions.md` Specification

**Referenced by:**

- `error-handling.md:198` says "See Sessions specification"
- Session semantics are scattered across `agents.md` and guidance documents

**Question:** Should there be a dedicated `sessions.md` spec consolidating session creation, lifecycle, and completion semantics?

<CEO timestamp="2025-12-31 12:29:00">If there is anything missing or undocumented in the specification that was mentioned in the `guidance/original-interviews/2024-12-31-runtime-interview.md` or `guidance/original-interviews/2024-12-30-agents-interview.md` or `guidance/original-interviews/2024-12-30-agents-followup.md` or `guidance/2024-12-31-sessions-research.md`, then yes we should maybe consolidate into a sessions.md. In fact if you think this is a better way to organize some of the scattered notes about sessions, then yes, let's do this. On the other hand if you think that would be redundant and not useful, then leave it as is.</CEO>

---

### 6. No `state.md` Specification

**Referenced by:**

- `error-handling.md:63` says error access syntax "depends on state passing design (see State specification)"

**Question:** Is state management documented elsewhere, or does this spec need to be written?

<CEO timestamp="2025-12-31 12:30:00">I think we could take a moment to do an interview about state and make a spec out of that, so yes, please start by exploring the current guidance and specification, their reference to state--ie the Orchestrator Session having to track: the state of the call flow, context state being passed around, variable state, etc. Use the information present to create another interview STATE.md at the top level of the repository. Make any inferences and recommendations inline in the doc from my other guidance. From there I'll answer any open questions and confirm any assumptions and then we can make a state.md specification doc out of that later.</CEO>

---

### 7. Undocumented Keywords

The following appear in specs but are not listed in `syntax.md` keywords:

| Keyword   | Used In               | Purpose               |
| --------- | --------------------- | --------------------- |
| `throw`   | error-handling.md:157 | Rethrow errors        |
| `log`     | error-handling.md:155 | Log errors            |
| `context` | wiring.md, examples   | Specify input context |

**Question:** Should these be added to the syntax.md keyword list?

<CEO timestamp="2025-12-31 12:31:00">We don't need `log`. We do need `throw` so we should update that. As for `context, I'd want to see some examples of how that would be used in realistic use cases before deciding on that one.</CEO>

---

### 8. Time Unit Syntax Undocumented

`error-handling.md:117` shows `backoff: [1s, 5s, 30s]` with time units, but time literal syntax (`1s`, `30s`, `1h`, etc.) is not documented in syntax.md.

**Question:** What time units are supported? What's the parsing format?

<CEO timestamp="2025-12-31 12:32:00">
Keep in mind that an intelligent agent (ie the Orchestrator Session) will be responsible for "understanding" (not parsing) these intervals, so the ones we're using are fine and self-evident.
</CEO>

---

## Ambiguous Semantics

### 9. How Does `loop until approved` Work?

The spec says the orchestrator "interprets semantically" but:

- What session output signals `approved = true`?
- Does the condition variable (`approved`) reference a specific session?
- How should prompts be written to reliably signal condition state?

**Example from iterative-refinement.prose:**

```
loop until approved:
  let feedback = session: reviewer
    prompt: "Review this draft and provide feedback"
```

**Question:** How does the orchestrator determine when `approved` becomes true? Is this purely based on natural language interpretation of the last session's output?

<CEO timestamp="2025-12-31 12:33:00">
Okay, this is a great question. And I'm going to throw a small wrench with an idea I just had. Similar to the way we decided to reserve keywords distinct from strings above (what would you call those, references?), I'm wondering if we need a slightly different syntax to "call out to the orchestrator" to let it know that we're sort of "putting the operating ball in his court".

My proposal for that syntax would be to use **classic markdown bolding syntax**. I'm curious what you think of this, or if you'd propose any other options. (I also considered <xmlTags></xmlTags> but I think that would look weird inline and is too verbose).

I'm not sold that this is the right path, but it's a clever idea I had and it would allow us to more easily expand beyond keywords like `approved` without feeling like we're enumerating too many keywords. This syntax clearly delineates the distinction for the model between control flow decisions that it's supposed to "strictly adhere to" and what it's given leeway on to make decisions for itself. You could see this syntax getting used even for longer phrase prompts instead of single words. Given this, we may need to decide on a multi-line syntax for this as well, open to ideas.
</CEO>

---

### 10. Pipeline `filter` Semantics

`loops.md:126-128` shows:

```
items | filter: session "Is {item} relevant?"
```

**Question:** How does the orchestrator interpret yes/no from the session output? Is there guidance on prompt structure for reliable filtering?

<CEO timestamp="2025-12-31 12:34:00">We rely on its intelligence to handle this.</CEO>

---

### 11. Where Do Collection Variables Come From?

Specs show `for item in items:` and `items | map:` but there's no documentation on:

- How to create/initialize collection variables
- What types of collections are supported
- Whether collections can come from session outputs

**Question:** How are variables like `items`, `files`, `changed_files` (shown in examples) populated?

<CEO timestamp="2025-12-31 12:35:00">We rely on its intelligence to handle this. Unless you foresee issues with that?</CEO>

---

### 12. Variable Reassignment

`iterative-refinement.prose:18` shows:

```
let draft = session: writer ...

loop until approved:
  ...
  draft = session: writer ...  # reassignment without `let`
```

**Question:** Is variable reassignment (without `let`) intentionally supported? Should this be documented?

<CEO timestamp="2025-12-31 12:36:00">Yes, I think variable reassignment is fine. Perhaps we should also add `const` (and prefer that) for immutable variable assignment. I'm still anticipating that we'll want to write variable state to files to persist context across a long time. Variables written with `const` for example could be pre-pend the contents of the file with something like "DO NOT CHANGE, THIS IS A CONSTANT UNMODIFIABLE FILE" or something (more effective) along those lines.</CEO>

---

### 13. `choice:` Block Behavior

`composition.md:52-58` defines `choice:` but only says "Orchestrator picks one (depends on intelligent orchestrator decision)".

**Question:** What criteria does the orchestrator use to select a branch? Is this based on:

- Prior context?
- Session prompt content?
- Random selection?
- Something else?

<CEO timestamp="2025-12-31 12:37:00">Can you expand on the context in which you'd see this written out? Ideally we're using the `**` syntax if that's the direction we're going down, and hopefully it's obvious from the context what the Orchestrator is supposed to do. If it's not, then the author can write in a phrase with more detail.</CEO>

---

## Syntax Ambiguities

### 14. Session Declaration Patterns

Multiple conflicting patterns appear across specs and examples:

| Pattern               | Example                               | Source               |
| --------------------- | ------------------------------------- | -------------------- |
| Simple prompt         | `session "Do X"`                      | syntax.md            |
| Named + agent         | `session my-task: researcher`         | agents.md            |
| Agent only            | `session: researcher`                 | examples             |
| Named + inline config | `session synthesizer:\n  model: opus` | parallel-review.prose |
| Implicit agent        | `researcher:` (when agent exists)     | agents.md:67-77      |

**Questions:**

1. Is `session synthesizer:` declaring a session named "synthesizer" OR referencing an agent named "synthesizer"?
2. Can sessions have inline `model:` config without referencing an agent?
3. What's the canonical form for each use case?

<CEO timestamp="2025-12-31 12:38:00">I'd like you to make a recommendation here for the canonical one, and perhaps we should simplify? Either way, my expectation is that on the "expansion" step (part of "compile"), that we standardize it to canonical. Ideally the canonical one is the most verbose, most well-typed, most explicit version, to reduce confusion for the Orchestrator Session who has to interpret it.</CEO>

---

### 15. Reduce Syntax Variants

Two different patterns shown:

```
# Pattern A (loops.md:134-135)
items | reduce(summary, item):
  session "Add {item} to {summary}"

# Pattern B (loops.md:141-142)
items | reduce("") as acc, item:
  session "Append {item} to {acc}"
```

**Question:** Are both valid? When should each be used? What's the difference between `reduce(acc, item)` and `reduce("") as acc, item`?

<CEO timestamp="2025-12-31 12:40:00">I like Pattern A, let's get rid of Pattern B.</CEO>

---

### 16. Implicit Shorthand Disambiguation

`agents.md:79-81` says:

- `agent foo:` = agent definition (keyword present)
- `foo:` = implicit session instantiation (no keyword, `foo` must be a defined agent)

**Potential confusion:** A bare identifier followed by colon (`foo:`) could be:

1. An implicit session instantiation (if `foo` is a defined agent)
2. The start of a property block (like `prompt:`, `context:`)
3. A named block definition (if `block` keyword was forgotten)

**Question:** How does the parser reliably distinguish these cases? Is this ambiguity acceptable?

<CEO timestamp="2025-12-31 12:41:00">No, this ambiguity is not acceptable and we should clean this up a little bit. I'm going to ask you to propose an unambiguous alternative here. Please read through past interviews and existing relevant specs to get a sense of my preferences before proposing a clean unambiguous alternative.</CEO>

---

## Distribution & Framework Questions

### 17. Installation Directory Discrepancy

**Conflict between:**

- `skills.md:103` says skills install to `.opencode/skill/<name>/`
- `runtime.md:17-19` says Claude Code skills go to `.claude/skills/open-prose/`

**Question:** The project claims to be "framework agnostic" but the installation paths are framework-specific. Should there be:

- A unified installation approach?
- Documentation for both paths?
- Auto-detection of framework?

<CEO>Yes, we need some way to dictate whether we're compiling with a build target of OpenCode or Claude Code (or potentially others). Ideally these substantiate minimal differences between the two artifacts, but we will need to know this for the above case for example. Please make a recommendation for that syntax, where it be invoked (likely during the compile step), and what it should do. Once I confirm this we can update the documents.</CEO>

---

### 18. Skill Auto-Loading Asymmetry

Per research findings:

- **Claude Code:** Native `skills` field auto-loads at subagent start
- **OpenCode:** Skills must be loaded via runtime `skill()` tool call

**Question:** The specs say "accept asymmetry for MVP" but should the DSL docs mention this difference? How will OpenProse programs behave differently between frameworks?

<CEO>Yes, we need to document this. This should be injected as a special segment of the system prompt when we've compiled for OpenCode, whereas it should happen automatically for Claude Code. Document this difference somewhere in the appropriate spec.</CEO>

---

## Deferred Features Needing Clarification

### 19. Block Parameters Status

`composition.md:181` lists block parameters as "Deferred" with syntax `block foo(topic):`.

**Question:** If block parameters are deferred, how should users achieve parameterized reusable blocks in MVP? Is string interpolation in prompts the workaround?

<CEO timestamp="2025-12-31 12:43:00">Let's not defer block parameters, since this is actually fairly straightforward to implement now that we're using the intelligent orchestrator. I'm going to ask you to propose a syntax for this, and then we can update the documents.</CEO>

---

### 20. Error Type Properties

`error-handling.md:60-62` shows `{error.message}` but notes "The exact properties available on the error object are TBD."

**Question:** For MVP, what properties are guaranteed on error objects? At minimum:

- `error.message`?
- `error.type`?
- `error.session`? (which session failed)

<CEO timestamp="2025-12-31 12:44:00">This is completely deprecated now with our new thinking about error handling. Remove mentions of this from the specifications. Errors will be given as normal responses back from the subagent sessions, and can be trivially interpreted by the intelligent Orchestrator Session, who will follow the program flow accordingly.</CEO>

---

## Summary

| Category                        | Count  |
| ------------------------------- | ------ |
| Critical Conflicts              | 4      |
| Missing Specifications          | 4      |
| Ambiguous Semantics             | 5      |
| Syntax Ambiguities              | 3      |
| Distribution Questions          | 2      |
| Deferred Feature Clarifications | 2      |
| **Total Open Questions**        | **20** |

---

## Recommended Actions

1. **Immediate:** Resolve the `loom_error` contradiction - update error-handling.md to match orchestrator decision
2. **Immediate:** Standardize import and skills array syntax (quoted vs unquoted)
3. **High Priority:** Document session declaration patterns with clear examples for each variant
4. **High Priority:** Clarify how `loop until` conditions are evaluated
5. **Medium Priority:** Create sessions.md spec consolidating scattered session docs
6. **Medium Priority:** Document undocumented keywords (`throw`, `log`, `context`, time units)
7. **Low Priority:** Clarify deferred features to set MVP expectations
