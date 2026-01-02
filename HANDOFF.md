# Handoff: Implement Tier 12 (Advanced Features)

## Project Overview

OpenProse is a domain-specific language for orchestrating AI agent sessions. It's distributed as a Claude Code plugin. The language is being built incrementally with an LLM-as-judge test harness.

## Current Status

**Implemented (Tier 0 through Tier 11):**
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
- Pipeline operations (`items | map:`, `items | filter:`, `items | reduce(acc, item):`, `items | pmap:`)
- Pipeline chaining (`| filter: ... | map: ... | reduce: ...`)
- **Try/catch blocks** (`try:` / `catch:` / `catch as err:`)
- **Try/catch/finally** (`finally:` block always runs)
- **Throw statements** (`throw` for rethrow, `throw "message"` for custom errors)
- **Retry property** (`retry: 3` on sessions)
- **Backoff strategy** (`backoff: "exponential"`, `"linear"`, `"none"`)

**All tests passing:**
- 705 unit tests in `plugin/`
- E2E tests in `test-harness/` (including 5 Tier 11 tests, all passing with 4.93/5.0 avg)

## Tier 11 Implementation Summary

Tier 11 added comprehensive error handling with these key design decisions:

1. **Error variable access**: Optional via `catch as err:` - error is contextual info (transcript/description), not structured JSON
2. **Retry syntax**: Property in block style (`retry: 3` as indented property under session)
3. **Throw syntax**: Optional message - `throw` rethrows current error, `throw "message"` for custom errors
4. **Backoff values**: `"none"` (default), `"linear"`, `"exponential"`

Files modified:
- `plugin/src/parser/tokens.ts` - Added RETRY, BACKOFF tokens
- `plugin/src/parser/ast.ts` - Updated TryBlockNode (added errorVar), added ThrowStatementNode
- `plugin/src/parser/parser.ts` - Added parseTryBlock(), parseThrowStatement()
- `plugin/src/validator/validator.ts` - Added validateTryBlock(), validateThrowStatement(), retry/backoff validation
- `plugin/src/compiler/compiler.ts` - Added compileTryBlock(), compileThrowStatement()
- `plugin/src/__tests__/error-handling.test.ts` - 61 comprehensive tests
- `plugin/skills/open-prose/prose.md` - Error Handling documentation section
- `test-harness/test-programs/tier-11-*.prose` - 5 E2E test programs

## Files to Read First

Read these files in order to understand the project:

1. **`README.md`** - Project overview and structure
2. **`BUILD_PLAN.md`** - Development roadmap and feature checklist
3. **`plugin/skills/open-prose/prose.md`** - Current DSL reference (comprehensive)
4. **`plugin/src/parser/ast.ts`** - Current AST node definitions
5. **`plugin/src/__tests__/error-handling.test.ts`** - Tier 11 tests (good template for test structure)

## Your Task: Implement Tier 12 (Advanced Features)

Implement multi-line strings, string interpolation, block parameters, and conditional branching:

| Feature | Syntax | Example |
|---------|--------|---------|
| 12.1 | Multi-line strings | `"""..."""` |
| 12.2 | String interpolation | `"Process {item}"` |
| 12.3 | Block parameters | `block name(param):` |
| 12.4 | Block invocation with args | `do name("arg")` |
| 12.5 | choice **criteria**: | Orchestrator-selected branch |
| 12.6 | if/else | Conditional branching |

### Target Syntax

```prose
# Multi-line strings
session """
  This is a long prompt that spans
  multiple lines for readability.
  It preserves internal formatting.
"""

# String interpolation
let item = session "Get next item"
session "Process {item} and return results"

# Block parameters
block process-item(item):
  session "Analyze {item}"
  session "Transform the analysis"

# Block invocation with arguments
let data = session "Fetch data"
do process-item(data)

# Choice (Orchestrator-selected branch)
choice **which approach is best for this task**:
  option "quick":
    session "Do the fast approach"
  option "thorough":
    session "Do the comprehensive approach"
  option "creative":
    session "Do the innovative approach"

# If/else conditional
if **the data is valid**:
  session "Process the valid data"
else:
  session "Handle invalid data"

# If/elif/else
if **the response is positive**:
  session "Handle positive case"
elif **the response is negative**:
  session "Handle negative case"
else:
  session "Handle neutral case"
```

### Key Design Decisions

1. **Multi-line String Handling**: Triple quotes `"""` preserve internal whitespace. Leading/trailing newlines immediately after/before the quotes should likely be stripped.

2. **String Interpolation Scope**: Only variables in scope can be interpolated. Use `{varname}` syntax (like Python f-strings but without the `f` prefix).

3. **Block Parameters**: Parameters are passed by value. Consider whether to support default values (`block name(param = "default"):`).

4. **Choice Semantics**: The `**criteria**` is evaluated by the Orchestrator to select which option to execute. Only ONE option runs.

5. **If/Else Conditions**: Conditions use `**...**` discretion syntax for Orchestrator evaluation. Consider whether to support compound conditions.

### Suggested AST Nodes

```typescript
export interface MultiLineStringNode extends ASTNode {
  type: 'MultiLineString';
  value: string;
  raw: string;  // Original with quotes
}

export interface InterpolatedStringNode extends ASTNode {
  type: 'InterpolatedString';
  parts: (StringLiteralNode | IdentifierNode)[];  // Alternating text and variables
}

export interface BlockDefinitionNode extends ASTNode {
  type: 'BlockDefinition';
  name: IdentifierNode;
  parameters: IdentifierNode[];  // Parameter names
  body: StatementNode[];
}

export interface DoStatementNode extends ASTNode {
  type: 'DoStatement';
  blockName: IdentifierNode;
  arguments: ExpressionNode[];  // Arguments to pass
}

export interface ChoiceBlockNode extends ASTNode {
  type: 'ChoiceBlock';
  criteria: DiscretionNode;  // The **criteria** condition
  options: ChoiceOptionNode[];
}

export interface ChoiceOptionNode extends ASTNode {
  type: 'ChoiceOption';
  label: StringLiteralNode;  // The option name
  body: StatementNode[];
}

export interface IfStatementNode extends ASTNode {
  type: 'IfStatement';
  condition: DiscretionNode;  // The **condition**
  thenBody: StatementNode[];
  elseIfClauses: ElseIfClauseNode[];
  elseBody: StatementNode[] | null;
}

export interface ElseIfClauseNode extends ASTNode {
  type: 'ElseIfClause';
  condition: DiscretionNode;
  body: StatementNode[];
}
```

### Lexer Tokens Needed

You'll likely need:
- `TRIPLE_QUOTE` - For `"""`
- `LBRACE`, `RBRACE` - For `{` and `}` in interpolation (may already exist)
- `CHOICE`, `OPTION` - For choice blocks
- `IF`, `ELIF`, `ELSE` - For conditionals

Check `plugin/src/parser/tokens.ts` for current tokens. Some may already exist.

### Implementation Notes

- Multi-line strings need special lexer handling to track opening/closing triple quotes
- String interpolation requires parsing the string content to find `{...}` patterns
- Block parameters extend the existing `BlockDefinitionNode` - check if it already has a `parameters` field
- Choice is similar to a switch statement but with Orchestrator-evaluated selection
- If/else extends the language with conditional execution (currently only loops have conditions)

### Verification

```bash
# From plugin/
npm test                    # Should pass 705+ tests
npm run lint                # Should have no type errors

# From test-harness/
npx ts-node index.ts tier-12-multiline      # Run E2E test with judge
npx ts-node index.ts tier-12-interpolation  # etc.
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
│       ├── error-handling.test.ts  # Tier 11 tests (template)
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
# tier-12-multiline.prose
session """
  You are a helpful assistant.
  Please analyze the following data
  and provide insights.
"""

session "Summarize the analysis"
```

```prose
# tier-12-interpolation.prose
let topic = session "Pick an interesting topic"
session "Write a brief essay about {topic}"
session "Now provide counterarguments to the essay about {topic}"
```

```prose
# tier-12-block-params.prose
block analyze(subject):
  session "Research {subject}"
  session "Summarize findings about {subject}"

do analyze("climate change")
do analyze("artificial intelligence")
```

```prose
# tier-12-choice.prose
let problem = session "Describe the problem"

choice **which solution approach is most appropriate**:
  option "analytical":
    session "Apply systematic analysis to solve the problem"
  option "creative":
    session "Brainstorm creative solutions"
  option "incremental":
    session "Break down into small steps and solve iteratively"

session "Implement the chosen solution"
```

```prose
# tier-12-if-else.prose
let response = session "Get user feedback on the proposal"

if **the feedback is positive**:
  session "Proceed with implementation"
elif **the feedback requests changes**:
  session "Revise the proposal based on feedback"
else:
  session "Start over with a new approach"

session "Document the outcome"
```

```prose
# tier-12-block-args.prose
block greet(name, style):
  if **style is formal**:
    session "Write a formal greeting for {name}"
  else:
    session "Write a casual greeting for {name}"

do greet("Alice", "formal")
do greet("Bob", "casual")
```

## Implementation Pattern

Follow the same pattern used in previous tiers:

1. **Tokens** (`tokens.ts`) - Add TRIPLE_QUOTE, CHOICE, OPTION, IF, ELIF, ELSE tokens
2. **Lexer** (`lexer.ts`) - Add lexing rules for new tokens, especially multi-line string handling
3. **AST** (`ast.ts`) - Define new node types
4. **Parser** (`parser.ts`) - Add parse methods for each new construct
5. **Validator** (`validator.ts`) - Add validation methods
6. **Compiler** (`compiler.ts`) - Add compilation methods
7. **LSP** (`semantic-tokens.ts`) - Usually no changes needed if tokens are keywords
8. **Tests** - Create `advanced-features.test.ts` with comprehensive unit tests
9. **Documentation** - Update `prose.md` with new sections
10. **E2E Tests** - Create test programs and run with judge

## Notes

- Look at how `**condition**` is handled in loops for reference on discretion syntax
- String interpolation may require a two-pass approach: lex the string, then parse interpolations
- Block parameters need scope management - parameters should shadow outer variables
- Choice is unique - it's the first construct where the Orchestrator selects between options
- If/else completes the control flow story (loops + conditionals + error handling)

## Suggested Implementation Order

1. **Multi-line strings** (12.1) - Simplest, just lexer changes
2. **String interpolation** (12.2) - Builds on strings, affects lexer and parser
3. **Block parameters** (12.3) - Extends existing blocks
4. **Block invocation with args** (12.4) - Pairs with 12.3
5. **If/else** (12.6) - Uses existing `**condition**` pattern
6. **Choice** (12.5) - Most complex, new control structure

## Recent Commits for Reference

```
[this commit] Implement Tier 11: Error Handling
22abf2f Implement Tier 10: Pipeline Operations
```
