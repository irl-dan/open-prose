# How to Build OpenProse

We're going to do this process in a sort of iterative loop where we gradually build out the features and we test along the way as we go.

Note that the high level implementation plan will be:

- build the LLM-as-judge harness and test it on something trivial
- - at this stage you'll make sure we can configure a Claude Code session to:
- - - execute a `claude code -p` command
- - - inspect the jsonl logs
- - - judge the behavior along a test rubric
- build the first feature in the iteration loop
- - - test it with the LLM-as-judge harness
- - - if it passes, move on to the next feature
- - - if it fails, fix the issues and re-test
- rinse and repeat for each feature
- - - Stop after three features so I can inspect/review before we build the rest.

---

## The Iteration Loop

For each language feature, we complete these steps in order:

### Step 1: Parser

Build the parser rules to recognize the syntax for this feature.

- Add grammar rules (likely using a parser generator or hand-written recursive descent)
- Handle indentation-based blocks
- Produce an AST node for this feature
- Write unit tests for the parser
- Write integration tests for the parser (to combine various permutations of the feature being used alongside any previously implemented language features)

### Step 2: Validator

Build validation to catch errors at compile time.

- Semantic validation (e.g., referenced agents exist, skills are imported)
- Type checking where applicable
- Helpful error messages with line numbers
- Write unit tests for the validator
- Write integration tests for the validator (to combine various permutations of the feature being used alongside any previously implemented language features)

### Step 3: Compiler (Expansion)

Build the compiler pass that expands this feature to canonical form.

- Syntax sugar expansion
- Normalization to verbose form for Orchestrator consumption
- Generate the expanded program output
- Write unit tests for the compiler
- Write integration tests for the compiler (to combine various permutations of the feature being used alongside any previously implemented language features)

### Step 4: Interpreter Documentation

Update the OpenProse Skill's interpreter documentation.

- Add execution rules for this feature
- Document how the Orchestrator should handle it
- Note that this should not be overly verbose. One of the whole principles of the language is that it should be self-evident to read.
- Write unit tests for the interpreter documentation
- Write integration tests for the interpreter documentation (to combine various permutations of the feature being used alongside any previously implemented language features)

### Step 5: Syntax Highlighting (LSP Semantic Tokens)

Add semantic token highlighting for this feature via LSP.

- Implement semantic token provider using the parser from Step 1
- Mark tokens with appropriate types (keyword, operator, string, comment, agent-name, skill-name, etc.)
- Reuse parser AST to identify token types accurately
- Keywords, operators, strings, comments, and special syntax (`**...**`)
- Write unit tests for the syntax highlighting
- Write integration tests for the syntax highlighting (to combine various permutations of the feature being used alongside any previously implemented language features)

### Step 8: E2E Test (LLM-as-Judge)

Run the feature through the test harness with an LLM judge.

- Create a test program exercising this feature
- Run in Claude Code. OpenCode will be supported later.
- Judge evaluates Orchestrator behavior
- If pass → proceed to next feature
- If fail → fix issues and re-test

---

## LLM-as-Judge Framework

We need to build a test harness that allows us to run an OpenProse program in Claude Code, while we have an LLM-as-judge system (use `claude code -p` with instructions to observe the behavior and the jsonl logs, etc (see `/Users/sl/code/stack/archive/docs-claude-code` and `~/.claude/` directory for outputs)), and judge how well the Orchestrator Session handled that feature according to a rubric we will define. OpenCode will be supported later.

### Test Harness Components

```
test-harness/
├── runner.ts              # Executes .prose programs via claude code -p
├── log-collector.ts       # Collects jsonl logs from ~/.claude/
├── judge.ts               # Invokes LLM judge with logs + rubric
├── rubric.md              # Evaluation criteria
├── test-programs/         # .prose files for each feature
│   ├── tier-00-comments.prose
│   ├── tier-01-simple-session.prose
│   └── ...
└── reports/               # Judge output for each run
```

### The Rubric

Rate the Orchestrator on a Scale of 1 to 5 for each criterion:

| Criterion                 | Description                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Control Flow Accuracy** | Did it accurately follow the program's control flow structure?                                                               |
| **Clarity of Execution**  | Did it ever appear confused or lost about what to do next?                                                                   |
| **Intelligent Judgment**  | Did it make good judgment calls when asked to use its own intelligence to handle context passing, condition evaluation, etc? |
| **Feature Handling**      | Did it accurately handle Feature X (the one we just added) according to the specification?                                   |
| **State Management**      | Did it accurately manage state or lose state at any point?                                                                   |
| **Task Completion**       | Was the system as a whole successful in completing the program's intended task?                                              |
| **Compile Phase**         | Did the compile phase work accurately as expected?                                                                           |
| **Bootup Smoothness**     | Did bootup time go smoothly without errors or confusion?                                                                     |

**Passing threshold:** Average score ≥ 4.0, with no individual criterion below 3.

---

## Features in Order of Complexity

### Tier 0: Infrastructure (Foundation)

These must be built first as they underpin everything else.

| #   | Feature             | Description                                      | Test Program            |
| --- | ------------------- | ------------------------------------------------ | ----------------------- |
| 0.0 | LSP server setup    | Initial LSP server infrastructure (setup once)   | N/A (infra)             |
| 0.1 | File format         | `.prose` extension, UTF-8, spaces for indentation | N/A (infra)             |
| 0.2 | Comments            | `# comment` syntax                               | `tier-00-comments.prose` |
| 0.3 | Single-line strings | `"string"` literals                              | `tier-00-strings.prose`  |

---

### Tier 1: Minimal Viable Program

The simplest possible OpenProse program that does something.

| #   | Feature           | Description                    | Test Program                  |
| --- | ----------------- | ------------------------------ | ----------------------------- |
| 1.1 | Simple session    | `session "prompt"`             | `tier-01-simple-session.prose` |
| 1.2 | Implicit sequence | Multiple sessions run in order | `tier-01-sequence.prose`       |

**Milestone:** Can run `session "Hello world"` and have Orchestrator spawn one subagent.

---

### Tier 2: Agents

Agent templates for reusable session configuration.

| #   | Feature                   | Description                               | Test Program                  |
| --- | ------------------------- | ----------------------------------------- | ----------------------------- |
| 2.1 | Agent definition          | `agent name:` with empty body             | `tier-02-agent-basic.prose`    |
| 2.2 | Agent model               | `model: sonnet/opus/haiku`                | `tier-02-agent-model.prose`    |
| 2.3 | Agent prompt              | `prompt: "..."` system prompt addition    | `tier-02-agent-prompt.prose`   |
| 2.4 | Session with agent        | `session: agent` or `session name: agent` | `tier-02-session-agent.prose`  |
| 2.5 | Session prompt property   | `session: agent` + `prompt: "..."`        | `tier-02-session-prompt.prose` |
| 2.6 | Session property override | Override agent's model in session         | `tier-02-override.prose`       |

**Milestone:** Can define agents and use them in sessions with overrides.

---

### Tier 3: Skills & Imports

External skill loading and assignment.

| #   | Feature            | Description                              | Test Program                |
| --- | ------------------ | ---------------------------------------- | --------------------------- |
| 3.1 | Import statement   | `import "skill" from "source"`           | `tier-03-import.prose`       |
| 3.2 | Agent skills       | `skills: ["skill1", "skill2"]`           | `tier-03-agent-skills.prose` |
| 3.3 | Agent permissions  | `permissions:` block                     | `tier-03-permissions.prose`  |
| 3.4 | Skill installation | `open-prose install` clones and validates | `tier-03-install.prose`      |

**Milestone:** Can import external skills and assign them to agents.

---

### Tier 4: Variables & Context

Variable binding and explicit context passing.

| #   | Feature                     | Description                             | Test Program                     |
| --- | --------------------------- | --------------------------------------- | -------------------------------- |
| 4.1 | let binding                 | `let x = session "..."`                 | `tier-04-let.prose`               |
| 4.2 | const binding               | `const x = session "..."`               | `tier-04-const.prose`             |
| 4.3 | Variable reassignment       | `x = session "..."` (for let)           | `tier-04-reassign.prose`          |
| 4.4 | Implicit context            | Predecessor output passes automatically | `tier-04-implicit-context.prose`  |
| 4.5 | Explicit context (single)   | `context: varname`                      | `tier-04-explicit-single.prose`   |
| 4.6 | Explicit context (multiple) | `context: [a, b, c]`                    | `tier-04-explicit-multiple.prose` |

**Milestone:** Can bind session results to variables and pass context explicitly.

---

### Tier 5: Composition Blocks

Structuring programs with blocks.

| #   | Feature          | Description                  | Test Program               |
| --- | ---------------- | ---------------------------- | -------------------------- |
| 5.1 | do: block        | Explicit sequential block    | `tier-05-do-block.prose`    |
| 5.2 | Inline sequence  | `session "A" -> session "B"` | `tier-05-arrow.prose`       |
| 5.3 | Named blocks     | `block name:` definition     | `tier-05-named-block.prose` |
| 5.4 | Block invocation | `do block-name`              | `tier-05-invoke.prose`      |
| 5.5 | Nested blocks    | Blocks containing blocks     | `tier-05-nested.prose`      |

**Milestone:** Can organize code into reusable named blocks.

---

### Tier 6: Parallel (Basic)

Concurrent execution of sessions.

| #   | Feature                | Description                             | Test Program                  |
| --- | ---------------------- | --------------------------------------- | ----------------------------- |
| 6.1 | parallel: block        | Run children concurrently, wait for all | `tier-06-parallel-basic.prose` |
| 6.2 | Named parallel results | `x = session "..."` in parallel         | `tier-06-named-results.prose`  |
| 6.3 | Object context         | `context: { a, b }`                     | `tier-06-object-context.prose` |
| 6.4 | Parallel + sequential  | Parallel inside do, do inside parallel  | `tier-06-mixed.prose`          |

**Milestone:** Can run sessions in parallel and collect named results.

---

### Tier 7: Parallel (Advanced)

Join strategies and failure policies.

| #   | Feature                 | Description                      | Test Program              |
| --- | ----------------------- | -------------------------------- | ------------------------- |
| 7.1 | parallel ("first")      | First to complete wins (race)    | `tier-07-first.prose`      |
| 7.2 | parallel ("any")        | First success wins               | `tier-07-any.prose`        |
| 7.3 | parallel ("regardless") | All complete, ignore failures    | `tier-07-regardless.prose` |
| 7.4 | on-fail: "continue"     | Let all complete, collect errors | `tier-07-continue.prose`   |
| 7.5 | on-fail: "ignore"       | Silently ignore failures         | `tier-07-ignore.prose`     |

**Milestone:** Full parallel execution with all join strategies and failure policies.

---

### Tier 8: Loops (Fixed)

Bounded iteration constructs.

| #   | Feature               | Description               | Test Program                |
| --- | --------------------- | ------------------------- | --------------------------- |
| 8.1 | repeat N:             | Fixed iteration count     | `tier-08-repeat.prose`       |
| 8.2 | repeat N as i:        | With index variable       | `tier-08-repeat-index.prose` |
| 8.3 | for item in items:    | For-each over collection  | `tier-08-for-each.prose`     |
| 8.4 | for item, i in items: | For-each with index       | `tier-08-for-index.prose`    |
| 8.5 | parallel for:         | Fan-out parallel for-each | `tier-08-parallel-for.prose` |

**Milestone:** Can iterate over collections and repeat operations.

---

### Tier 9: Loops (Unbounded)

Orchestrator-evaluated loop conditions using `**...**` discretion syntax.

| #   | Feature                      | Description                         | Test Program                  |
| --- | ---------------------------- | ----------------------------------- | ----------------------------- |
| 9.1 | loop:                        | Infinite loop (with safeguards)     | `tier-09-infinite.prose`       |
| 9.2 | loop as i:                   | Infinite with counter               | `tier-09-infinite-index.prose` |
| 9.3 | loop until **condition**:    | Orchestrator-evaluated condition    | `tier-09-until.prose`          |
| 9.4 | loop while **condition**:    | Orchestrator-evaluated condition    | `tier-09-while.prose`          |
| 9.5 | Multi-word conditions        | `loop until **user is satisfied**:` | `tier-09-multiword.prose`      |
| 9.6 | Triple-asterisk (multi-line) | `loop until ***...***:`             | `tier-09-multiline.prose`      |

**Milestone:** Orchestrator can evaluate semantic conditions using `**...**` syntax to terminate loops.

---

### Tier 10: Pipeline Operations

Functional-style collection transformations.

| #    | Feature  | Description                             | Test Program          |
| ---- | -------- | --------------------------------------- | --------------------- |
| 10.1 | map      | `items \| map: session "..."`           | `tier-10-map.prose`    |
| 10.2 | filter   | `items \| filter: session "..."`        | `tier-10-filter.prose` |
| 10.3 | reduce   | `items \| reduce(acc, item): ...`       | `tier-10-reduce.prose` |
| 10.4 | pmap     | Parallel map                            | `tier-10-pmap.prose`   |
| 10.5 | Chaining | `\| filter: ... \| map: ... \| reduce:` | `tier-10-chain.prose`  |

**Milestone:** Can transform collections with pipeline operators.

---

### Tier 11: Error Handling

Try/catch and retry mechanisms.

| #    | Feature            | Description                             | Test Program                |
| ---- | ------------------ | --------------------------------------- | --------------------------- |
| 11.1 | try/catch          | Basic error handling                    | `tier-11-try-catch.prose`    |
| 11.2 | try/catch/finally  | With cleanup                            | `tier-11-finally.prose`      |
| 11.3 | Nested try/catch   | Inner catches don't trigger outer       | `tier-11-nested.prose`       |
| 11.4 | throw              | Rethrow to outer handler                | `tier-11-throw.prose`        |
| 11.5 | retry              | `session "..." (retry: 3)`              | `tier-11-retry.prose`        |
| 11.6 | retry with backoff | `(retry: 3, backoff: "exponential")`    | `tier-11-backoff.prose`      |
| 11.7 | Try in parallel    | Error handling inside parallel branches | `tier-11-parallel-try.prose` |

**Milestone:** Robust error handling and retry capabilities.

---

### Tier 12: Advanced Features

Higher-complexity language features.

| #    | Feature                    | Description                                             | Test Program                 |
| ---- | -------------------------- | ------------------------------------------------------- | ---------------------------- |
| 12.1 | Multi-line strings         | `"""..."""` syntax                                      | `tier-12-multiline.prose`     |
| 12.2 | String interpolation       | `"Process {item}"`                                      | `tier-12-interpolation.prose` |
| 12.3 | Block parameters           | `block name(param):`                                    | `tier-12-block-params.prose`  |
| 12.4 | Block invocation with args | `do name("arg")`                                        | `tier-12-block-args.prose`    |
| 12.5 | choice **criteria**:       | Orchestrator-selected branch using `**...**` discretion | `tier-12-choice.prose`        |
| 12.6 | if/else                    | Conditional branching                                   | `tier-12-if-else.prose`       |

**Milestone:** Full language feature set complete.

---

### Tier 13: Polish & Platform

Final polish and cross-platform support.

| #    | Feature              | Description                              | Test Program                  |
| ---- | -------------------- | ---------------------------------------- | ----------------------------- |
| 13.1 | LSP server setup     | Language Server Protocol implementation  | N/A (tooling)                 |
| 13.2 | Full validation pass | All semantic checks                      | All tier tests                |
| 13.3 | Canonical expansion  | Complete syntax sugar expansion          | All tier tests                |
| 13.4 | OpenCode support     | Skill-loading workaround, parity         | Not applicable yet (OpenCode) |
| 13.5 | CLI polish           | `open-prose run/compile/install/validate` | N/A (tooling)                 |

**Milestone:** Production-ready for Claude Code. OpenCode will be supported later.

---

## Feature Dependency Graph

```
Tier 0 (Infrastructure)
    │
    ▼
Tier 1 (Minimal Program)
    │
    ├──────────────────────┐
    ▼                      ▼
Tier 2 (Agents)        Tier 4 (Variables)
    │                      │
    ▼                      │
Tier 3 (Skills)            │
    │                      │
    └──────────┬───────────┘
               ▼
         Tier 5 (Composition)
               │
               ▼
         Tier 6 (Parallel Basic)
               │
               ▼
         Tier 7 (Parallel Advanced)
               │
    ┌──────────┴──────────┐
    ▼                     ▼
Tier 8 (Loops Fixed)  Tier 11 (Error Handling)
    │                     │
    ▼                     │
Tier 9 (Loops Unbounded)  │
    │                     │
    ▼                     │
Tier 10 (Pipeline)        │
    │                     │
    └──────────┬──────────┘
               ▼
         Tier 12 (Advanced)
               │
               ▼
         Tier 13 (Polish)
```

---

## Combinatorial Testing

As more language features are added, we want to add tests that test various permutations of the features being used together.

### Combination Test Matrix (Examples)

| Test | Features Combined                | Program                            |
| ---- | -------------------------------- | ---------------------------------- |
| C1   | parallel + named blocks          | `combo-parallel-blocks.prose`       |
| C2   | loop until + parallel            | `combo-loop-parallel.prose`         |
| C3   | try/catch + loop                 | `combo-try-loop.prose`              |
| C4   | pipeline + block params          | `combo-pipeline-params.prose`       |
| C5   | nested parallel + error handling | `combo-nested-parallel-error.prose` |
| C6   | Full kitchen sink                | `combo-kitchen-sink.prose`          |

---

## Classical Unit Tests

For deterministic components, we add classical unit tests:

### Parser Tests

- Valid syntax → correct AST
- Invalid syntax → helpful error message
- Edge cases (empty blocks, deeply nested, etc.)

### Validator Tests

- Undefined agent reference → error
- Undefined skill reference → error
- Duplicate agent names → error
- Valid program → no errors

### Compiler Tests

- Syntax sugar expansion correct
- Canonical form generation correct
- Import resolution correct

### LSP Semantic Tokens Tests

- All keywords highlighted correctly
- Strings vs identifiers distinguished
- Comments grayed out
- Agent names, skill names, and variables highlighted semantically
- Special syntax (`**...**`) highlighted correctly
- Nested structures handled

---

## Success Criteria

The language is complete when:

1. ✅ All Tier 0-13 features implemented
2. ✅ All tier test programs pass LLM-as-judge (≥4.0 average)
3. ✅ All combinatorial tests pass
4. ✅ Classical unit tests have >90% coverage
5. ✅ Works on Claude Code. OpenCode will be supported later.
6. ✅ LSP semantic tokens provide accurate syntax highlighting in VS Code
7. ✅ CLI is polished and documented
8. ✅ Example programs demonstrate real-world usage
