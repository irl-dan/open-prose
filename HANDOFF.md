# Handoff: Implement Tier 10 (Pipeline Operations)

## Project Overview

OpenProse is a domain-specific language for orchestrating AI agent sessions. It's distributed as a Claude Code plugin. The language is being built incrementally with an LLM-as-judge test harness.

## Current Status

**Implemented (Tier 0 through Tier 9):**
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
- **Unbounded loops** (`loop:`, `loop until **condition**:`, `loop while **condition**:`)
- **Loop with max iterations** (`loop (max: N):`)
- **Loop with iteration variable** (`loop as i:`, `loop until **done** as i:`)

**All tests passing:**
- 602 unit tests in `plugin/`
- E2E tests in `test-harness/` (including 5 Tier 9 tests, all passing with 4.98/5.0 avg)

## Files to Read First

Read these files in order to understand the project:

1. **`README.md`** - Project overview and structure
2. **`BUILD_PLAN.md`** - Development roadmap and feature checklist
3. **`plugin/skills/open-prose/prose.md`** - Current DSL reference (comprehensive)
4. **`plugin/src/parser/ast.ts`** - Current AST node definitions
5. **`plugin/src/__tests__/unbounded-loops.test.ts`** - Tier 9 tests (good template for test structure)

## Your Task: Implement Tier 10 (Pipeline Operations)

Implement functional-style collection transformations using the pipe operator:

| Feature | Syntax | Example |
|---------|--------|---------|
| 10.1 | `map` | `items \| map: session "..."` |
| 10.2 | `filter` | `items \| filter: session "..."` |
| 10.3 | `reduce` | `items \| reduce(acc, item): ...` |
| 10.4 | `pmap` | Parallel map (like map but concurrent) |
| 10.5 | Chaining | `\| filter: ... \| map: ... \| reduce:` |

### Target Syntax

```prose
# Map: transform each item
let summaries = articles | map:
  session "Summarize this article in one sentence"
    context: item

# Filter: keep items matching a condition
let important = items | filter:
  session "Is this item important? Answer yes or no."
    context: item

# Reduce: accumulate into a single result
let combined = items | reduce(acc, item):
  session "Combine the accumulator with this item"
    context: [acc, item]

# Parallel map: like map but runs concurrently
let results = items | pmap:
  session "Process this item"
    context: item

# Chaining: compose multiple operations
let final = articles
  | filter:
      session "Is this relevant?"
        context: item
  | map:
      session "Summarize"
        context: item
  | reduce(acc, item):
      session "Combine summaries"
        context: [acc, item]
```

### Key Design Decisions

1. **Pipe Operator**: The `|` operator chains operations. It passes the left-hand side as input to the right-hand side operation.

2. **Implicit Variables**: Inside pipeline operations:
   - `item` refers to the current element (for map/filter/pmap)
   - `acc` and `item` for reduce (accumulator and current)
   - These could be explicit or implicit - decide based on consistency with existing patterns

3. **Filter Semantics**: The filter session should return something the Orchestrator can interpret as truthy/falsy. This might use discretion markers or rely on intelligent interpretation.

4. **Reduce Initial Value**: Consider whether reduce needs an explicit initial value or uses the first item.

### Suggested AST Nodes

```typescript
export interface PipeExpressionNode extends ASTNode {
  type: 'PipeExpression';
  input: ExpressionNode;  // Left side of |
  operations: PipeOperationNode[];  // Chain of operations
}

export interface PipeOperationNode extends ASTNode {
  type: 'PipeOperation';
  operator: 'map' | 'filter' | 'reduce' | 'pmap';
  itemVar: IdentifierNode | null;  // Custom name for item variable
  accVar: IdentifierNode | null;  // For reduce: accumulator variable
  body: StatementNode[];
}
```

### Lexer Tokens Needed

You'll likely need to add:
- `PIPE` token for `|`
- `MAP`, `FILTER`, `REDUCE`, `PMAP` keywords

Check `plugin/src/parser/tokens.ts` for the current token definitions.

### Implementation Notes

- The existing `ForEachBlockNode` handles iteration - pipeline operations are similar but functional
- Consider how pipeline results flow - each operation transforms the collection
- `pmap` should behave like `parallel for` but in pipeline syntax
- The Orchestrator interprets filter results intelligently (like discretion conditions)

### Verification

```bash
# From plugin/
npm test                    # Should pass 600+ tests
npm run lint                # Should have no type errors

# From test-harness/
npx ts-node index.ts tier-10-map    # Run E2E test with judge
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
│       ├── unbounded-loops.test.ts  # Tier 9 tests (template)
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
# tier-10-map.prose
let fruits = ["apple", "banana", "cherry"]

let descriptions = fruits | map:
  session "Describe this fruit in one creative sentence"
    context: item

session "Present all the fruit descriptions"
  context: descriptions
```

```prose
# tier-10-filter.prose
let numbers = ["one", "two", "three", "four", "five"]

let short = numbers | filter:
  session "Does this word have 4 or fewer letters? Answer only yes or no."
    context: item

session "List the short words that passed the filter"
  context: short
```

```prose
# tier-10-reduce.prose
let ideas = ["AI assistant", "smart home", "health tracker"]

let combined = ideas | reduce(summary, idea):
  session "Add this idea to the summary, creating a cohesive product concept"
    context: [summary, idea]

session "Present the final combined product concept"
  context: combined
```

```prose
# tier-10-chain.prose
let topics = ["quantum computing", "blockchain", "machine learning", "IoT", "cybersecurity"]

let result = topics
  | filter:
      session "Is this topic trending in 2024? Answer yes or no."
        context: item
  | map:
      session "Write a one-line startup pitch for this topic"
        context: item

session "Present the startup pitches for trending topics"
  context: result
```

## Implementation Pattern

Follow the same pattern used in previous tiers:

1. **Tokens** (`tokens.ts`) - Add PIPE, MAP, FILTER, REDUCE, PMAP tokens
2. **Lexer** (`lexer.ts`) - Add lexing rules for new tokens
3. **AST** (`ast.ts`) - Define PipeExpressionNode, PipeOperationNode
4. **Parser** (`parser.ts`) - Add parsePipeExpression(), parsePipeOperation()
5. **Validator** (`validator.ts`) - Add validatePipeExpression()
6. **Compiler** (`compiler.ts`) - Add compilePipeExpression()
7. **LSP** (`semantic-tokens.ts`) - Usually no changes needed if tokens are keywords
8. **Tests** - Create `pipeline.test.ts` with comprehensive unit tests
9. **Documentation** - Update `prose.md` with new section
10. **E2E Tests** - Create test programs and run with judge

## Notes

- Look at how `ForEachBlockNode` handles iteration for reference
- The pipe operator creates a chain, so parsing needs to handle left-associativity
- Filter's truthiness evaluation is similar to how `loop until` evaluates conditions
- Consider edge cases: empty collections, single-item collections, nested pipelines
