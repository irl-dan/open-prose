# OpenProse Validator Fix Approach

## Executive Summary

After thorough analysis of the codebase and test failures, I've identified that **there ARE elegant, unifying solutions** available. The issues are not arbitrary edge cases - they stem from a few architectural gaps that, when addressed, will fix multiple issues at once.

## The Core Insight

The validator has a fundamental architecture: **two-pass validation with flat variable maps**. This works well for simple programs but breaks down with:

1. **Nested scopes** - Variables defined in loops/blocks aren't visible to inner constructs
2. **Missing parse-time context** - The parser doesn't track what context it's in (e.g., "inside try block")
3. **Missing structural validation** - Many constraints are simply not checked

The good news: These are well-understood problems with established solutions.

---

## Unifying Solutions

### Solution 1: Scope Chain (fixes ~25 tests)

**Current Problem:** The validator uses `Map<string, VariableBinding>` for all variables, collected in a first pass from top-level statements only. Variables defined inside loops, blocks, or conditionals are invisible.

**Elegant Fix:** Replace flat map with a **scope stack**:

```typescript
interface Scope {
  variables: Map<string, VariableBinding>;
  parent: Scope | null;
}

private scopeStack: Scope[] = [];

private pushScope(): void {
  this.scopeStack.push({
    variables: new Map(),
    parent: this.scopeStack.length > 0 ? this.scopeStack[this.scopeStack.length - 1] : null
  });
}

private popScope(): void {
  this.scopeStack.pop();
}

private defineVariable(name: string, binding: VariableBinding): void {
  const currentScope = this.scopeStack[this.scopeStack.length - 1];
  if (currentScope.variables.has(name)) {
    this.addError(`Duplicate variable: "${name}"`, binding.span);
  }
  currentScope.variables.set(name, binding);
}

private lookupVariable(name: string): VariableBinding | null {
  for (let i = this.scopeStack.length - 1; i >= 0; i--) {
    const binding = this.scopeStack[i].variables.get(name);
    if (binding) return binding;
  }
  return null;
}
```

**This fixes:**
- 023-foreach-in-repeat.prose (variable defined in repeat visible in foreach)
- 024-nested-foreach.prose
- 111-let-repeat-then-foreach.prose
- All 20+ variable scoping failures
- 072-variable-before-declaration.prose (track declaration order)
- 074-block-param-outside-scope.prose (block params only visible in block)

### Solution 2: Parser Context Stack (fixes ~15 tests)

**Current Problem:** The parser's `parseStatement()` doesn't know what context it's in. It can't reject `catch:` at top level or `agent:` inside a block.

**Elegant Fix:** Add a **parsing context stack**:

```typescript
type ParsingContext = 'program' | 'block' | 'try' | 'if' | 'choice' | 'loop';

private contextStack: ParsingContext[] = ['program'];

private pushContext(ctx: ParsingContext): void {
  this.contextStack.push(ctx);
}

private popContext(): void {
  this.contextStack.pop();
}

private isInContext(ctx: ParsingContext): boolean {
  return this.contextStack.includes(ctx);
}

private currentContext(): ParsingContext {
  return this.contextStack[this.contextStack.length - 1];
}
```

Then in `parseStatement()`:
```typescript
// Reject orphan clauses
if (this.check(TokenType.CATCH)) {
  if (!this.isInContext('try')) {
    this.addError('"catch" without matching "try"');
  }
  // ... skip/recover
}

// Reject nested definitions
if (this.check(TokenType.AGENT) && this.currentContext() !== 'program') {
  this.addError('Agent definitions must be at top level');
  // ... skip/recover
}
```

**This fixes:**
- 018-catch-without-try.prose
- 019-finally-without-try.prose
- 020-else-without-if.prose
- 021-elif-without-if.prose
- 022-option-without-choice.prose
- 056-nested-agent-def.prose
- 057-nested-block-def.prose
- 058-import-not-at-top.prose

### Solution 3: Session Property Syntax Fix (fixes ~32 tests)

**Current Problem:** The parser's `parseSessionStatement()` expects `session: identifier` but fails when session has only properties without an explicit agent name:

```prose
session:
  prompt: "Hello"
```

The parser sees `session:` followed by NEWLINE+INDENT and a property starting with `prompt:`, but it expects an identifier after the colon.

**Elegant Fix:** Modify `parseSessionStatement()` to handle the property-only case:

```typescript
// After consuming 'session'
if (this.check(TokenType.COLON)) {
  this.advance(); // consume ':'

  // Check if next is identifier (agent name) or NEWLINE (properties-only)
  if (this.check(TokenType.IDENTIFIER)) {
    agent = this.parseIdentifier();
  } else if (this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
    // Properties-only session - no agent name, just properties block
    // Continue to property parsing below
  } else {
    this.addError('Expected agent name or property block after "session:"');
  }
}
```

**This fixes:**
- 101-session-props-basic.prose
- 102-session-props-model.prose
- All 32+ session property test failures

### Solution 4: Interpolation Validation (fixes ~7 tests)

**Current Problem:** Interpolated variables `{varname}` in strings are never validated against the scope.

**Elegant Fix:** Single method that validates all string interpolations:

```typescript
private validateInterpolatedString(str: StringLiteralNode): void {
  // Check for unclosed interpolation
  const unclosedMatch = str.value.match(/\{[^}]*$/);
  if (unclosedMatch) {
    this.addError('Unclosed interpolation brace', str.span);
    return;
  }

  // Check for nested interpolation
  if (str.value.includes('{{') || str.value.includes('}}')) {
    this.addError('Nested interpolation braces are not allowed', str.span);
    return;
  }

  // Validate each interpolated variable
  const interpolationRegex = /\{(\w+)\}/g;
  let match;
  while ((match = interpolationRegex.exec(str.value)) !== null) {
    const varName = match[1];
    if (!this.lookupVariable(varName)) {
      this.addError(`Undefined variable in interpolation: "${varName}"`, str.span);
    }
  }
}
```

**This fixes:**
- 012-unclosed-interpolation.prose
- 034-undefined-variable.prose
- 071-undefined-variable.prose
- 094-unclosed-interpolation.prose
- 095-nested-interpolation.prose

### Solution 5: Structural Validations (fixes ~15 tests)

Simple validation additions that are quick wins:

**Empty block validation:**
```typescript
if (block.body.length === 0) {
  this.addError('Block body cannot be empty', block.span);
}
```

**Agent required properties:**
```typescript
const hasModel = agent.properties.some(p => p.name.name === 'model');
if (!hasModel) {
  this.addError('Agent definition requires "model" property', agent.span);
}
```

**Parallel strategy validation:**
```typescript
if (strategy === 'any' && !parallel.anyCount) {
  this.addError('Parallel "any" strategy requires count parameter', parallel.span);
}
if ((strategy === 'first' || strategy === 'any') && parallel.body.length < 2) {
  this.addError(`Parallel "${strategy}" needs at least 2 branches`, parallel.span);
}
```

---

## Implementation Priority

### Phase 1: High Impact, Unifying (do first)
1. **Scope chain** - Fixes 25+ tests, foundational change
2. **Session property syntax** - Fixes 32+ tests, parser fix

### Phase 2: Medium Impact, Quick Wins
3. **Orphan clause detection** - Fixes 6 tests, simple parser additions
4. **Empty block validation** - Fixes 4 tests, simple validator additions
5. **Interpolation validation** - Fixes 7 tests, new validator method

### Phase 3: Cleanup
6. **Structural validations** - Agent model, parallel strategies, etc.
7. **Import ordering** - Track first non-import statement

---

## Assessment: Elegant vs Edge-Case

**The verdict: These are ELEGANT fixes, not endless edge-cases.**

The issues share common roots:
- No scope tracking = 25+ failures from one gap
- No context tracking = 15+ failures from one gap
- Missing property-only session syntax = 32+ failures from one gap
- No interpolation validation = 7+ failures from one gap

With 4-5 well-architected changes, we can fix 80+ test failures. The remaining issues are genuine edge cases that need specific handling, but they're the minority.

**This codebase IS approaching something solid.** The parser and validator are well-structured; they just need these foundational pieces added.

---

## Risk Assessment

1. **Scope chain change is invasive** - Need to update all validation methods that check variables. But the pattern is consistent.

2. **Session property syntax may have edge cases** - Need to test thoroughly with agents + properties combinations.

3. **Context stack adds complexity** - But it's well-understood from other parsers.

4. **Test order matters** - Fix scope chain first since other fixes depend on proper variable lookup.

---

## Files to Modify

1. `/Users/sl/code/open-prose/plugin/src/validator/validator.ts`
   - Add scope chain
   - Add interpolation validation
   - Add structural validations

2. `/Users/sl/code/open-prose/plugin/src/parser/parser.ts`
   - Add context stack
   - Fix session property syntax
   - Add orphan clause detection

3. `/Users/sl/code/open-prose/plugin/src/parser/lexer.ts`
   - Minor: unclosed interpolation detection (may already exist)

---

## Conclusion

This is a well-architected codebase with specific gaps. The fixes are architectural improvements, not band-aids. After these changes, the validator will be robust and maintainable.

Let's implement.
