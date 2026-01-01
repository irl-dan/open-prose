# Handoff: Implement Tier 4 (Variables & Context)

## Project Overview

OpenProse is a domain-specific language for orchestrating AI agent sessions. It's distributed as a Claude Code plugin. The language is being built incrementally with an LLM-as-judge test harness.

## Current Status

**Implemented (Tier 0 + Tier 1 + Tier 2 + Tier 3):**
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

**All tests passing:**
- 287 unit tests in `plugin/`
- 8 E2E tests in `test-harness/` (all scoring 4.75-5.0/5.0)

## Files to Read First

Read these files in order to understand the project:

1. **`README.md`** - Project overview and structure
2. **`BUILD_PLAN.md`** - Development roadmap, iteration loop, and **Feature Implementation Checklist** (critical - lists every file to touch when adding a feature)
3. **`plugin/skills/open-prose/prose.md`** - Current DSL reference (what's implemented)
4. **`plugin/src/parser/ast.ts`** - Current AST node definitions
5. **`plugin/src/__tests__/skills-imports.test.ts`** - Most recent comprehensive feature tests (good template for Tier 4 tests)
6. **`test-harness/README.md`** - How E2E testing works

## Your Task: Implement Tier 4 (Variables & Context)

Implement variable bindings and explicit context passing. This tier adds:

| Feature | Syntax | Example |
|---------|--------|---------|
| 4.1 Let binding | `let name = expression` | `let research = session: researcher` |
| 4.2 Const binding | `const name = expression` | `const config = session "Get config"` |
| 4.3 Context property | `context: expression` | `context: research` |
| 4.4 Multiple contexts | `context: [a, b, c]` | `context: [research, analysis]` |
| 4.5 Empty context | `context: []` | Start session with fresh context |

### Target Syntax

```prose
# Variable bindings
let research = session: researcher
  prompt: "Research the topic"

const config = session "Get configuration"

# Use context in subsequent sessions
session: writer
  prompt: "Write about the research"
  context: research

# Multiple contexts
session "Final synthesis":
  context: [research, analysis, feedback]

# No context (start fresh)
session "Independent task":
  context: []
```

### Implementation Order

Follow the **Feature Implementation Checklist** in BUILD_PLAN.md. For each sub-feature (4.1, 4.2, etc.):

1. **Tokens** - Add `LET`, `CONST`, `CONTEXT` tokens (some may already exist in tokens.ts)
2. **Lexer** - Recognize new keywords (check if already in KEYWORDS map)
3. **AST** - Define `LetBindingNode`, `ConstBindingNode`, update `SessionStatementNode` with context
4. **Parser** - Parse let/const bindings and context property
5. **Validator** - Validate variable references, context types
6. **Compiler** - Expand to canonical form
7. **LSP** - Syntax highlighting for new constructs
8. **Tests** - Comprehensive unit tests
9. **Documentation** - Update `prose.md`
10. **Examples** - Add to `plugin/examples/`
11. **E2E Tests** - Add `tier-04-*.prose` test programs

### Key Design Decisions

- `let` bindings are mutable (can be reassigned)
- `const` bindings are immutable (cannot be reassigned)
- Variables store the result of session execution
- `context` property passes previous session output(s) to new sessions
- `context: []` explicitly starts with no inherited context
- Variables are scoped to the program level (no nested scopes yet)

### Verification

After implementation:

```bash
# From plugin/
npm test                    # Should pass 330+ tests
npm run lint                # Should have no type errors

# From test-harness/
npx ts-node index.ts --all  # Should pass with avg >= 4.0/5.0
```

### Notes

- Check `plugin/examples/roadmap/syntax/open-prose-syntax.prose` for future syntax examples
- The parser is hand-written recursive descent (not a parser generator)
- Use `export type { Interface }` in barrel files (Bun compatibility)
- See BUILD_PLAN.md "Common Gotchas" section
- Some tokens like `LET`, `CONST` may already exist - check `tokens.ts` first
- Look at `plugin/src/__tests__/skills-imports.test.ts` as a template for comprehensive tests

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
│       ├── skills-imports.test.ts  # Tier 3 tests (good template)
│       └── ...
├── examples/              # Example .prose files
└── skills/open-prose/
    └── prose.md           # Language documentation

test-harness/
├── test-programs/         # E2E test .prose files
├── index.ts               # Test runner entry point
└── rubric.md              # Judge evaluation criteria
```

## Questions?

If unclear on any design decisions, check:
1. `specification/` directory for language design docs
2. `guidance/` directory for historical decisions
3. `plugin/examples/roadmap/syntax/open-prose-syntax.prose` for syntax examples
4. Or ask the user for clarification before implementing
