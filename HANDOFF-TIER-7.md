# Handoff: Implement Tier 7 (Advanced Parallel)

## Project Overview

OpenProse is a domain-specific language for orchestrating AI agent sessions. It's distributed as a Claude Code plugin. The language is being built incrementally with an LLM-as-judge test harness.

## Current Status

**Implemented (Tier 0 through Tier 6):**
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
- **Parallel blocks** (`parallel:` for concurrent execution)
- **Named parallel results** (`x = session "..."` inside parallel)
- **Object context** (`context: { a, b, c }` shorthand)

**All tests passing:**
- 439 unit tests in `plugin/`
- E2E tests in `test-harness/` (including 4 Tier 6 tests)

## Files to Read First

Read these files in order to understand the project:

1. **`README.md`** - Project overview and structure
2. **`BUILD_PLAN.md`** - Development roadmap and feature checklist
3. **`plugin/skills/open-prose/prose.md`** - Current DSL reference
4. **`plugin/src/parser/ast.ts`** - Current AST node definitions
5. **`plugin/src/__tests__/parallel-blocks.test.ts`** - Tier 6 tests (good template)

## Your Task: Implement Tier 7 (Advanced Parallel)

Implement advanced parallel execution features:

| Feature | Syntax | Example |
|---------|--------|---------|
| 7.1 Join strategies | `parallel ("first"):` | Return first result, cancel others |
| 7.2 Join strategies | `parallel ("any"):` | Return any N results |
| 7.3 Failure policies | `on-fail: "continue"` | Continue if branch fails |
| 7.4 Failure policies | `on-fail: "ignore"` | Ignore failures entirely |

### Target Syntax

```prose
# Race: first to complete wins
parallel ("first"):
  session "Try approach A"
  session "Try approach B"

# Any N successes
parallel ("any", count: 2):
  session "Attempt 1"
  session "Attempt 2"
  session "Attempt 3"

# Continue on failure
parallel (on-fail: "continue"):
  session "Risky operation 1"
  session "Risky operation 2"

# Ignore failures (always succeed)
parallel (on-fail: "ignore"):
  session "Optional task 1"
  session "Optional task 2"
```

### Existing AST Support

The `ParallelBlockNode` already has fields for this:

```typescript
export interface ParallelBlockNode extends ASTNode {
  type: 'ParallelBlock';
  joinStrategy: 'all' | 'first' | 'any' | null;  // null = 'all' (default)
  onFail?: 'fail-fast' | 'continue' | 'ignore';  // Default: fail-fast
  body: StatementNode[];
}
```

### Implementation Order

1. **Parser** - Parse the modifier syntax `parallel ("first"):` and `parallel (on-fail: "continue"):`
2. **AST** - Verify ParallelBlockNode fields are sufficient
3. **Validator** - Validate valid strategy/onFail values
4. **Compiler** - Compile with modifiers
5. **LSP** - Highlight modifiers appropriately
6. **Tests** - Comprehensive unit tests
7. **Documentation** - Update prose.md
8. **E2E Tests** - Add tier-07 test programs

### Verification

```bash
# From plugin/
npm test                    # Should pass 450+ tests
npm run lint                # Should have no type errors
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
│       ├── parallel-blocks.test.ts  # Tier 6 tests
│       └── ...
├── examples/              # Example .prose files
└── skills/open-prose/
    └── prose.md           # Language documentation

test-harness/
├── test-programs/         # E2E test .prose files
├── index.ts               # Test runner entry point
└── rubric.md              # Judge evaluation criteria
```
