/**
 * Error Handling Tests (Tier 11)
 *
 * Tests for error handling constructs:
 * - try/catch: basic error handling
 * - try/catch/finally: with cleanup
 * - catch as err: error variable access
 * - throw: raise/rethrow errors
 * - retry: session retry property
 * - backoff: retry backoff strategy
 */

import { parse, tokenize } from '../parser';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compileToString } from '../compiler';

describe('Error Handling (Tier 11)', () => {
  describe('Lexer', () => {
    it('should tokenize TRY keyword', () => {
      const result = tokenize('try:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.TRY);
      expect(tokens[0].value).toBe('try');
      expect(tokens[1].type).toBe(TokenType.COLON);
    });

    it('should tokenize CATCH keyword', () => {
      const result = tokenize('catch:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.CATCH);
      expect(tokens[0].value).toBe('catch');
    });

    it('should tokenize FINALLY keyword', () => {
      const result = tokenize('finally:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.FINALLY);
      expect(tokens[0].value).toBe('finally');
    });

    it('should tokenize THROW keyword', () => {
      const result = tokenize('throw');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(1);
      expect(tokens[0].type).toBe(TokenType.THROW);
      expect(tokens[0].value).toBe('throw');
    });

    it('should tokenize RETRY keyword', () => {
      const result = tokenize('retry:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.RETRY);
      expect(tokens[0].value).toBe('retry');
    });

    it('should tokenize BACKOFF keyword', () => {
      const result = tokenize('backoff:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.BACKOFF);
      expect(tokens[0].value).toBe('backoff');
    });

    it('should tokenize catch as err', () => {
      const result = tokenize('catch as err:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(4);  // catch as err :
      expect(tokens[0].type).toBe(TokenType.CATCH);
      expect(tokens[1].type).toBe(TokenType.AS);
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('err');
      expect(tokens[3].type).toBe(TokenType.COLON);
    });

    it('should tokenize throw with message', () => {
      const result = tokenize('throw "error message"');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.THROW);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('error message');
    });
  });

  describe('Parser - Try/Catch', () => {
    it('should parse basic try/catch block', () => {
      const source = `try:
  session "Risky operation"
catch:
  session "Handle error"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('TryBlock');

      const tryBlock = stmt as any;
      expect(tryBlock.tryBody).toHaveLength(1);
      expect(tryBlock.tryBody[0].type).toBe('SessionStatement');
      expect(tryBlock.catchBody).toHaveLength(1);
      expect(tryBlock.catchBody[0].type).toBe('SessionStatement');
      expect(tryBlock.finallyBody).toBeNull();
      expect(tryBlock.errorVar).toBeNull();
    });

    it('should parse try/catch with error variable', () => {
      const source = `try:
  session "Risky operation"
catch as err:
  session "Handle error"
    context: err`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('TryBlock');

      const tryBlock = stmt as any;
      expect(tryBlock.errorVar).not.toBeNull();
      expect(tryBlock.errorVar.name).toBe('err');
    });

    it('should parse try/finally (no catch)', () => {
      const source = `try:
  session "Acquire resource"
finally:
  session "Always cleanup"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('TryBlock');

      const tryBlock = stmt as any;
      expect(tryBlock.tryBody).toHaveLength(1);
      expect(tryBlock.catchBody).toBeNull();
      expect(tryBlock.finallyBody).toHaveLength(1);
    });

    it('should parse try/catch/finally', () => {
      const source = `try:
  session "Risky operation"
catch:
  session "Handle error"
finally:
  session "Always cleanup"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('TryBlock');

      const tryBlock = stmt as any;
      expect(tryBlock.tryBody).toHaveLength(1);
      expect(tryBlock.catchBody).toHaveLength(1);
      expect(tryBlock.finallyBody).toHaveLength(1);
    });

    it('should parse try with multiple statements in body', () => {
      const source = `try:
  session "Step 1"
  session "Step 2"
  session "Step 3"
catch:
  session "Handle"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const tryBlock = result.program.statements[0] as any;
      expect(tryBlock.tryBody).toHaveLength(3);
    });

    it('should error on try without catch or finally', () => {
      const source = `try:
  session "Risky operation"
session "Next"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes('catch') || e.message.includes('finally'))).toBe(true);
    });
  });

  describe('Parser - Throw', () => {
    it('should parse bare throw (rethrow)', () => {
      const source = `throw`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('ThrowStatement');

      const throwStmt = stmt as any;
      expect(throwStmt.message).toBeNull();
    });

    it('should parse throw with message', () => {
      const source = `throw "Something went wrong"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('ThrowStatement');

      const throwStmt = stmt as any;
      expect(throwStmt.message).not.toBeNull();
      expect(throwStmt.message.value).toBe('Something went wrong');
    });

    it('should parse throw inside try block', () => {
      const source = `try:
  session "Check preconditions"
  throw "Precondition failed"
catch:
  session "Handle error"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const tryBlock = result.program.statements[0] as any;
      expect(tryBlock.tryBody).toHaveLength(2);
      expect(tryBlock.tryBody[1].type).toBe('ThrowStatement');
    });
  });

  describe('Parser - Retry Property', () => {
    it('should parse session with retry property', () => {
      const source = `session "Call API"
  retry: 3`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('SessionStatement');

      const session = stmt as any;
      expect(session.properties).toHaveLength(1);
      expect(session.properties[0].name.name).toBe('retry');
      expect(session.properties[0].value.value).toBe(3);
    });

    it('should parse session with retry and backoff', () => {
      const source = `session "Rate-limited API"
  retry: 5
  backoff: "exponential"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as any;
      expect(session.properties).toHaveLength(2);

      const retryProp = session.properties.find((p: any) => p.name.name === 'retry');
      const backoffProp = session.properties.find((p: any) => p.name.name === 'backoff');

      expect(retryProp.value.value).toBe(5);
      expect(backoffProp.value.value).toBe('exponential');
    });

    it('should parse session with retry, backoff, and context', () => {
      const source = `let data = session "Fetch data"
session "Process data"
  context: data
  retry: 3
  backoff: "linear"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[1] as any;
      expect(session.properties).toHaveLength(3);
    });
  });

  describe('Parser - Nested Try/Catch', () => {
    it('should parse nested try/catch blocks', () => {
      const source = `try:
  try:
    session "Inner risky operation"
  catch:
    session "Handle inner error"
  session "Continue after inner try"
catch:
  session "Handle outer error"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const outerTry = result.program.statements[0] as any;
      expect(outerTry.type).toBe('TryBlock');
      expect(outerTry.tryBody).toHaveLength(2);

      const innerTry = outerTry.tryBody[0];
      expect(innerTry.type).toBe('TryBlock');
    });
  });

  describe('Parser - Try in Parallel', () => {
    it('should parse try inside parallel block', () => {
      const source = `parallel:
  try:
    session "Branch A might fail"
  catch:
    session "Recover branch A"
  session "Branch B"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as any;
      expect(parallel.type).toBe('ParallelBlock');
      expect(parallel.body).toHaveLength(2);
      expect(parallel.body[0].type).toBe('TryBlock');
      expect(parallel.body[1].type).toBe('SessionStatement');
    });
  });

  describe('Validator - Try/Catch', () => {
    it('should validate basic try/catch', () => {
      const source = `try:
  session "Risky operation"
catch:
  session "Handle error"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate try/catch with error variable', () => {
      const source = `try:
  session "Risky operation"
catch as err:
  session "Handle error"
    context: err`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on try without catch or finally', () => {
      const source = `try:
  session "Risky"`;

      const result = parse(source);
      // Error should come from parser or validator
      expect(result.errors.length > 0 || !validate(result.program).valid).toBe(true);
    });

    it('should warn when error variable shadows outer variable', () => {
      const source = `let err = session "Previous"
try:
  session "Risky"
catch as err:
  session "Handle"
    context: err`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });

    it('should error when error variable used outside catch', () => {
      const source = `try:
  session "Risky"
catch as err:
  session "Handle"
session "After"
  context: err`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined'))).toBe(true);
    });
  });

  describe('Validator - Throw', () => {
    it('should validate throw without message', () => {
      const source = `try:
  throw
catch:
  session "Handle"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should validate throw with message', () => {
      const source = `try:
  throw "Error occurred"
catch:
  session "Handle"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should warn on empty throw message', () => {
      const source = `throw ""`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.warnings.some(w => w.message.includes('empty'))).toBe(true);
    });
  });

  describe('Validator - Retry', () => {
    it('should validate session with valid retry count', () => {
      const source = `session "API call"
  retry: 3`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on non-positive retry count', () => {
      const source = `session "API call"
  retry: 0`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('positive'))).toBe(true);
    });

    it('should error on negative retry count (invalid syntax)', () => {
      // Note: -1 is not parsed as a single number, so this results in a parse error
      // or the retry property not having a valid value
      const source = `session "API call"
  retry: -1`;

      const result = parse(source);
      // Either parse errors or validation errors should occur
      const hasErrors = result.errors.length > 0 || !validate(result.program).valid;
      expect(hasErrors).toBe(true);
    });

    it('should error on non-integer retry count', () => {
      const source = `session "API call"
  retry: 2.5`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('integer'))).toBe(true);
    });

    it('should warn on high retry count', () => {
      const source = `session "API call"
  retry: 15`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.warnings.some(w => w.message.includes('high'))).toBe(true);
    });
  });

  describe('Validator - Backoff', () => {
    it('should validate valid backoff strategies', () => {
      const strategies = ['none', 'linear', 'exponential'];

      for (const strategy of strategies) {
        const source = `session "API call"
  retry: 3
  backoff: "${strategy}"`;

        const result = parse(source);
        const validation = validate(result.program);

        expect(validation.valid).toBe(true);
      }
    });

    it('should error on invalid backoff strategy', () => {
      const source = `session "API call"
  retry: 3
  backoff: "invalid"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('backoff') || e.message.includes('Invalid'))).toBe(true);
    });
  });

  describe('Compiler - Try/Catch', () => {
    it('should compile basic try/catch', () => {
      const source = `try:
  session "Risky"
catch:
  session "Handle"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('try:');
      expect(output).toContain('catch:');
      expect(output).toContain('session "Risky"');
      expect(output).toContain('session "Handle"');
    });

    it('should compile try/catch with error variable', () => {
      const source = `try:
  session "Risky"
catch as err:
  session "Handle"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('catch as err:');
    });

    it('should compile try/catch/finally', () => {
      const source = `try:
  session "Risky"
catch:
  session "Handle"
finally:
  session "Cleanup"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('try:');
      expect(output).toContain('catch:');
      expect(output).toContain('finally:');
    });

    it('should compile try/finally (no catch)', () => {
      const source = `try:
  session "Risky"
finally:
  session "Cleanup"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('try:');
      expect(output).not.toContain('catch:');
      expect(output).toContain('finally:');
    });
  });

  describe('Compiler - Throw', () => {
    it('should compile throw without message', () => {
      const source = `throw`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output.trim()).toBe('throw');
    });

    it('should compile throw with message', () => {
      const source = `throw "Error occurred"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('throw "Error occurred"');
    });
  });

  describe('Compiler - Retry', () => {
    it('should compile session with retry', () => {
      const source = `session "API call"
  retry: 3`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('retry: 3');
    });

    it('should compile session with retry and backoff', () => {
      const source = `session "API call"
  retry: 5
  backoff: "exponential"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('retry: 5');
      expect(output).toContain('backoff: "exponential"');
    });
  });

  describe('Integration', () => {
    it('should handle complete try/catch workflow', () => {
      const source = `# Error handling workflow
try:
  session "Attempt risky operation"
catch as err:
  session "Log and handle error"
    context: err
finally:
  session "Always run cleanup"

session "Continue after error handling"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const output = compileToString(result.program);
      expect(output).toContain('try:');
      expect(output).toContain('catch as err:');
      expect(output).toContain('finally:');
    });

    it('should handle retry with error handling', () => {
      const source = `try:
  session "Call flaky API"
    retry: 3
    backoff: "exponential"
catch:
  session "All retries failed"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const output = compileToString(result.program);
      expect(output).toContain('retry: 3');
      expect(output).toContain('backoff: "exponential"');
    });

    it('should handle nested try/catch with throw', () => {
      const source = `try:
  try:
    session "Inner operation"
    throw "Inner error"
  catch:
    session "Handle inner"
    throw
catch:
  session "Handle outer"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle try inside parallel branches', () => {
      const source = `parallel:
  try:
    session "Branch A"
  catch:
    session "Handle A"
  try:
    session "Branch B"
  catch:
    session "Handle B"

session "After parallel"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty try body', () => {
      const source = `try:
catch:
  session "Handle"`;

      const result = parse(source);
      const tryBlock = result.program.statements[0] as any;
      expect(tryBlock.tryBody).toHaveLength(0);
    });

    it('should handle empty catch body', () => {
      const source = `try:
  session "Risky"
catch:`;

      const result = parse(source);
      const tryBlock = result.program.statements[0] as any;
      expect(tryBlock.catchBody).toHaveLength(0);
    });

    it('should handle try with inline comment', () => {
      const source = `try:  # Attempt risky operation
  session "Risky"
catch:
  session "Handle"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle deeply nested try/catch', () => {
      const source = `try:
  try:
    try:
      session "Deep operation"
    catch:
      session "Handle level 3"
  catch:
    session "Handle level 2"
catch:
  session "Handle level 1"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle try inside loop', () => {
      const source = `repeat 3:
  try:
    session "Attempt"
  catch:
    session "Handle"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle try inside for-each', () => {
      const source = `let items = ["a", "b", "c"]
for item in items:
  try:
    session "Process"
      context: item
  catch:
    session "Handle"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should error on missing colon after try', () => {
      const source = `try
  session "Risky"
catch:
  session "Handle"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes(':') || e.message.includes('colon'))).toBe(true);
    });

    it('should error on missing colon after catch', () => {
      const source = `try:
  session "Risky"
catch
  session "Handle"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes(':') || e.message.includes('colon'))).toBe(true);
    });

    it('should error on missing colon after finally', () => {
      const source = `try:
  session "Risky"
finally
  session "Cleanup"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes(':') || e.message.includes('colon'))).toBe(true);
    });

    it('should error on invalid error variable name', () => {
      const source = `try:
  session "Risky"
catch as:
  session "Handle"`;

      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn on retry in agent definition', () => {
      const source = `agent myAgent:
  model: sonnet
  retry: 3`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.warnings.some(w => w.message.includes('session'))).toBe(true);
    });

    it('should warn on backoff in agent definition', () => {
      const source = `agent myAgent:
  model: sonnet
  backoff: "linear"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.warnings.some(w => w.message.includes('session'))).toBe(true);
    });
  });
});
