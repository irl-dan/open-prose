# Handoff: Implement Tier 11 (Error Handling)

## Project Overview

OpenProse is a domain-specific language for orchestrating AI agent sessions. It's distributed as a Claude Code plugin. The language is being built incrementally with an LLM-as-judge test harness.

## Current Status

**Implemented (Tier 0 through Tier 10):**
- Comments (`# comment`)
- Single-line strings (`"string"` with escapes)
- Simple session (`session "prompt"`)
- Implicit sequence (multiple sessions run in order)
- Agent definitions (`agent name:` with `model:` and `prompt:` properties)
- Session with agent (`session: agentName`)
- Session property overrides (override agent's model/prompt in session)
- Import statements (`import "skill" from "source"`)
- Agent skills (`skills: ["skill1", "skill2"]`)
- Agent permissions (`permissions:` block with read/write/bash/network rules)
- Let binding (`let name = session "..."`)
- Const binding (`const name = session "..."`)
- Variable reassignment (`name = session "..."` for let only)
- Context property (`context: var` or `context: [a, b, c]` or `context: []`)
- do: blocks (`do:` with indented body)
- Inline sequence (`session "A" -> session "B"`)
- Named blocks (`block name:` with `do name` invocation)
- Parallel blocks (`parallel:` for concurrent execution)
- Named parallel results (`x = session "..."` inside parallel)
- Object context (`context: { a, b, c }` shorthand)
- Join strategies (`parallel ("first"):`, `parallel ("any", count: N):`)
- Failure policies (`parallel (on-fail: "continue"):`, `parallel (on-fail: "ignore"):`)
- Repeat blocks (`repeat N:` and `repeat N as i:`)
- For-each blocks (`for item in items:` and `for item, i in items:`)
- Parallel for-each (`parallel for item in items:`)
- Unbounded loops (`loop:`, `loop until **condition**:`, `loop while **condition**:`)
- Loop with max iterations (`loop (max: N):`)
- Loop with iteration variable (`loop as i:`, `loop until **done** as i:`)
- **Pipeline operations** (`items | map:`, `items | filter:`, `items | reduce(acc, item):`, `items | pmap:`)
- **Pipeline chaining** (`| filter: ... | map: ... | reduce: ...`)

**All tests passing:**
- 644 unit tests in `plugin/`
- E2E tests in `test-harness/` (including 5 Tier 10 tests, all passing with 4.95/5.0 avg)

## Files to Read First

Read these files in order to understand the project:

1. **`README.md`** - Project overview and structure
2. **`BUILD_PLAN.md`** - Development roadmap and feature checklist
3. **`plugin/skills/open-prose/prose.md`** - Current DSL reference (comprehensive)
4. **`plugin/src/parser/ast.ts`** - Current AST node definitions
5. **`plugin/src/__tests__/pipeline.test.ts`** - Tier 10 tests (good template for test structure)

## Your Task: Implement Tier 11 (Error Handling)

Implement try/catch/finally blocks and retry mechanisms:

| Feature | Syntax | Example |
|---------|--------|---------|
| 11.1 | `try`/`catch` | Basic error handling |
| 11.2 | `try`/`catch`/`finally` | With cleanup |
| 11.3 | Nested try/catch | Inner catches don't trigger outer |
| 11.4 | `throw` | Rethrow to outer handler |
| 11.5 | `retry` | `session "..." (retry: 3)` |
| 11.6 | Retry with backoff | `(retry: 3, backoff: "exponential")` |
| 11.7 | Try in parallel | Error handling inside parallel branches |

### Target Syntax

```prose
# Basic try/catch
try:
  session "Risky operation that might fail"
catch:
  session "Handle the error gracefully"

# Try/catch/finally
try:
  session "Attempt to connect to external service"
catch:
  session "Log the connection failure"
finally:
  session "Clean up resources regardless of outcome"

# Nested try/catch
try:
  try:
    session "Inner risky operation"
  catch:
    session "Handle inner error"
  session "Continue after inner try"
catch:
  session "Handle outer error (only if inner doesn't catch)"

# Throw/rethrow
try:
  session "Check preconditions"
  throw  # Explicitly trigger error
catch:
  session "Handle thrown error"

# Retry modifier on sessions
session "Flaky API call" (retry: 3)

# Retry with backoff
session "Rate-limited API" (retry: 5, backoff: "exponential")

# Try inside parallel
parallel:
  try:
    session "Branch A - might fail"
  catch:
    session "Recover branch A"
  session "Branch B - always runs"
```

### Key Design Decisions

1. **Catch Semantics**: The `catch` block receives context about what failed. Consider whether to make the error accessible via an implicit variable (like `error`) or require explicit naming.

2. **Finally Timing**: `finally` always runs, whether `try` succeeded or `catch` was triggered.

3. **Throw Behavior**: `throw` without arguments re-raises the current error. Could optionally support `throw "message"` for explicit errors.

4. **Retry Scope**: Retry applies to individual sessions, not blocks. Consider whether retry should be on the session statement itself or as a modifier.

5. **Backoff Options**: Common patterns include:
   - `"none"` (default) - immediate retry
   - `"linear"` - fixed delay between retries
   - `"exponential"` - doubling delay (1s, 2s, 4s, 8s...)

### Suggested AST Nodes

```typescript
export interface TryBlockNode extends ASTNode {
  type: 'TryBlock';
  tryBody: StatementNode[];
  catchBody: StatementNode[] | null;
  finallyBody: StatementNode[] | null;
  errorVar: IdentifierNode | null;  // Optional: `catch as err:`
}

export interface ThrowStatementNode extends ASTNode {
  type: 'ThrowStatement';
  message: StringLiteralNode | null;  // Optional error message
}

// Retry is likely a modifier on SessionStatementNode, not a separate node
// Add to SessionStatementNode:
//   retryCount: number | null;
//   retryBackoff: 'none' | 'linear' | 'exponential' | null;
```

### Lexer Tokens Needed

You'll need to add:
- `TRY`, `CATCH`, `FINALLY`, `THROW` keywords
- `RETRY`, `BACKOFF` keywords (for modifiers)

Check `plugin/src/parser/tokens.ts` for the current token definitions.

### Implementation Notes

- The existing `parallel (on-fail: ...)` handles failure at the parallel level; try/catch handles it at the statement level
- Consider how errors propagate up from nested blocks
- The Orchestrator needs to understand what constitutes a "failure" (session error, timeout, etc.)
- Retry should be transparent to the rest of the program - it just makes the session more resilient

### Verification

```bash
# From plugin/
npm test                    # Should pass 644+ tests
npm run lint                # Should have no type errors

# From test-harness/
npx ts-node index.ts tier-11-try-catch    # Run E2E test with judge
```

## Architecture Quick Reference

```
plugin/
├── src/
│   ├── parser/
│   │   ├── tokens.ts      # Token types and keywords
│   │   ├── lexer.ts       # Tokenization
│   │   ├── ast.ts         # AST node definitions
│   │   ├── parser.ts      # Recursive descent parser
│   │   └── index.ts       # Barrel exports
│   ├── validator/
│   │   └── validator.ts   # Semantic validation
│   ├── compiler/
│   │   └── compiler.ts    # Compiles to canonical form
│   ├── lsp/
│   │   └── semantic-tokens.ts  # Syntax highlighting
│   └── __tests__/
│       ├── pipeline.test.ts    # Tier 10 tests (template)
│       └── ...
├── examples/              # Example .prose files
└── skills/open-prose/
    └── prose.md           # Language documentation

test-harness/
├── test-programs/         # E2E test .prose files
├── index.ts               # Test runner entry point
└── rubric.md              # Judge evaluation criteria
```

## Test Program Ideas

```prose
# tier-11-try-catch.prose
try:
  session "Attempt a task that might fail"
catch:
  session "Explain what went wrong and how to recover"

session "Continue with the rest of the program"
```

```prose
# tier-11-finally.prose
try:
  session "Open a resource and do work"
catch:
  session "Handle any errors"
finally:
  session "Always clean up the resource"

session "Program continues after cleanup"
```

```prose
# tier-11-retry.prose
session "Call a flaky external API" (retry: 3)

session "Process the API response"
```

```prose
# tier-11-nested.prose
try:
  session "Outer operation begins"
  try:
    session "Inner risky operation"
  catch:
    session "Handle inner failure"
  session "Outer operation continues"
catch:
  session "Handle outer failure (only if inner rethrows)"
```

```prose
# tier-11-parallel-try.prose
parallel:
  try:
    session "Branch A might fail"
  catch:
    session "Recover from branch A failure"
  try:
    session "Branch B might fail"
  catch:
    session "Recover from branch B failure"

session "Combine results from both branches"
```

## Implementation Pattern

Follow the same pattern used in previous tiers:

1. **Tokens** (`tokens.ts`) - Add TRY, CATCH, FINALLY, THROW, RETRY, BACKOFF tokens
2. **Lexer** (`lexer.ts`) - Add lexing rules for new tokens
3. **AST** (`ast.ts`) - Define TryBlockNode, ThrowStatementNode, update SessionStatementNode
4. **Parser** (`parser.ts`) - Add parseTryBlock(), parseThrowStatement(), parse retry modifiers
5. **Validator** (`validator.ts`) - Add validateTryBlock(), validateThrowStatement()
6. **Compiler** (`compiler.ts`) - Add compileTryBlock(), compileThrowStatement()
7. **LSP** (`semantic-tokens.ts`) - Usually no changes needed if tokens are keywords
8. **Tests** - Create `error-handling.test.ts` with comprehensive unit tests
9. **Documentation** - Update `prose.md` with new section
10. **E2E Tests** - Create test programs and run with judge

## Notes

- Look at how `parallel (on-fail: ...)` handles failure policies for reference
- The try/catch pattern is similar to JavaScript but with OpenProse's indentation-based syntax
- Consider edge cases: try without catch, catch without finally, empty blocks
- Retry is a session modifier, similar to how `context:` is a property but `(retry: N)` is inline
- The parentheses syntax for retry matches the pattern used in `parallel ("first"):`

## Recent Commit for Reference

```
22abf2f Implement Tier 10: Pipeline Operations
```

This commit shows the pattern: AST types, parser methods, validator methods, compiler methods, tests, docs, and E2E test programs.
