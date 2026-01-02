# OpenProse Validator Issues Analysis

## Executive Summary

This document provides a comprehensive analysis of the OpenProse validator and parser test failures. The analysis is based on running the test harness against 247 valid permutation test programs and 100 invalid test programs.

**Key Findings:**
- **Valid tests:** 178 passed, 69 failed (72% pass rate)
- **Invalid tests:** 62 correctly rejected, 38 incorrectly accepted (62% detection rate)

The failures cluster into several major categories:
1. **Session property syntax parsing** - Property syntax (`session: agent` with properties) is not fully implemented
2. **Variable scoping issues** - Variables defined in loops/blocks are not visible in foreach iterations
3. **Missing orphan clause detection** - Standalone `catch:`, `else:`, `option:` etc. are not detected as errors
4. **Missing validation for structural constraints** - Empty blocks, nested definitions, etc.
5. **Missing interpolation validation** - Unclosed/undefined variables in string interpolations

---

## Test Results Summary

### Valid Programs (test-harness/permutation-tests/)

| Category | Count | Details |
|----------|-------|---------|
| **Total Tests** | 247 | |
| **Passed** | 178 | Programs correctly validated |
| **Failed** | 69 | Programs that should pass but fail |

### Invalid Programs (test-harness/invalid-programs/)

| Category | Count | Details |
|----------|-------|---------|
| **Total Tests** | 100 | |
| **Correctly Rejected** | 62 | Invalid programs that correctly fail |
| **Incorrectly Accepted** | 38 | Invalid programs that should fail but pass |

---

## Issue Catalog

### Category 1: Session Property Syntax Parsing

**Description:** The parser fails when parsing sessions with property blocks (indented properties after `session: agentname`). The specific error is "Expected agent name after ':'".

**Root Cause:** In `/Users/sl/code/open-prose/plugin/src/parser/parser.ts`, the `parseSessionStatement()` function (lines 910-1009) expects `session: identifier` to be followed by optional properties, but the parser does not correctly handle the property block parsing when properties like `prompt:`, `context:`, `retry:` follow.

The issue appears to be that when a session has properties with their own values containing `:`, the parser gets confused about what the colon means.

**Example Test Cases That Expose It:**
- `101-session-props-basic.prose`: `session: prompt: "Hello"`
- `102-session-props-model.prose`: Session with model property
- `103-session-props-context-var.prose`: Session with context property
- All 101-110 series (session properties tests)

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/parser/parser.ts` (lines 910-1009)

**Suggested Fix:**
The session parsing logic needs to be revised to properly handle the two-part syntax:
```
session: agentname
  prompt: "value"
  context: var
```

The parser should:
1. Parse `session:`
2. Then check if next token is an identifier (agent name) or if we go directly to NEWLINE+INDENT for properties-only session
3. After agent name, check for NEWLINE+INDENT to parse property block

---

### Category 2: Variable Scoping in Loops/Nested Blocks

**Description:** Variables defined inside loops (via `let`) are not recognized as being in scope when used in nested for-each iterations. The validator reports "Undefined collection variable" for variables that were just defined.

**Root Cause:** In `/Users/sl/code/open-prose/plugin/src/validator/validator.ts`, the first pass in `validate()` (lines 99-112) only collects top-level let/const bindings. It does not traverse into blocks to find bindings defined inside loops.

When validating a `ForEachBlock`, the `validateForEachBlock()` method (lines 567-619) checks if the collection variable exists in `this.definedVariables`, but this map only contains top-level definitions.

**Example Test Cases That Expose It:**
- `023-foreach-in-repeat.prose`: `let items = ...` inside repeat, then `for item in items:`
- `024-nested-foreach.prose`: Let binding inside loop used in nested foreach
- `111-let-repeat-then-foreach.prose`: Variable defined in repeat used in foreach
- `112-let-foreach-then-foreach.prose`: Variable chained between foreaches
- `120-triple-nested-let-foreach.prose`: Multiple levels of nesting

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts` (lines 99-112, 567-619)

**Suggested Fix:**
The validator needs to use a proper scope chain approach:
1. Instead of collecting all bindings in first pass, track scopes dynamically
2. When entering a block (repeat, foreach, if, try, etc.), push a new scope
3. When exiting, pop the scope
4. When checking if a variable is defined, walk up the scope chain

Alternatively, the first pass needs to recursively traverse all statements to find let/const bindings, including those nested in loops and blocks.

---

### Category 3: Block Parameter as Repeat Count

**Description:** When a block parameter is used as the repeat count (e.g., `repeat times:`), the parser fails with "Expected number after 'repeat'".

**Root Cause:** In `/Users/sl/code/open-prose/plugin/src/parser/parser.ts`, `parseRepeatBlock()` (lines 1493-1580) only accepts `TokenType.NUMBER` for the count. It does not accept identifiers (which could be block parameters or variables).

**Example Test Cases That Expose It:**
- `077-block-params-multi.prose`: `repeat count:` where count is a parameter
- `121-block-param-as-repeat-count.prose`: Block with times parameter used as repeat count

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/parser/parser.ts` (lines 1498-1509)

**Suggested Fix:**
Change the repeat count parsing to accept either a number literal OR an identifier:
```typescript
let count: NumberLiteralNode | IdentifierNode;
if (this.check(TokenType.NUMBER)) {
  count = this.parseNumberLiteral();
} else if (this.check(TokenType.IDENTIFIER)) {
  count = this.parseIdentifier();
} else {
  this.addError('Expected number or variable after "repeat"');
}
```

Then update the AST type `RepeatBlockNode.count` to be `NumberLiteralNode | IdentifierNode`.

---

### Category 4: Arrow Sequence with Session Properties

**Description:** Arrow sequences (`->`) after sessions with properties fail to parse correctly.

**Root Cause:** When a session has properties (indented block), followed by `->`, the parser does not correctly identify the arrow continuation.

**Example Test Cases That Expose It:**
- `168-multi-agent-handoff.prose`: Multiple sessions chained with `->`

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/parser/parser.ts` (lines 1014-1023, 1029-1085)

**Suggested Fix:**
After parsing a session with properties, check for `ARROW` token at the next non-whitespace position and continue the arrow sequence parsing.

---

### Category 5: Missing Orphan Clause Detection

**Description:** Standalone `catch:`, `finally:`, `else:`, `elif:`, `option:` statements (without their parent construct) are accepted when they should be rejected.

**Root Cause:** In `/Users/sl/code/open-prose/plugin/src/parser/parser.ts`, `parseStatement()` (lines 145-243) does not handle these keywords as statements. When encountered at top level, they are silently skipped (see lines 238-242).

The keywords `catch`, `finally`, `else`, `elif`, `option` are never checked in `parseStatement()`, so they get skipped by the catch-all at the end.

**Example Test Cases That Expose It:**
- `018-catch-without-try.prose`: Standalone `catch:` block
- `019-finally-without-try.prose`: Standalone `finally:` block
- `020-else-without-if.prose`: Standalone `else:` block
- `021-elif-without-if.prose`: Standalone `elif:` block
- `022-option-without-choice.prose`: Standalone `option:` block
- `096-option-outside-choice.prose`: Option outside choice

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/parser/parser.ts` (lines 145-243)

**Suggested Fix:**
Add explicit error handling for orphan clauses in `parseStatement()`:
```typescript
// Handle orphan clauses that shouldn't appear at statement level
if (this.check(TokenType.CATCH)) {
  this.addError('"catch" without matching "try"');
  this.advance();
  return null;
}
if (this.check(TokenType.FINALLY)) {
  this.addError('"finally" without matching "try"');
  this.advance();
  return null;
}
// ... similar for ELSE, ELIF, OPTION
```

---

### Category 6: Empty Block Validation

**Description:** Empty blocks (block, if, parallel, etc. with no body statements) are accepted when they should be rejected.

**Root Cause:** The parser creates AST nodes with empty body arrays without generating an error. The validator does not check for empty bodies.

**Example Test Cases That Expose It:**
- `014-empty-block.prose`: Block definition with empty body
- `015-empty-if.prose`: If statement with empty body
- `016-empty-parallel.prose`: Parallel block with empty body
- `048-pipeline-no-body.prose`: Pipeline with no body

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts` (various validate* methods)

**Suggested Fix:**
Add empty body checks to each block validation method:
```typescript
private validateBlockDefinition(block: BlockDefinitionNode): void {
  // ... existing validation ...

  if (block.body.length === 0) {
    this.addError('Block body cannot be empty', block.span);
  }
}
```

---

### Category 7: Undefined Variable in Interpolation

**Description:** Variables referenced in string interpolations (`{varname}`) are not validated against the defined variables scope.

**Root Cause:** The validator's `validateSessionPrompt()` and `validateStringLiteral()` methods (lines 1342-1390) do not extract and check variable references from interpolated strings.

**Example Test Cases That Expose It:**
- `034-undefined-variable.prose`: `"The value is {undefined_var}"`
- `071-undefined-variable.prose`: Undefined variable in interpolation
- `074-block-param-outside-scope.prose`: Block param used outside block scope

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts` (lines 1342-1390)

**Suggested Fix:**
1. Parse the string to extract interpolation variables
2. For each interpolated variable, check if it exists in `definedVariables`
3. Report error if not found

```typescript
private validateInterpolatedString(str: StringLiteralNode): void {
  const interpolationRegex = /\{(\w+)\}/g;
  let match;
  while ((match = interpolationRegex.exec(str.value)) !== null) {
    const varName = match[1];
    if (!this.definedVariables.has(varName)) {
      this.addError(`Undefined variable in interpolation: "${varName}"`, str.span);
    }
  }
}
```

---

### Category 8: Missing Structural Validation

**Description:** Various structural constraints are not validated:
- Agent definitions must have `model` property
- Agent definitions should have `prompt` property
- Nested agent/block definitions (agent inside block, block inside block) should be rejected
- Import statements must be at top of file
- Double else, elif after else, catch after finally, etc.

**Root Cause:** The validator does not check for these structural rules.

**Example Test Cases That Expose It:**
- `045-agent-missing-model.prose`: Agent without model property
- `046-agent-missing-prompt.prose`: Agent without prompt property
- `056-nested-agent-def.prose`: Agent defined inside block
- `057-nested-block-def.prose`: Block defined inside block
- `058-import-not-at-top.prose`: Import after other statements
- `051-double-else.prose`: Two else blocks
- `052-elif-after-else.prose`: Elif appearing after else
- `053-catch-after-finally.prose`: Catch block after finally

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts`
- `/Users/sl/code/open-prose/plugin/src/parser/parser.ts`

**Suggested Fix:**

For agent validation (validator.ts):
```typescript
private validateAgentDefinition(agent: AgentDefinitionNode): void {
  // ... existing validation ...

  // Check required properties
  const hasModel = agent.properties.some(p => p.name.name === 'model');
  if (!hasModel) {
    this.addError('Agent definition requires "model" property', agent.span);
  }

  const hasPrompt = agent.properties.some(p => p.name.name === 'prompt');
  if (!hasPrompt) {
    this.addWarning('Agent definition should have "prompt" property', agent.span);
  }
}
```

For nested definitions, track context during parsing and report errors when agent/block keywords appear inside block bodies.

For import ordering, track whether we've seen non-import statements and error if import appears after.

---

### Category 9: Parallel Strategy Validation

**Description:** Parallel blocks with "first" or "any" strategy and single branch should be warned/errored. Parallel "any" should require count parameter.

**Root Cause:** The validator's `validateParallelBlock()` (lines 439-515) does not check branch count against strategy.

**Example Test Cases That Expose It:**
- `033-parallel-any-no-count.prose`: parallel("any") without count
- `059-parallel-single-branch-first.prose`: parallel("first") with only one branch
- `060-parallel-any-count-too-high.prose`: count exceeds branches (only warning issued)

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts` (lines 439-515)

**Suggested Fix:**
```typescript
private validateParallelBlock(parallel: ParallelBlockNode): void {
  // ... existing validation ...

  // Validate branch count for strategies
  if (parallel.joinStrategy) {
    const strategy = parallel.joinStrategy.value;
    if ((strategy === 'first' || strategy === 'any') && parallel.body.length < 2) {
      this.addError(
        `Parallel with "${strategy}" strategy needs at least 2 branches`,
        parallel.span
      );
    }
    if (strategy === 'any' && !parallel.anyCount) {
      this.addWarning(
        'Parallel "any" strategy should specify count parameter',
        parallel.span
      );
    }
  }
}
```

---

### Category 10: Backoff Value Type

**Description:** The backoff property accepts numbers when it should only accept strings ("none", "linear", "exponential").

**Root Cause:** The test case `162-agent-session-retry.prose` uses `backoff: 500` (a number) instead of a string. The validator correctly rejects this, but this represents a potential design ambiguity.

**Example Test Cases That Expose It:**
- `162-agent-session-retry.prose`: Uses `backoff: 500` instead of `backoff: "linear"`

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts` (lines 1281-1296)

**Status:** This is actually CORRECT behavior - the validator properly requires backoff to be a string. The test case may need updating if numeric backoff values should be allowed.

---

### Category 11: Context Variable from Loop Scope

**Description:** Context variables that reference loop-scoped variables (like loop index or items defined inside loop body) are not recognized.

**Root Cause:** Same as Category 2 - the first-pass variable collection doesn't find loop-scoped variables.

**Example Test Cases That Expose It:**
- `164-agent-loop-context-let.prose`: Context references `feedback` defined in loop

**Suggested Fix:** Same as Category 2 - implement proper scope chain.

---

### Category 12: Variable Use Before Declaration

**Description:** Using a variable before it's declared should fail but passes validation.

**Root Cause:** The first-pass collection of variables doesn't track declaration order. All variables are collected before statement validation begins.

**Example Test Cases That Expose It:**
- `072-variable-before-declaration.prose`: Uses `{x}` before `let x = ...`

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts` (lines 99-112)

**Suggested Fix:**
Track declaration position in `VariableBinding`:
```typescript
interface VariableBinding {
  name: string;
  isConst: boolean;
  span: SourceSpan;
  declarationLine: number;
}
```

Then when checking variable references, ensure the reference occurs after the declaration.

---

### Category 13: Reduce Pipeline Parameters

**Description:** The `reduce` pipeline operation requires `(acc, item)` parameters, but this is not validated.

**Root Cause:** The parser may not require the parameters, and the validator doesn't check for them.

**Example Test Cases That Expose It:**
- `049-reduce-missing-params.prose`: Reduce without accumulator params

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/parser/parser.ts` (lines 2585-2616)
- `/Users/sl/code/open-prose/plugin/src/validator/validator.ts`

**Suggested Fix:**
Ensure `parsePipeOperation()` requires the `(acc, item)` syntax for reduce, and validate in `validatePipeOperation()` that both accVar and itemVar are non-null for reduce.

---

### Category 14: Unclosed/Nested Interpolation

**Description:** Unclosed interpolation braces (`{x` without `}`) or nested braces (`{{x}}`) are not detected as errors.

**Root Cause:** The lexer may not validate interpolation syntax during string tokenization.

**Example Test Cases That Expose It:**
- `012-unclosed-interpolation.prose`: `"The value is {x"` (missing closing brace)
- `094-unclosed-interpolation.prose`: Another unclosed interpolation
- `095-nested-interpolation.prose`: `"Value is {{x}}"` (nested braces)

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/parser/lexer.ts`

**Suggested Fix:**
Add interpolation validation in the string lexing code to detect and report:
- Unclosed `{` without matching `}`
- Nested `{{` patterns

---

### Category 15: Identifier Validation

**Description:** Certain identifier patterns should be rejected but are accepted:
- Identifier with only underscore (`_`)
- Identifier with special characters

**Root Cause:** The lexer's identifier matching may be too permissive.

**Example Test Cases That Expose It:**
- `062-identifier-special-char.prose`: Identifier with special character
- `068-identifier-only-underscore.prose`: Single underscore as identifier

**Affected Files:**
- `/Users/sl/code/open-prose/plugin/src/parser/lexer.ts`

**Suggested Fix:**
Tighten the identifier regex to require at least one alphanumeric character and reject special characters beyond underscore.

---

## Codebase Architecture Notes

### Parser Structure

The parser (`/Users/sl/code/open-prose/plugin/src/parser/parser.ts`) is a recursive descent parser with these key characteristics:

1. **Single-pass tokenization then parsing**: The lexer produces all tokens first, then the parser consumes them
2. **Indentation-sensitive**: Uses INDENT/DEDENT tokens for block structure
3. **Statement-oriented**: `parseStatement()` is the main dispatch point for all statement types
4. **Property blocks**: Properties are parsed inline with their parent constructs (agent, session, etc.)

### Validator Structure

The validator (`/Users/sl/code/open-prose/plugin/src/validator/validator.ts`) uses a two-pass approach:

1. **First pass (lines 99-112)**: Collects all top-level definitions:
   - Imports
   - Agent definitions
   - Block definitions
   - Let/const bindings

2. **Second pass (lines 114-117)**: Validates all statements recursively

### Key Data Structures

- `definedAgents: Map<string, AgentDefinitionNode>` - All agent definitions
- `definedBlocks: Map<string, BlockDefinitionNode>` - All block definitions
- `definedVariables: Map<string, VariableBinding>` - All variable bindings
- `importedSkills: Map<string, ImportStatementNode>` - All imports

### Limitations

1. **No scope chain**: The validator uses flat maps instead of nested scopes
2. **No position tracking for use-before-declare**: Variables are collected before validation
3. **No structural context**: Parser doesn't track "inside block" vs "top level" for detecting nested definitions

---

## Prioritized Fix List

### Priority 1 (High Impact, Medium Difficulty)

1. **Variable scoping in loops** - Affects 20+ tests
   - Implement scope chain or recursive variable collection
   - Files: `validator.ts`

2. **Session property syntax** - Affects 30+ tests
   - Fix property block parsing after `session: agent`
   - Files: `parser.ts`

3. **Orphan clause detection** - Affects 8 tests
   - Add explicit error for standalone catch/finally/else/elif/option
   - Files: `parser.ts`

### Priority 2 (Medium Impact, Low Difficulty)

4. **Empty block validation** - Affects 4 tests
   - Add body.length checks in validate methods
   - Files: `validator.ts`

5. **Undefined variable in interpolation** - Affects 3 tests
   - Parse interpolations and check variable references
   - Files: `validator.ts`

6. **Block parameter as repeat count** - Affects 2 tests
   - Accept identifier for repeat count
   - Files: `parser.ts`, `ast.ts`

### Priority 3 (Low Impact, Medium Difficulty)

7. **Nested definition validation** - Affects 2 tests
   - Track parsing context and reject nested agent/block
   - Files: `parser.ts` or `validator.ts`

8. **Import ordering** - Affects 1 test
   - Track statement order and error on late imports
   - Files: `validator.ts`

9. **Double else/elif after else/catch after finally** - Affects 5 tests
   - Track clause state during if/try parsing
   - Files: `parser.ts`

### Priority 4 (Low Impact, Low Difficulty)

10. **Parallel strategy validation** - Affects 2-3 tests
    - Add branch count checks
    - Files: `validator.ts`

11. **Agent required properties** - Affects 2 tests
    - Check for model property
    - Files: `validator.ts`

12. **Variable use-before-declare** - Affects 1 test
    - Track declaration order
    - Files: `validator.ts`

### Priority 5 (Specialized, Higher Difficulty)

13. **Reduce parameter validation** - Affects 1 test
    - Ensure (acc, item) required
    - Files: `parser.ts`, `validator.ts`

14. **Interpolation syntax validation** - Affects 3 tests
    - Detect unclosed/nested braces
    - Files: `lexer.ts`

15. **Identifier validation tightening** - Affects 2 tests
    - Reject edge case identifiers
    - Files: `lexer.ts`

---

## Appendix: Complete Failure Lists

### Valid Tests That Fail (69 tests)

**Session Property Parsing (32 tests):**
- 020-context-inner-var.prose
- 034-loop-break-context.prose
- 046-parallel-shared-context.prose
- 047-parallel-results-merge.prose
- 061-try-with-retry.prose
- 064-try-with-context.prose
- 071-pmap-with-context.prose
- 080-block-with-context.prose
- 081-context-array-complex.prose
- 082-context-object.prose
- 093-if-with-context.prose
- 101-session-props-basic.prose
- 102-session-props-model.prose
- 103-session-props-context-var.prose
- 104-session-props-context-array.prose
- 105-session-props-context-object.prose
- 106-session-props-retry.prose
- 107-session-props-in-if.prose
- 108-session-props-in-loop.prose
- 109-session-props-in-parallel.prose
- 110-session-props-in-try.prose
- 123-block-param-in-context.prose
- 180-pipeline-filter-with-context.prose
- 199-context-empty-array.prose
- 221-context-object-nested.prose
- 222-context-array-large.prose
- 223-context-from-parallel.prose
- 224-context-from-loop.prose
- 225-context-in-pipeline.prose
- 226-context-chained.prose
- 227-context-in-block.prose
- 228-context-in-try.prose
- 229-context-in-choice.prose
- 230-context-mixed-types.prose
- 249-many-lets-then-context.prose

**Variable Scoping (20 tests):**
- 023-foreach-in-repeat.prose
- 024-nested-foreach.prose
- 029-repeat-parallel-for.prose
- 030-loop-index-shadowing.prose
- 031-triple-nested-loop.prose
- 035-nested-parallel-for.prose
- 111-let-repeat-then-foreach.prose
- 112-let-foreach-then-foreach.prose
- 113-let-loop-until-then-foreach.prose
- 115-let-if-branch-foreach.prose
- 116-let-try-then-foreach.prose
- 117-let-choice-then-foreach.prose
- 118-let-do-block-then-foreach.prose
- 119-let-parallel-then-foreach.prose
- 120-triple-nested-let-foreach.prose
- 164-agent-loop-context-let.prose
- 220-nested-foreach-different-vars.prose
- 241-6x-nesting.prose

**Parser Issues (10 tests):**
- 056-throw-with-interpolation.prose
- 069-pipeline-in-try.prose
- 077-block-params-multi.prose
- 085-recursive-like-block.prose
- 121-block-param-as-repeat-count.prose
- 168-multi-agent-handoff.prose
- 185-parallel-first-with-let.prose
- 189-parallel-for-with-modifiers.prose

**Other (7 tests):**
- 132-agent-with-skills.prose (passes with warnings)
- 133-agent-with-permissions.prose (passes with warnings)
- 151-loop-bare.prose (passes with warnings)
- 162-agent-session-retry.prose (backoff type error)
- 209-empty-string.prose (passes with warnings)
- 213-loop-var-same-name-outer.prose (passes with warnings)
- 214-nested-loop-same-index.prose (passes with warnings)

### Invalid Tests That Pass (38 tests)

**Orphan Clauses (6 tests):**
- 018-catch-without-try.prose
- 019-finally-without-try.prose
- 020-else-without-if.prose
- 021-elif-without-if.prose
- 022-option-without-choice.prose
- 096-option-outside-choice.prose

**Structural Validation (10 tests):**
- 014-empty-block.prose
- 015-empty-if.prose
- 016-empty-parallel.prose
- 045-agent-missing-model.prose
- 046-agent-missing-prompt.prose
- 048-pipeline-no-body.prose
- 056-nested-agent-def.prose
- 057-nested-block-def.prose
- 058-import-not-at-top.prose
- 091-nested-agent-definition.prose

**If/Try Clause Order (5 tests):**
- 051-double-else.prose
- 052-elif-after-else.prose
- 053-catch-after-finally.prose
- 054-double-catch.prose
- 055-double-finally.prose

**Variable/Scope (5 tests):**
- 034-undefined-variable.prose
- 071-undefined-variable.prose
- 072-variable-before-declaration.prose
- 074-block-param-outside-scope.prose
- 093-circular-block-call.prose

**Interpolation (4 tests):**
- 012-unclosed-interpolation.prose
- 094-unclosed-interpolation.prose
- 095-nested-interpolation.prose
- 013-invalid-keyword.prose

**Parallel Validation (3 tests):**
- 033-parallel-any-no-count.prose
- 059-parallel-single-branch-first.prose
- 060-parallel-any-count-too-high.prose (only warning)

**Pipeline/Reduce (2 tests):**
- 049-reduce-missing-params.prose
- 050-throw-in-toplevel.prose

**Identifier (2 tests):**
- 062-identifier-special-char.prose
- 068-identifier-only-underscore.prose

**Other (1 test):**
- 098-session-empty-prompt.prose (only warning)
