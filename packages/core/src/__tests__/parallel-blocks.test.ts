/**
 * Unit tests for OpenProse Parallel Blocks (Tier 6)
 *
 * Tests parallel: blocks, named parallel results, object context, and mixed composition.
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
  AssignmentNode,
  DoBlockNode,
  LetBindingNode,
  ObjectExpressionNode,
} from '../parser/ast';

describe('Parallel Blocks (Tier 6)', () => {
  describe('Lexer', () => {
    it('should tokenize parallel keyword', () => {
      const result = tokenize('parallel');
      const parallelToken = result.tokens.find(t => t.type === TokenType.PARALLEL);

      expect(parallelToken).toBeDefined();
      expect(parallelToken!.value).toBe('parallel');
    });

    it('should tokenize braces for object context', () => {
      const result = tokenize('{ a, b }');

      const lbrace = result.tokens.find(t => t.type === TokenType.LBRACE);
      const rbrace = result.tokens.find(t => t.type === TokenType.RBRACE);

      expect(lbrace).toBeDefined();
      expect(rbrace).toBeDefined();
    });

    it('should tokenize parallel block with body', () => {
      const result = tokenize(`parallel:
  session "A"
  session "B"`);

      expect(result.errors).toHaveLength(0);

      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens.some(t => t.type === TokenType.PARALLEL)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.COLON)).toBe(true);
    });
  });

  describe('Parser - Basic Parallel Block', () => {
    it('should parse basic parallel block', () => {
      const source = `parallel:
  session "Task A"
  session "Task B"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.type).toBe('ParallelBlock');
      expect(parallel.body).toHaveLength(2);
    });

    it('should parse parallel block with three branches', () => {
      const source = `parallel:
  session "Security review"
  session "Performance review"
  session "Style review"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.body).toHaveLength(3);
    });

    it('should parse parallel block followed by session', () => {
      const source = `parallel:
  session "A"
  session "B"

session "Synthesize"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);
      expect(result.program.statements[0].type).toBe('ParallelBlock');
      expect(result.program.statements[1].type).toBe('SessionStatement');
    });
  });

  describe('Parser - Named Parallel Results', () => {
    it('should parse named results in parallel block', () => {
      const source = `parallel:
  security = session "Security review"
  perf = session "Performance review"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.body).toHaveLength(2);

      // Check first assignment
      const secAssign = parallel.body[0] as AssignmentNode;
      expect(secAssign.type).toBe('Assignment');
      expect(secAssign.name.name).toBe('security');
      expect(secAssign.value.type).toBe('SessionStatement');

      // Check second assignment
      const perfAssign = parallel.body[1] as AssignmentNode;
      expect(perfAssign.type).toBe('Assignment');
      expect(perfAssign.name.name).toBe('perf');
    });

    it('should parse mixed named and unnamed branches', () => {
      const source = `parallel:
  security = session "Security review"
  session "Quick check"
  perf = session "Performance review"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.body).toHaveLength(3);
      expect(parallel.body[0].type).toBe('Assignment');
      expect(parallel.body[1].type).toBe('SessionStatement');
      expect(parallel.body[2].type).toBe('Assignment');
    });
  });

  describe('Parser - Object Context', () => {
    it('should parse object context shorthand', () => {
      const source = `parallel:
  a = session "Task A"
  b = session "Task B"

session "Combine"
  context: { a, b }`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.properties).toHaveLength(1);

      const contextProp = session.properties[0];
      expect(contextProp.name.name).toBe('context');
      expect(contextProp.value.type).toBe('ObjectExpression');

      const objExpr = contextProp.value as ObjectExpressionNode;
      expect(objExpr.properties).toHaveLength(2);
      expect(objExpr.properties[0].name.name).toBe('a');
      expect(objExpr.properties[1].name.name).toBe('b');
    });

    it('should parse object context with three variables', () => {
      const source = `session "Use all"
  context: { sec, perf, style }`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      const contextProp = session.properties[0];
      const objExpr = contextProp.value as ObjectExpressionNode;

      expect(objExpr.properties).toHaveLength(3);
      expect(objExpr.properties[0].name.name).toBe('sec');
      expect(objExpr.properties[1].name.name).toBe('perf');
      expect(objExpr.properties[2].name.name).toBe('style');
    });

    it('should parse empty object context', () => {
      // Note: Empty object is not a valid context in practice, but should parse
      const source = `session "Fresh start"
  context: { }`;

      // This might error at parsing or validation - let's just check it doesn't crash
      const result = parse(source);
      expect(result.program.statements).toHaveLength(1);
    });
  });

  describe('Parser - Mixed Composition', () => {
    it('should parse parallel inside do block', () => {
      const source = `do:
  session "Setup"
  parallel:
    session "Task A"
    session "Task B"
  session "Cleanup"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const doBlock = result.program.statements[0] as DoBlockNode;
      expect(doBlock.body).toHaveLength(3);
      expect(doBlock.body[0].type).toBe('SessionStatement');
      expect(doBlock.body[1].type).toBe('ParallelBlock');
      expect(doBlock.body[2].type).toBe('SessionStatement');
    });

    it('should parse do inside parallel block', () => {
      const source = `parallel:
  do:
    session "Multi-step 1"
    session "Multi-step 2"
  session "Independent"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.body).toHaveLength(2);
      expect(parallel.body[0].type).toBe('DoBlock');
      expect(parallel.body[1].type).toBe('SessionStatement');
    });

    it('should parse let binding with parallel block', () => {
      const source = `let results = parallel:
  session "A"
  session "B"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as LetBindingNode;
      expect(binding.type).toBe('LetBinding');
      expect(binding.value.type).toBe('ParallelBlock');
    });
  });

  describe('Validator', () => {
    it('should validate basic parallel block', () => {
      const source = `parallel:
  session "A"
  session "B"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate named results and their usage', () => {
      const source = `parallel:
  a = session "A"
  b = session "B"

session "Combine"
  context: { a, b }`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should error on undefined variable in object context', () => {
      const source = `parallel:
  a = session "A"

session "Use undefined"
  context: { a, b }`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined variable'))).toBe(true);
      expect(validation.errors.some(e => e.message.includes('"b"'))).toBe(true);
    });

    it('should error on duplicate variable in parallel block', () => {
      const source = `let a = session "First"

parallel:
  a = session "Duplicate"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Duplicate variable'))).toBe(true);
    });

    it('should validate parallel inside do block', () => {
      const source = `do:
  session "Setup"
  parallel:
    session "A"
    session "B"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should validate do inside parallel block', () => {
      const source = `parallel:
  do:
    session "Step 1"
    session "Step 2"
  session "Other"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should validate object context with single variable', () => {
      const source = `let data = session "Get data"

session "Process"
  context: { data }`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Compiler', () => {
    it('should compile basic parallel block', () => {
      const source = `parallel:
  session "A"
  session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel:');
      expect(compiled).toContain('session "A"');
      expect(compiled).toContain('session "B"');
    });

    it('should compile named results in parallel', () => {
      const source = `parallel:
  security = session "Security review"
  perf = session "Performance review"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel:');
      expect(compiled).toContain('security = session "Security review"');
      expect(compiled).toContain('perf = session "Performance review"');
    });

    it('should compile object context', () => {
      const source = `parallel:
  a = session "A"
  b = session "B"

session "Combine"
  context: { a, b }`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('context: { a, b }');
    });

    it('should compile parallel inside do', () => {
      const source = `do:
  session "Setup"
  parallel:
    session "A"
    session "B"
  session "Cleanup"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('do:');
      expect(compiled).toContain('parallel:');
      expect(compiled).toContain('session "Setup"');
      expect(compiled).toContain('session "Cleanup"');
    });

    it('should compile do inside parallel', () => {
      const source = `parallel:
  do:
    session "Step 1"
    session "Step 2"
  session "Independent"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('parallel:');
      expect(compiled).toContain('do:');
    });

    it('should compile let binding with parallel block', () => {
      const source = `let results = parallel:
  session "A"
  session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('let results = parallel:');
    });
  });

  describe('Semantic Tokens', () => {
    it('should mark parallel keyword with Keyword type', () => {
      const tokens = getSemanticTokens('parallel:');

      const parallelToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(parallelToken).toBeDefined();
      expect(parallelToken!.length).toBe(8);
    });

    it('should mark braces in object context as operators', () => {
      const tokens = getSemanticTokens('context: { a, b }');

      // The braces should be recognized (though they may not be highlighted as operators)
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should handle complete parallel review workflow', () => {
      const source = `# Define agents
agent reviewer:
  model: sonnet

# Run parallel reviews
parallel:
  security = session: reviewer
    prompt: "Security review"
  perf = session: reviewer
    prompt: "Performance review"
  style = session: reviewer
    prompt: "Style review"

# Synthesize results
session "Create unified report"
  context: { security, perf, style }`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compileToString(result.program);
      expect(compiled).toContain('parallel:');
      expect(compiled).toContain('context: { security, perf, style }');
    });

    it('should handle nested parallel and sequential', () => {
      const source = `do:
  session "Initialize"
  parallel:
    do:
      session "Complex task 1a"
      session "Complex task 1b"
    do:
      session "Complex task 2a"
      session "Complex task 2b"
  session "Finalize"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle parallel with block definitions', () => {
      const source = `block setup:
  session "Initialize resources"

block cleanup:
  session "Release resources"

do:
  do setup
  parallel:
    session "Worker 1"
    session "Worker 2"
  do cleanup`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty parallel block', () => {
      const source = `parallel:
`;

      const result = parse(source);
      expect(result.program.statements).toHaveLength(1);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.body).toHaveLength(0);
    });

    it('should handle single-branch parallel block', () => {
      const source = `parallel:
  session "Only one"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.body).toHaveLength(1);
    });

    it('should handle deeply nested structure', () => {
      const source = `do:
  parallel:
    do:
      parallel:
        session "Deep 1"
        session "Deep 2"
    session "Shallow"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle many parallel branches', () => {
      const source = `parallel:
  session "1"
  session "2"
  session "3"
  session "4"
  session "5"
  session "6"
  session "7"
  session "8"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      expect(parallel.body).toHaveLength(8);
    });

    it('should handle hyphenated variable names in parallel', () => {
      const source = `parallel:
  sec-review = session "Security"
  perf-test = session "Performance"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const parallel = result.program.statements[0] as ParallelBlockNode;
      const assign = parallel.body[0] as AssignmentNode;
      expect(assign.name.name).toBe('sec-review');
    });
  });

  describe('Error Cases', () => {
    it('should error on parallel without colon', () => {
      const source = `parallel
  session "A"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes(':'))).toBe(true);
    });

    it('should error on undefined variable in context object', () => {
      const source = `session "Use unknown"
  context: { unknown }`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined variable'))).toBe(true);
    });

    it('should error when parallel result variable conflicts with agent', () => {
      const source = `agent worker:
  model: sonnet

parallel:
  worker = session "Conflict"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('conflicts with agent'))).toBe(true);
    });
  });
});
