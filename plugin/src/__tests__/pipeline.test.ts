/**
 * Pipeline Operations Tests (Tier 10)
 *
 * Tests for functional-style collection transformations:
 * - map: transform each item
 * - filter: keep items matching a condition
 * - reduce: accumulate into a single result
 * - pmap: parallel map (like map but concurrent)
 * - chaining: compose multiple operations
 */

import { parse, tokenize, Parser } from '../parser';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compile, compileToString } from '../compiler';

describe('Pipeline Operations (Tier 10)', () => {
  describe('Lexer', () => {
    it('should tokenize PIPE operator', () => {
      const result = tokenize('items | map:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(4);  // items | map :
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('items');
      expect(tokens[1].type).toBe(TokenType.PIPE);
      expect(tokens[1].value).toBe('|');
      expect(tokens[2].type).toBe(TokenType.MAP);
      expect(tokens[3].type).toBe(TokenType.COLON);
    });

    it('should tokenize MAP keyword', () => {
      const result = tokenize('map:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.MAP);
      expect(tokens[0].value).toBe('map');
    });

    it('should tokenize FILTER keyword', () => {
      const result = tokenize('filter:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.FILTER);
      expect(tokens[0].value).toBe('filter');
    });

    it('should tokenize REDUCE keyword', () => {
      const result = tokenize('reduce(acc, item):');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(7);  // reduce ( acc , item ) :
      expect(tokens[0].type).toBe(TokenType.REDUCE);
      expect(tokens[0].value).toBe('reduce');
      expect(tokens[1].type).toBe(TokenType.LPAREN);
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('acc');
      expect(tokens[3].type).toBe(TokenType.COMMA);
      expect(tokens[4].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[4].value).toBe('item');
      expect(tokens[5].type).toBe(TokenType.RPAREN);
      expect(tokens[6].type).toBe(TokenType.COLON);
    });

    it('should tokenize PMAP keyword', () => {
      const result = tokenize('pmap:');
      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
      expect(tokens.length).toBe(2);
      expect(tokens[0].type).toBe(TokenType.PMAP);
      expect(tokens[0].value).toBe('pmap');
    });

    it('should tokenize chained pipe operations', () => {
      const result = tokenize('items | filter: | map:');
      const pipeTokens = result.tokens.filter(t => t.type === TokenType.PIPE);
      expect(pipeTokens.length).toBe(2);
    });
  });

  describe('Parser - Map', () => {
    it('should parse simple map expression', () => {
      const source = `let results = items | map:
  session "Process"
    context: item`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const stmt = result.program.statements[0];
      expect(stmt.type).toBe('LetBinding');

      const binding = stmt as any;
      expect(binding.value.type).toBe('PipeExpression');

      const pipe = binding.value;
      expect(pipe.input.type).toBe('Identifier');
      expect(pipe.input.name).toBe('items');
      expect(pipe.operations).toHaveLength(1);

      const op = pipe.operations[0];
      expect(op.type).toBe('PipeOperation');
      expect(op.operator).toBe('map');
      expect(op.body).toHaveLength(1);
    });

    it('should parse map with array literal input', () => {
      const source = `let results = ["a", "b", "c"] | map:
  session "Process"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      expect(binding.value.type).toBe('PipeExpression');
      expect(binding.value.input.type).toBe('ArrayExpression');
      expect(binding.value.input.elements).toHaveLength(3);
    });
  });

  describe('Parser - Filter', () => {
    it('should parse simple filter expression', () => {
      const source = `let valid = items | filter:
  session "Is this valid?"
    context: item`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      expect(binding.value.type).toBe('PipeExpression');

      const op = binding.value.operations[0];
      expect(op.operator).toBe('filter');
    });
  });

  describe('Parser - Reduce', () => {
    it('should parse simple reduce expression', () => {
      const source = `let combined = items | reduce(acc, x):
  session "Combine"
    context: [acc, x]`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      expect(binding.value.type).toBe('PipeExpression');

      const op = binding.value.operations[0];
      expect(op.operator).toBe('reduce');
      expect(op.accVar).not.toBeNull();
      expect(op.accVar.name).toBe('acc');
      expect(op.itemVar).not.toBeNull();
      expect(op.itemVar.name).toBe('x');
    });

    it('should parse reduce with custom variable names', () => {
      const source = `let combined = items | reduce(summary, idea):
  session "Merge"
    context: [summary, idea]`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      const op = binding.value.operations[0];
      expect(op.accVar.name).toBe('summary');
      expect(op.itemVar.name).toBe('idea');
    });
  });

  describe('Parser - Pmap', () => {
    it('should parse simple pmap expression', () => {
      const source = `let results = items | pmap:
  session "Process in parallel"
    context: item`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      expect(binding.value.type).toBe('PipeExpression');

      const op = binding.value.operations[0];
      expect(op.operator).toBe('pmap');
    });
  });

  describe('Parser - Chaining', () => {
    it('should parse chained filter and map', () => {
      const source = `let results = items | filter:
  session "Is valid?"
    context: item
  | map:
    session "Transform"
      context: item`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      expect(binding.value.type).toBe('PipeExpression');
      expect(binding.value.operations).toHaveLength(2);

      expect(binding.value.operations[0].operator).toBe('filter');
      expect(binding.value.operations[1].operator).toBe('map');
    });

    it('should parse triple chain: filter | map | reduce', () => {
      const source = `let result = items | filter:
  session "Keep?"
    context: item
  | map:
    session "Transform"
      context: item
  | reduce(acc, x):
    session "Combine"
      context: [acc, x]`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      expect(binding.value.operations).toHaveLength(3);

      expect(binding.value.operations[0].operator).toBe('filter');
      expect(binding.value.operations[1].operator).toBe('map');
      expect(binding.value.operations[2].operator).toBe('reduce');
    });
  });

  describe('Validator', () => {
    it('should validate pipe expression with defined input variable', () => {
      const source = `let items = ["a", "b"]
let results = items | map:
  session "Process"
    context: item`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on undefined input variable', () => {
      const source = `let results = undefined_items | map:
  session "Process"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined collection variable'))).toBe(true);
    });

    it('should allow implicit item variable in map body', () => {
      const source = `let items = ["a", "b"]
let results = items | map:
  session "Process"
    context: item`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should allow reduce variables in reduce body', () => {
      const source = `let items = ["a", "b"]
let result = items | reduce(acc, x):
  session "Combine"
    context: [acc, x]`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should warn when pipeline variable shadows outer variable', () => {
      const source = `let item = "outer"
let items = ["a", "b"]
let results = items | map:
  session "Process"
    context: item`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });

    it('should warn when reduce variables shadow outer variables', () => {
      const source = `let acc = "outer"
let items = ["a", "b"]
let result = items | reduce(acc, x):
  session "Combine"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.warnings.some(w => w.message.includes('shadows'))).toBe(true);
    });
  });

  describe('Compiler', () => {
    it('should compile simple map expression', () => {
      const source = `let results = items | map:
  session "Process"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('let results =');
      expect(output).toContain('| map:');
      expect(output).toContain('session "Process"');
    });

    it('should compile filter expression', () => {
      const source = `let valid = items | filter:
  session "Is valid?"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('| filter:');
    });

    it('should compile reduce with variables', () => {
      const source = `let combined = items | reduce(summary, idea):
  session "Merge"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('| reduce(summary, idea):');
    });

    it('should compile pmap expression', () => {
      const source = `let results = items | pmap:
  session "Parallel process"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('| pmap:');
    });

    it('should compile chained operations', () => {
      const source = `let result = items | filter:
  session "Keep?"
  | map:
    session "Transform"`;

      const result = parse(source);
      const output = compileToString(result.program);

      expect(output).toContain('| filter:');
      expect(output).toContain('| map:');
    });
  });

  describe('Integration', () => {
    it('should handle complete map workflow', () => {
      const source = `# Define collection
let articles = ["article1", "article2", "article3"]

# Map: summarize each article
let summaries = articles | map:
  session "Summarize this article in one sentence"
    context: item

# Present results
session "Present all summaries"
  context: summaries`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const output = compileToString(result.program);
      expect(output).toContain('| map:');
    });

    it('should handle complete filter workflow', () => {
      const source = `let items = ["one", "two", "three", "four", "five"]

let short = items | filter:
  session "Does this have 4 or fewer letters? Answer yes or no."
    context: item

session "List the short words"
  context: short`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle complete reduce workflow', () => {
      const source = `let ideas = ["AI", "blockchain", "IoT"]

let combined = ideas | reduce(summary, idea):
  session "Add this idea to the summary"
    context: [summary, idea]

session "Present the combined concept"
  context: combined`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle complete pmap workflow', () => {
      const source = `let tasks = ["task1", "task2", "task3"]

let results = tasks | pmap:
  session "Process this task in parallel"
    context: item

session "Aggregate results"
  context: results`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle complete chain workflow', () => {
      const source = `let topics = ["quantum", "blockchain", "ML", "IoT", "cyber"]

let result = topics | filter:
  session "Is this trending? Answer yes or no."
    context: item
| map:
  session "Write a one-line pitch"
    context: item

session "Present the pitches"
  context: result`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pipeline body', () => {
      const source = `let results = items | map:`;

      const result = parse(source);
      // Should parse, even if body is empty
      expect(result.program.statements).toHaveLength(1);
    });

    it('should handle pipeline with inline comments', () => {
      const source = `let results = items | map:  # Transform each
  session "Process"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple sessions in pipeline body', () => {
      const source = `let results = items | map:
  session "First step"
  session "Second step"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as any;
      expect(binding.value.operations[0].body).toHaveLength(2);
    });

    it('should handle nested operations in pipeline body', () => {
      const source = `let results = items | map:
  do:
    session "Step 1"
    session "Step 2"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle pipeline with context property', () => {
      const source = `let items = ["a", "b"]
let results = items | map:
  session "Process"
    context: item`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should handle identifier assignment without pipe (not a pipe expression)', () => {
      // Without pipe, this is just an identifier assignment
      // map: on a separate line would be a different statement
      const source = `let results = items`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      // The value should be a simple identifier, not a pipe expression
      const binding = result.program.statements[0] as any;
      expect(binding.value.type).toBe('Identifier');
      expect(binding.value.name).toBe('items');
    });

    it('should error on reduce without parentheses', () => {
      const source = `let results = items | reduce:
  session "Combine"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes('Expected "("'))).toBe(true);
    });

    it('should error on reduce without comma between variables', () => {
      const source = `let results = items | reduce(acc item):
  session "Combine"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes('Expected ","'))).toBe(true);
    });

    it('should error on reduce without closing paren', () => {
      const source = `let results = items | reduce(acc, item:
  session "Combine"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes('Expected ")"'))).toBe(true);
    });

    it('should error on unknown pipe operator', () => {
      const source = `let results = items | unknown:
  session "Process"`;

      const result = parse(source);
      expect(result.errors.some(e => e.message.includes('Expected pipe operator'))).toBe(true);
    });
  });
});
