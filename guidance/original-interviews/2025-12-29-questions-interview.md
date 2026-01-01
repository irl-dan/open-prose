# OpenProse: Questions for Alignment

NOTE: This is an interview conducted by the head of product-engineering with the CEO. All answers should be taken as source of truth for the rest of the project, unless further revised inline here.

This document captures questions to ensure our mental models converge before implementation. Based on my review of:

- OpenCode server documentation (API, sessions, agents, skills, tools)
- Loom DSL (full language with agents, flows, type contracts, codegen)
- Stack orchestration plugin (frame-based context management for OpenCode)

---

## 1. Core Primitives

### Sessions

1. **Session Identity**: In the OpenCode API, sessions have IDs, titles, and parent relationships. How should Sessions in this DSL map to OpenCode sessions?

   - One-to-one mapping (each DSL Session = one OpenCode session)?
   - Logical grouping (one DSL Session might spawn multiple OpenCode sessions)?

<CEO timestamp="2025-12-29 10:31:00">To keep this simple, it should be one-to-one. The language should support logical groupings by letting the language author express this somehow as groups of Sessions.</CEO>

2. **Session Configuration**: OpenCode sessions can specify agents, models, and permissions. Should the DSL expose:

   - Agent selection (e.g., `session(agent: "build")` vs `session(agent: "plan")`)?
   - Model/tier selection (Haiku/Sonnet/Opus)?
   - Permission overrides?

<CEO timestamp="2025-12-29 10:32:00">Yes. I think this being 1:1 is ideal.</CEO>

3. **Session State**: OpenCode sessions maintain message history and todos. Should the DSL:

   - Treat sessions as stateless functions (call → get result)?
   - Allow stateful multi-turn interactions within a session?
   - Both, with different primitives?

<CEO timestamp="2025-12-29 10:33:00">All sessions will be stateful multi-turn interactions. The expectation however is that the intra-state is not necessary or revealed at the DSL level, the DSL is dealing with the inputs and outputs. This may change of course if we want to expose some insight into the session, but for now let's keep it simple.</CEO>

4. **Session Lifecycle**: When does a session "end"?
   - After a single prompt/response cycle?
   - When explicitly closed?
   - When the orchestrator decides it's complete?

<CEO timestamp="2025-12-29 10:34:00">This is where it gets interesting. I think our framework will need to expose some sort of tool call interface to the agent itself to trigger "complete". That or it already exists and we can take advantage of it somehow. This is something worth researching more. Could we take advantage of hooks? It would be nice, though slightly more complex, to allow the session trigger _either_ a "return" or an "error" (ie similar to how an object oriented function may return a value or throw an exception.) Research how we'd accomplish this, because this would be quite powerful.</CEO>

### Skills

5. **Skill Loading**: OpenCode loads skills on-demand via the `skill` tool. In this DSL:

   - Are skills pre-declared at the program level?
   - Attached to specific sessions?
   - Loaded dynamically during execution?

<CEO timestamp="2025-12-29 10:35:00">I imagine that skills are: - referenced by string names - installed separately, perhaps using some sort of "import" syntax at the top of the file (research how skills are shared/declared) - assigned to specific sessions - can be composed into an "agent" (think of this as a session template) which can be instantiated as one session. - ie an "agent" is an optional bundle of skills, model, permissions that can be re-referenced in more than one session.</CEO>

6. **Skill as Primitive**: You mentioned Skills as a top-level primitive. What distinguishes a Skill from a Session with a specific task?

   - Is a Skill reusable domain knowledge injected into sessions?
   - Is a Skill a pre-packaged prompt/behavior?
   - Can Skills be "called" directly, or only attached to Sessions?

<CEO timestamp="2025-12-29 10:36:00">
You should research the answer to this question, because there is already a standard for doing this: - https://opencode.ai/docs/skills/ - https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview</CEO>

7. **Skill Discovery**: Should the DSL reference skills by:
   - Name only (e.g., `skill: "git-release"`)?
   - Path (e.g., `skill: ".opencode/skill/git-release"`)?
   - Inline definition?

<CEO timestamp="2025-12-29 10:37:00">This is answered above: referenced by string once it's been imported. Perhaps referenced by path github repo inline as well.</CEO>

---

## 2. Wiring: Output to Input

<CEO timestamp="2025-12-29 10:38:00">I want to think harder about this section before committing to anything. I want to not walk through any one-way doors here. Critically: we're going to want a way to handle intelligent context passing. We don't want the full output getting passed to the next input. But I still don't know the best way to accomplish that yet. Let's punt on these questions for now. I'd love you to do a little further research and ideation on these questions, thinking through the central challenges of agent design.</CEO>

8. **Data Flow Model**: How explicit should data flow be?

   - Loom uses `agent <- context` for explicit passing
   - Should this DSL have similar explicit wiring?
   - Or implicit "pipe the output to the next input"?

9. **Output Shape**: OpenCode session responses include messages with multiple parts (text, diffs, tool results). When wiring output to input:

   - Pass the full response object?
   - Extract specific parts (e.g., just the text)?
   - Transform/map before passing?

10. **Partial Output**: Should sessions be able to produce multiple outputs that wire to different downstream sessions?

    - Single output → single downstream?
    - Named outputs (e.g., `session.code`, `session.tests`)?
    - Array output that fans out?

11. **Context Accumulation**: When A → B → C, does C receive:
    - Only B's output?
    - B's output plus A's output?
    - The entire chain's context?

---

## 3. Composition

12. **Blocks**: You mentioned "blocks of sessions." What defines a block?

    - Lexical grouping (indentation, braces)?
    - Named sub-flows?
    - Anonymous inline compositions?

<CEO timestamp="2025-12-29 10:39:00">I want you to write some example files out in a new directory to show how different ideas might look. I do think we want to support anonymous inline composition, but also named and reused.</CEO>

13. **Reusability**: Can blocks be:

    - Named and reused?
    - Parameterized (like functions)?
    - Imported from other files?

<CEO timestamp="2025-12-29 10:40:00">Parameterization is an interesting question. I do think we want something like this, though I'm not sure how that would look yet. I don't want to introduce this until there are many concrete use cases for it, since that's how I want to approach this. Not yet imported from other files, but eventually we'll want this.</CEO>

14. **Nesting Depth**: Is there a limit to composition nesting?
    - Flat (sessions and one level of blocks)?
    - Arbitrary nesting?
    - Practical limit (like Loom's 5-level recursion cap)?

<CEO timestamp="2025-12-29 10:41:00">No limit to depth. Arbitrary nesting.</CEO>

---

## 4. Loops

15. **Loop Semantics**: For "loop over sessions or blocks," what are the loop constructs?

    - Iterate over a collection (for-each)?
    - Repeat N times?
    - Repeat until condition?
    - All of the above?

16. **Loop Bounds**: Loom requires all loops to have explicit bounds (`converge (max 10)`). Should this DSL:

    - Require explicit bounds (safety)?
    - Allow unbounded with timeout?
    - Rely on the orchestrator to detect and break infinite loops?

<CEO timestamp="2025-12-29 10:42:00">We should not require explicit bounds, because we want to support a construct like this: "while (true)".</CEO>

17. **Loop State**: In a loop, does each iteration:

    - Start fresh?
    - Carry forward state from previous iteration?
    - Accumulate results?

<CEO timestamp="2025-12-29 10:43:00">Let's wait for specific use cases to make a call here.</CEO>

18. **Early Exit**: How does a loop terminate early?
    - Explicit `break` or `done`?
    - Return value from session signals completion?
    - Orchestrator decides based on output analysis?

<CEO timestamp="2025-12-29 10:44:00">Let's wait for specific use cases to make a call here.</CEO>

---

## 5. Serial vs Parallel Execution

19. **Parallel Syntax**: How should parallel execution be expressed?

    - Explicit keyword (e.g., `parallel { ... }`)?
    - Syntax sugar (e.g., `[A, B, C]` runs in parallel)?
    - Based on dependency analysis (implicit parallelism)?

<CEO timestamp="2025-12-29 10:45:00">I want you to write some example files out in a new directory to show how different ideas might look.</CEO>

20. **Parallel Join**: When parallel branches complete:

    - Wait for all (Promise.all)?
    - Wait for first (Promise.race)?
    - Configurable per-block?

<CEO timestamp="2025-12-29 10:46:00">I think we'll want to support both. Sensible default is "all". Is there a third? Syntax for this should be colloquial. Suggest a few options.</CEO>

21. **Parallel Failure**: If one parallel branch fails:

    - Fail fast (cancel others)?
    - Continue and collect results?
    - Configurable failure policy?

<CEO timestamp="2025-12-29 10:47:00">Configurable, sensible default is "Fail fast". Syntax for this should be colloquial. Suggest a few options.</CEO>

22. **Resource Limits**: Should parallel execution have limits?
    - Max concurrent sessions?
    - Token/cost budget?
    - Time budget?

<CEO timestamp="2025-12-29 10:48:00">No limits for now.</CEO>

---

## 6. The Orchestrator Agent

23. **Orchestrator Role**: You said the DSL "translates to a system prompt in an Orchestrator Agent." Is the orchestrator:

    - A specialized OpenCode agent that interprets the DSL at runtime?
    - A meta-agent that spawns and manages other sessions?
    - Both interpreter and coordinator?

<CEO timestamp="2025-12-29 10:49:00">This is the part I want to spend more time thinking through. I want to design this after a traditional IOC container (think Spring, NestJS, etc.). In this pattern I foresee some sort of interpreter step which is likely static, runs things like installing the skills, etc.</CEO>

<CEO timestamp="2025-12-29 10:50:00">From there we're left with a choice: use a static container or use an "intelligent container". Critically, we want to design this according to best classical principles and these are what I want to explore with you. I want you to push back on where you think this is poor design and hear out my ideas. Then we'll decide together.</CEO>

24. **Orchestrator Model**: What model/tier runs the orchestrator?

    - Always a capable model (Sonnet/Opus) for reasoning?
    - Configurable?
    - Adaptive based on complexity?

<CEO timestamp="2025-12-29 10:51:00">Let's start with the most capable one (opus 4.5)</CEO>

25. **Orchestrator Authority**: What can the orchestrator decide autonomously?

    - Route to different branches based on output?
    - Retry failed sessions?
    - Adjust the plan mid-execution?
    - All of the above?

<CEO timestamp="2025-12-29 10:52:00">This is part of what I want to discuss. I don't think it should modify the plan mid-execution. I think it should primarily be responsible for the control flow, context passing, etc. There's one view in which this is primarily a context-manager, responsible for bringing out the "intended behavior" of the session flow by managing the right inputs from prior outputs. However, I'm not sure about this. Lots to discuss here.</CEO>

26. **Orchestrator Visibility**: Should the DSL execution be:

    - Transparent (user sees orchestrator's reasoning)?
    - Opaque (user only sees final results)?
    - Configurable verbosity?

<CEO timestamp="2025-12-29 10:53:00">Transparent. There's some world in which this is ideally interactive, where the user can intervene. We need to figure out how to accomplish that. We shouldn't implement interactivity yet. But notably that might come for free if we're just using an OpenCode CLI to run the outer orchestrator.</CEO>

27. **Orchestrator Context**: How much of the DSL program does the orchestrator see?
    - The full program structure?
    - Only the current execution point?
    - Enough to make intelligent routing decisions?

<CEO timestamp="2025-12-29 10:54:00">The orchestrator should be given the full program, ideally in the system prompt. This orients the orchestrator. I don't expect these programs to be too long to handle, at least not initially.</CEO>

---

## 7. Inversion of Control

28. **IoC Metaphor**: In traditional IoC, the container manages object lifecycles. Here:

    - What is the "object" being managed (sessions, skills, data)?
    - What lifecycle events exist (create, run, complete, fail)?
    - How does the container (orchestrator) intercede?

<CEO timestamp="2025-12-29 10:55:00">IoC might be a stretch of an analogy, so don't overindex on it. But here, yes, my expectation is that the Session are the primary objects being managed, through create, run, complete, fail lifecycle. My expectation is that the container is passing context between sessions and kicking them off as needed.</CEO>

29. **Declarative vs Imperative**: The DSL is declarative, but execution has imperative aspects. Where's the boundary?

    - DSL declares the "what," orchestrator decides "how"?
    - DSL declares structure, orchestrator fills in gaps?
    - DSL is pure specification, orchestrator is pure execution?

<CEO timestamp="2025-12-29 10:56:00">Execution has imperative aspects, and some imperative language might leak into the DSL. I'm curious what you see as the distinction in the above questions.</CEO>

30. **Dynamic Adaptation**: Can the orchestrator deviate from the declared program?
    - Strict adherence to DSL structure?
    - Allowed to reorder/skip/retry within bounds?
    - Full autonomy with DSL as "guidance"?

<CEO timestamp="2025-12-29 10:57:00">We're aiming for strict adherence to the DSL structure within whatever the language guidelines are on "operating it intelligently".</CEO>

---

## 8. Error Handling

31. **Failure Model**: What happens when a session fails?

    - Propagate up (fail the whole program)?
    - Catch and handle (Loom's `on-fail` pattern)?
    - Retry automatically?

<CEO timestamp="2025-12-29 10:58:00">Sensible default for a failed session should be to throw. We should enable try/catch/finally patterns in the DSL. We should make it easy to declare in the DSL that a given session should retry with backoff (ie up to 3x or 5x or whatever).</CEO>

32. **Failure Definition**: What constitutes "failure"?

    - OpenCode session error/abort?
    - Session output indicates failure?
    - Orchestrator determines failure semantically?

<CEO timestamp="2025-12-29 10:59:00">Hopefully we've figured out how the Session can trigger the failure. I think there's a world in which we want the Orchestrator to examine the output and also trigger a failure, but let's not worry about this yet.</CEO>

33. **Recovery Strategies**: Should the DSL support:
    - Fallback sessions?
    - Retry with modified context?
    - Human intervention points?

<CEO timestamp="2025-12-29 11:00:00">Let's punt on these questions, we'll probably want these eventually, but not yet.</CEO>

---

## 9. Syntax and Style

34. **Syntax Inspiration**: You want "clean, easy, self-evident." Which style resonates?

    - Loom-like (indentation-based, `<-` operators)?
    - YAML-like (declarative, nested)?
    - Lisp-like (minimal, composable)?
    - Something novel?

<CEO timestamp="2025-12-29 11:01:00">Can we explore Lisp-like? I'd like you to propose a few different versions of different language features in a directory, as I already mentioned.</CEO>

35. **Minimal Viable Syntax**: What's the simplest program in this DSL?

    - A single session with a prompt?
    - A skill invocation?
    - Something else?

<CEO timestamp="2025-12-29 11:02:00">A single session.</CEO>

36. **Verbosity Trade-offs**: Explicit vs implicit:

    - More explicit = more verbose but clearer?
    - More implicit = concise but magical?
    - Where should the balance be?

<CEO timestamp="2025-12-29 11:03:00">We want to balance, use your judgement. Something like typescript with type inference is a decent balance for example. Strongly typed, but not overkill where redundant.</CEO>

37. **Naming Conventions**: Should primitives be called:
    - Sessions, Agents, Tasks, Steps?
    - Skills, Capabilities, Tools?
    - Something domain-specific?

<CEO timestamp="2025-12-29 11:04:00">
Session: the thing that runs at runtime
Agent: a bundle of skills, model, permissions that can be re-used throughout the instructions in multiple Sessions.
Skill: a file injected into the session that gives it interesting instructions/behaviors/capabilities
</CEO>

    What other primatives need naming?

---

## 10. Relationship to Existing Systems

38. **Loom Features to Keep**: From the full Loom DSL, which features transfer to this simpler version?

    - Context passing (`<-`)?
    - Type contracts (receives/returns)?
    - Tier selection (fast/careful/best)?
    - Capabilities/tools declarations?

<CEO timestamp="2025-12-29 11:05:00">I don't want you to index too heavily on the existing Loom language. This is something new.</CEO>

39. **Loom Features to Drop**: What complexity should be shed?

    - Full type system?
    - Code generation?
    - Transformation operators?

<CEO timestamp="2025-12-29 11:06:00">I don't want you to index too heavily on the existing Loom language. This is something new.</CEO>

40. **Stack Integration**: The Stack plugin manages frame-based context. Should this DSL:

    - Integrate with Stack (sessions = frames)?
    - Replace Stack entirely?
    - Operate independently?

<CEO timestamp="2025-12-29 11:07:00">Operate independently. The stack plugin was a throwaway attempt at something that is different, we don't want to rely on this plugin being present, and we don't want to particularly model our system off this one.</CEO>

41. **OpenCode API Usage**: Which OpenCode API patterns are central?
    - Session creation/messaging (`POST /session/:id/message`)?
    - Async prompting (`POST /session/:id/prompt_async`)?
    - Subagent/child sessions?

<CEO timestamp="2025-12-29 11:08:00">Yes, we're absolutely going to need to familiarize ourselves with the OpenCode API (`/Users/sl/code/opencode/packages/web/src/content/docs`) and take advantage of the relevant constructs. I'll let you determine which patterns are central based on everything else.</CEO>

---

## 11. Runtime Behavior

42. **Execution Entry Point**: How is a DSL program started?

    - CLI command with DSL file?
    - API call with DSL string?
    - Embedded in a larger system?

<CEO timestamp="2025-12-29 11:09:00">Let's start with a CLI and we can always build out from there. The OpenCode server should be running separately of course and should require no modifications. I _think_ we want to run this as an OpenCode CLI that is using one session (normally, except with our system prompt injected) which itself has access to the specific OpenCode Tool Calls required to do our management. We may want to wrap these API calls with tool call functions that give us more control over it. In that case, we'd need a plugin.</CEO>

43. **Execution Progress**: How is progress communicated?

    - Streaming output as sessions complete?
    - Events/callbacks?
    - Final result only?

<CEO timestamp="2025-12-29 11:10:00">I need you to research this from the OpenCode docs (`/Users/sl/code/opencode/packages/web/src/content/docs`). How is session output typically communicated back from the client?</CEO>

44. **Execution Persistence**: If execution is interrupted:

    - Resume from checkpoint?
    - Start over?
    - Depends on configuration?

<CEO timestamp="2025-12-29 11:11:00">The good part about this running in its own agent/session is that we can resume from where it stopped.</CEO>

45. **Execution Isolation**: Does each DSL program run:
    - In its own OpenCode server instance?
    - Sharing a server with isolation?
    - Fully shared context?

<CEO timestamp="2025-12-29 11:12:00">Let's punt on this. Let's assume one per server at any given time.</CEO>

---

## 12. Scope and Boundaries

46. **MVP Scope**: For the initial version, what's in scope?

    - Just Sessions wired together?
    - Sessions + Skills?
    - Basic parallel execution?
    - Loops?

<CEO timestamp="2025-12-29 11:13:00">We want to start this in a way that lets us prove out the proof of concept and layer features/complexity on as we go.</CEO>

47. **Non-Goals**: What should explicitly NOT be in this DSL?

    - Full type system?
    - Code generation to TypeScript?
    - Visual builder?

<CEO timestamp="2025-12-29 11:14:00">Yes all three of these should not be in here.</CEO>

48. **Extension Model**: How might the DSL grow?
    - Plugin system for new primitives?
    - User-defined session types?
    - Custom orchestrators?

<CEO timestamp="2025-12-29 11:15:00">Punt.</CEO>

---

## 13. Concrete Scenarios

49. **Scenario 1 - Simple Pipeline**: "Research a topic, then write an article based on research."

    - How would this be expressed?
    - What wiring is needed?

<CEO timestamp="2025-12-29 11:16:00">Propose something.</CEO>

50. **Scenario 2 - Parallel Review**: "Have three reviewers analyze code in parallel, then synthesize their feedback."

    - How is parallelism expressed?
    - How are results combined?

<CEO timestamp="2025-12-29 11:17:00">Propose something.</CEO>

51. **Scenario 3 - Iterative Refinement**: "Write draft, get feedback, refine until approved."

    - How is the loop expressed?
    - How is "approved" detected?

<CEO timestamp="2025-12-29 11:18:00">Propose something.</CEO>

52. **Scenario 4 - Conditional Routing**: "Classify a request, then route to the appropriate specialist."
    - How is conditional logic expressed?
    - Does the orchestrator handle this, or is it in the DSL?

<CEO timestamp="2025-12-29 11:19:00">Propose something.</CEO>

---

## 14. Meta Questions

53. **Target Users**: Who writes programs in this DSL?

    - Developers building AI workflows?
    - AI models generating orchestration plans?
    - Both?

<CEO timestamp="2025-12-29 11:20:00">Both.</CEO>

54. **Learning Curve**: How quickly should someone understand a program?

    - Immediately readable by anyone?
    - Requires 5-minute tutorial?
    - Requires understanding of underlying systems?

<CEO timestamp="2025-12-29 11:21:00">Easily readable by a programmer familiar with Typescript, but may require some tutorial.</CEO>

55. **Debugging Story**: When things go wrong:

    - How are errors surfaced?
    - Can you step through execution?
    - What observability exists?

<CEO timestamp="2025-12-29 11:22:00">We should bake in default-on telemetry/logging from the start so we can iterate.</CEO>

56. **Versioning**: As the DSL evolves:
    - Backward compatibility guarantees?
    - Migration tooling?
    - Version in the DSL syntax?

<CEO timestamp="2025-12-29 11:23:00">We DO NOT want to try to maintain backward compatibility or any type of consistency until after v1.0.0 is released, we're currently iterating on this pre-production and we want to just roll forward.</CEO>

---

## Next Steps

Please review these questions and provide answers or clarifications. Your responses will help ensure we're building toward the same vision before any implementation begins.
