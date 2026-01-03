/**
 * Unit tests for OpenProse Advanced Parallel (Tier 7)
 *
 * Tests join strategies, failure policies, and count modifiers.
 */

import { parse } from '../parser';
import { tokenize } from '../parser/lexer';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compile, compileToString } from '../compiler';
import { getSemanticTokens, SemanticTokenType } from '../lsp/semantic-tokens';
import {
  ParallelBlockNode,
  SessionStatementNode,
} from '../parser/ast';

describe('Advanced Parallel (Tier 7)', () => {
  describe('Lexer - Modifier Tokens', () => {
    it('should tokenize parallel with modifiers', () => {
      const result = tokenize('parallel ("first"):');

      expect(result.errors).toHaveLength(0);
      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens.some(t => t.type === TokenType.PARALLEL)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.LPAREN)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.STRING && t.value === 'first')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.RPAREN)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.COLON)).toBe(true);
    });

    it('should tokenize on-fail modifier', () => {
      const result = tokenize('parallel (on-fail: "continue"):');

      expect(result.errors).toHaveLength(0);
      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens.some(t => t.type === TokenType.IDENTIFIER && t.value === 'on-fail')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.STRING && t.value === 'continue')).toBe(true);
    });

    it('should tokenize count modifier', () => {
      const result = tokenize('parallel ("any", count: 2):');

      expect(result.errors).toHaveLength(0);
      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens.some(t => t.type === TokenType.STRING && t.value === 'any')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.IDENTIFIER && t.value === 'count')).toBe(true);
      expect(tokens.some(t => t.type === TokenType.NUMBER && t.value === '2')).toBe(true);
    });
  });

  describe('Parser - Join Strategies', () => {
    it('should parse parallel ("first")', () => {
      const source = `parallel ("first"):
  session "Try approach A"
  session "Try approach B"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.type).toBe('ParallelBlock');
      expect(parallel.joinStrategy).not.toBeNull();
      expect(parallel.joinStrategy!.value).toBe('first');
      expect(parallel.body).toHaveLength(2);
    });

    it('should parse parallel ("any")', () => {
      const source = `parallel ("any"):
  session "Attempt 1"
  session "Attempt 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy!.value).toBe('any');
    });

    it('should parse parallel ("all") explicitly', () => {
      const source = `parallel ("all"):
  session "Task A"
  session "Task B"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy!.value).toBe('all');
    });

    it('should parse parallel ("any", count: 2)', () => {
      const source = `parallel ("any", count: 2):
  session "Attempt 1"
  session "Attempt 2"
  session "Attempt 3"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy!.value).toBe('any');
      expect(parallel.anyCount).not.toBeNull();
      expect(parallel.anyCount!.value).toBe(2);
      expect(parallel.body).toHaveLength(3);
    });
  });

  describe('Parser - Failure Policies', () => {
    it('should parse parallel (on-fail: "continue")', () => {
      const source = `parallel (on-fail: "continue"):
  session "Risky operation 1"
  session "Risky operation 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.onFail).not.toBeNull();
      expect(parallel.onFail!.value).toBe('continue');
      expect(parallel.joinStrategy).toBeNull(); // No strategy specified
    });

    it('should parse parallel (on-fail: "ignore")', () => {
      const source = `parallel (on-fail: "ignore"):
  session "Optional task 1"
  session "Optional task 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.onFail!.value).toBe('ignore');
    });

    it('should parse parallel (on-fail: "fail-fast")', () => {
      const source = `parallel (on-fail: "fail-fast"):
  session "Task 1"
  session "Task 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.onFail!.value).toBe('fail-fast');
    });
  });

  describe('Parser - Combined Modifiers', () => {
    it('should parse parallel ("first", on-fail: "continue")', () => {
      const source = `parallel ("first", on-fail: "continue"):
  session "Approach A"
  session "Approach B"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy!.value).toBe('first');
      expect(parallel.onFail!.value).toBe('continue');
    });

    it('should parse parallel ("any", count: 2, on-fail: "ignore")', () => {
      const source = `parallel ("any", count: 2, on-fail: "ignore"):
  session "Task 1"
  session "Task 2"
  session "Task 3"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy!.value).toBe('any');
      expect(parallel.anyCount!.value).toBe(2);
      expect(parallel.onFail!.value).toBe('ignore');
    });

    it('should parse modifiers in different order: on-fail first', () => {
      const source = `parallel (on-fail: "continue", "first"):
  session "A"
  session "B"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy!.value).toBe('first');
      expect(parallel.onFail!.value).toBe('continue');
    });
  });

  describe('Validator - Join Strategies', () => {
    it('should validate valid join strategies', () => {
      const strategies = ['all', 'first', 'any'];

      for (const strategy of strategies) {
        const source = `parallel ("${strategy}"):
  session "Task"`;

        const result = parse(source);
        const validation = validate(result.program);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should error on invalid join strategy', () => {
      const source = `parallel ("invalid"):
  session "Task"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e =>
        e.message.includes('Invalid join strategy') && e.message.includes('invalid')
      )).toBe(true);
    });
  });

  describe('Validator - Failure Policies', () => {
    it('should validate valid on-fail policies', () => {
      const policies = ['fail-fast', 'continue', 'ignore'];

      for (const policy of policies) {
        const source = `parallel (on-fail: "${policy}"):
  session "Task"`;

        const result = parse(source);
        const validation = validate(result.program);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should error on invalid on-fail policy', () => {
      const source = `parallel (on-fail: "invalid"):
  session "Task"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e =>
        e.message.includes('Invalid on-fail policy') && e.message.includes('invalid')
      )).toBe(true);
    });
  });

  describe('Validator - Count Modifier', () => {
    it('should validate count with "any" strategy', () => {
      const source = `parallel ("any", count: 2):
  session "Task 1"
  session "Task 2"
  session "Task 3"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should error on count without "any" strategy', () => {
      const source = `parallel ("first", count: 2):
  session "Task 1"
  session "Task 2"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e =>
        e.message.includes('count') && e.message.includes('any')
      )).toBe(true);
    });

    it('should error on count with no strategy', () => {
      const source = `parallel (count: 2):
  session "Task 1"
  session "Task 2"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e =>
        e.message.includes('count') && e.message.includes('any')
      )).toBe(true);
    });

    it('should error on count less than 1', () => {
      const source = `parallel ("any", count: 0):
  session "Task 1"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e =>
        e.message.includes('Count must be at least 1')
      )).toBe(true);
    });

    it('should warn when count exceeds branch count', () => {
      const source = `parallel ("any", count: 5):
  session "Task 1"
  session "Task 2"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true); // Warning, not error
      expect(validation.warnings.some(w =>
        w.message.includes('exceeds')
      )).toBe(true);
    });
  });

  describe('Compiler - Join Strategies', () => {
    it('should compile parallel ("first")', () => {
      const source = `parallel ("first"):
  session "A"
  session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel ("first"):');
      expect(compiled).toContain('session "A"');
      expect(compiled).toContain('session "B"');
    });

    it('should compile parallel ("any")', () => {
      const source = `parallel ("any"):
  session "A"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel ("any"):');
    });

    it('should compile parallel ("any", count: 2)', () => {
      const source = `parallel ("any", count: 2):
  session "A"
  session "B"
  session "C"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel ("any", count: 2):');
    });
  });

  describe('Compiler - Failure Policies', () => {
    it('should compile parallel (on-fail: "continue")', () => {
      const source = `parallel (on-fail: "continue"):
  session "A"
  session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel (on-fail: "continue"):');
    });

    it('should compile parallel (on-fail: "ignore")', () => {
      const source = `parallel (on-fail: "ignore"):
  session "A"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel (on-fail: "ignore"):');
    });
  });

  describe('Compiler - Combined Modifiers', () => {
    it('should compile parallel with strategy and on-fail', () => {
      const source = `parallel ("first", on-fail: "continue"):
  session "A"
  session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('"first"');
      expect(compiled).toContain('on-fail: "continue"');
    });

    it('should compile all modifiers together', () => {
      const source = `parallel ("any", count: 2, on-fail: "ignore"):
  session "A"
  session "B"
  session "C"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('"any"');
      expect(compiled).toContain('count: 2');
      expect(compiled).toContain('on-fail: "ignore"');
    });

    it('should compile let binding with modified parallel', () => {
      const source = `let result = parallel ("first"):
  session "A"
  session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('let result = parallel ("first"):');
    });
  });

  describe('Semantic Tokens', () => {
    it('should highlight parallel keyword in modifier syntax', () => {
      const tokens = getSemanticTokens('parallel ("first"):');

      const parallelToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(parallelToken).toBeDefined();
    });

    it('should highlight strategy string as String type', () => {
      const tokens = getSemanticTokens('parallel ("first"):');

      const stringToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.String
      );
      expect(stringToken).toBeDefined();
    });

    it('should highlight modifier names as Variable (identifier) type', () => {
      const tokens = getSemanticTokens('parallel (on-fail: "continue"):');

      const identifierToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Variable
      );
      expect(identifierToken).toBeDefined();
    });

    it('should highlight count number as Number type', () => {
      const tokens = getSemanticTokens('parallel ("any", count: 2):');

      const numberToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Number
      );
      expect(numberToken).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete race pattern', () => {
      const source = `# Race: first to complete wins
parallel ("first"):
  session "Try approach A via API"
  session "Try approach B via cache"
  session "Try approach C via database"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compileToString(result.program);
      expect(compiled).toContain('parallel ("first"):');
    });

    it('should handle complete any-N pattern', () => {
      const source = `# Get any 2 successful results
parallel ("any", count: 2):
  session "Approach 1"
  session "Approach 2"
  session "Approach 3"
  session "Approach 4"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle resilient parallel pattern', () => {
      const source = `# Continue even if some tasks fail
parallel (on-fail: "continue"):
  session "Required task 1"
  session "Required task 2"
  session "Best-effort task 3"

session "Process all results, including failures"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle ignore-failures pattern', () => {
      const source = `# Ignore all failures
parallel (on-fail: "ignore"):
  session "Optional enrichment 1"
  session "Optional enrichment 2"

session "Continue regardless"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle named results with modifiers', () => {
      const source = `parallel ("first"):
  winner = session "Fast approach"
  backup = session "Slow approach"

session "Use the winner"
  context: { winner }`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle nested modified parallel blocks', () => {
      const source = `do:
  session "Setup"
  parallel ("first", on-fail: "continue"):
    session "Race 1"
    session "Race 2"
  session "Continue"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty modifiers (just parentheses)', () => {
      const source = `parallel ():
  session "Task"`;

      const result = parse(source);
      // Empty parentheses are allowed, no modifiers specified
      expect(result.program.statements).toHaveLength(1);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy).toBeNull();
      expect(parallel.onFail).toBeNull();
      expect(parallel.anyCount).toBeNull();
    });

    it('should preserve modifiers through compile roundtrip', () => {
      const source = `parallel ("any", count: 3, on-fail: "ignore"):
  session "A"
  session "B"
  session "C"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      // Parse the compiled output
      const result2 = parse(compiled);
      expect(result2.errors).toHaveLength(0);

      const parallel2 = result2.program.statements[0] as ParallelBlockNode;
      expect(parallel2.joinStrategy!.value).toBe('any');
      expect(parallel2.anyCount!.value).toBe(3);
      expect(parallel2.onFail!.value).toBe('ignore');
    });

    it('should handle whitespace in modifiers', () => {
      const source = `parallel (  "first"  ,  on-fail:  "continue"  ):
  session "Task"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.joinStrategy!.value).toBe('first');
      expect(parallel.onFail!.value).toBe('continue');
    });

    it('should handle decimal count (will be parsed as number)', () => {
      const source = `parallel ("any", count: 2.5):
  session "A"
  session "B"
  session "C"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.anyCount!.value).toBe(2.5);
    });
  });

  describe('Error Cases', () => {
    it('should error on duplicate join strategy', () => {
      const source = `parallel ("first", "any"):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes('Duplicate join strategy')
      )).toBe(true);
    });

    it('should error on duplicate on-fail', () => {
      const source = `parallel (on-fail: "continue", on-fail: "ignore"):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes('Duplicate on-fail')
      )).toBe(true);
    });

    it('should error on duplicate count', () => {
      const source = `parallel ("any", count: 2, count: 3):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes('Duplicate count')
      )).toBe(true);
    });

    it('should error on unknown modifier', () => {
      const source = `parallel (unknown: "value"):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes('Unknown parallel modifier')
      )).toBe(true);
    });

    it('should error on missing colon after on-fail', () => {
      const source = `parallel (on-fail "continue"):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes(':')
      )).toBe(true);
    });

    it('should error on missing value for on-fail', () => {
      const source = `parallel (on-fail:):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes('Expected string value')
      )).toBe(true);
    });

    it('should error on non-string value for on-fail', () => {
      const source = `parallel (on-fail: 123):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes('Expected string value')
      )).toBe(true);
    });

    it('should error on non-number value for count', () => {
      const source = `parallel ("any", count: "two"):
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes('Expected number value')
      )).toBe(true);
    });

    it('should error on missing closing paren', () => {
      const source = `parallel ("first":
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e =>
        e.message.includes(')')
      )).toBe(true);
    });
  });
});
