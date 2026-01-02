# OpenProse Validator Learnings & Open Tasks

## Summary

After extensive testing with 239 valid programs and 157 invalid programs:

- **Valid tests**: 239/239 passing (100%)
- **Invalid tests**: 131/157 correctly rejected (83%)

## Key Design Decisions

### 1. Python-like Scoping Semantics

OpenProse follows Python's scoping model:
- Variables defined in `if`/`else`/`try`/`catch` blocks **escape** to the parent scope
- Variables defined in loops (`for`, `loop until`, `repeat`) do **NOT escape** - use `reduce` for accumulation
- Named blocks (`block name:`) act like functions - internal variables don't leak out
- `choice` options have **isolated scopes** (only one branch executes at runtime)

### 2. Variable Shadowing

- Defining a variable with the same name in the **same scope** is an error
- Defining a variable with the same name in a **nested scope** (shadowing) is allowed with a warning
- This enables natural patterns like `let result = ...` inside catch blocks

### 3. Do Block Variable Escape

Variables defined inside `do blockname` statements escape through nested do blocks to the outermost non-block scope. This supports patterns like:

```prose
block setup:
  let config = session "Get config"

do setup
session "Using {config}"  # config is accessible here
```

### 4. Keywords as Identifiers

Reserved words like `context`, `model`, `prompt`, `skills` can be used as variable names:

```prose
let context = session "Get context"  # Valid
```

## Fixes Implemented

1. **Variable shadowing** - Only check current scope for duplicates
2. **Catch variable escape** - Variables in catch blocks escape to parent scope
3. **Choice option isolation** - Each option has its own isolated scope
4. **Do block variable escape** - Complex nested scope handling with shadowing support
5. **Keywords as identifiers** - Parser allows reserved words as variable names
6. **Multi-line pipe expressions** - Look-ahead for pipe on next line
7. **Variable repeat count** - Accept identifier or number literal for `repeat {n} times`
8. **Parallel for inline modifiers** - Parse `(on-fail: "continue")` syntax
9. **Arrow after property blocks** - Look ahead past newlines for arrow
10. **Backoff property** - Accept both string and number values

## Open Tasks: 26 Invalid Programs Still Accepted

### Parser/Lexer Issues (9 tests)

| Test | Issue | Fix Needed |
|------|-------|------------|
| 004-missing-colon-session.prose | Missing colon not detected | Parser should require colon after `session` keyword |
| 062-identifier-special-char.prose | Special chars in identifiers | Lexer should reject `my-var`, `foo@bar` |
| 068-identifier-only-underscore.prose | `_` as identifier | Lexer should require at least one alphanumeric |
| 095-nested-interpolation.prose | `{foo{bar}}` accepted | Parser should reject nested `{` in interpolation |
| 111-indent-mixed-tabs-spaces.prose | Mixed tabs/spaces | Lexer should detect and reject inconsistent indentation |
| 113-unbalanced-interpolation-close.prose | `}` without `{` | Parser should track brace balance |
| 115-expression-in-interpolation.prose | `{a + b}` accepted | Parser should reject operators in interpolation |
| 116-method-call-in-interpolation.prose | `{foo.bar()}` accepted | Parser should reject method calls in interpolation |
| 145-arrow-without-space.prose | `->` without space | Parser should require whitespace around arrow |

### Semantic Validation Issues (13 tests)

| Test | Issue | Fix Needed |
|------|-------|------------|
| 033-parallel-any-no-count.prose | `any` without count | Validator should require count with `any` |
| 050-throw-in-toplevel.prose | `throw` at top level | Validator should require `throw` inside `try` block |
| 060-parallel-any-count-too-high.prose | `any 10` with 3 items | Validator should check count <= collection size |
| 093-circular-block-call.prose | Block calls itself | Validator should detect direct recursion |
| 105-retry-string-value.prose | `retry: "3"` | Validator should require number for retry |
| 106-retry-float-value.prose | `retry: 1.5` | Validator should require integer for retry |
| 117-forward-reference-block.prose | `do foo` before `block foo:` | Validator should require block defined before use |
| 119-mutual-circular-blocks.prose | A calls B, B calls A | Validator should detect mutual recursion |
| 122-parallel-result-outside-block.prose | Accessing parallel internals | Validator should track parallel block scope |
| 124-break-outside-loop.prose | `break` not in loop | Validator should track loop context |
| 125-continue-outside-loop.prose | `continue` not in loop | Validator should track loop context |
| 126-break-in-parallel.prose | `break` in parallel for | Validator should reject break/continue in parallel |
| 139-context-on-agent.prose | `context:` on agent block | Validator should check valid agent properties |

### Limits/Edge Cases (4 tests)

| Test | Issue | Fix Needed |
|------|-------|------------|
| 129-deeply-nested-empty.prose | Empty nested blocks | Validator could warn about empty blocks |
| 141-extremely-long-identifier.prose | 1000+ char identifier | Lexer could enforce max identifier length |
| 142-deeply-nested-30-levels.prose | 30 levels of nesting | Validator could enforce max nesting depth |
| 143-block-too-many-params.prose | Block with 20 params | Validator could enforce max parameter count |

## Priority Recommendations

### High Priority (Core Language Semantics)
1. Break/continue validation (124, 125, 126)
2. Circular block detection (093, 119)
3. Retry type validation (105, 106)
4. Throw context validation (050)

### Medium Priority (Better Error Messages)
1. Missing colon detection (004)
2. Interpolation expression validation (115, 116)
3. Forward reference detection (117)

### Low Priority (Edge Cases)
1. Identifier validation (062, 068, 141)
2. Nesting limits (129, 142, 143)
3. Indentation consistency (111)

## Test Infrastructure

Test scripts are located in `/test-harness/`:
- `run-validator.sh` - Runs all valid program tests
- `run-invalid-tests.sh` - Runs all invalid program tests
- `test-programs/` - Valid test programs (239 files)
- `invalid-programs/` - Invalid test programs (157 files)
