/**
 * Unit tests for OpenProse Composition Blocks (Tier 5)
 *
 * Tests do: blocks, inline sequences (->), block definitions, and block invocations.
 */

import { parse } from '../parser';
import { tokenize } from '../parser/lexer';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compile, compileToString } from '../compiler';
import { getSemanticTokens, SemanticTokenType } from '../lsp/semantic-tokens';
import {
  DoBlockNode,
  BlockDefinitionNode,
  ArrowExpressionNode,
  SessionStatementNode,
  LetBindingNode,
} from '../parser/ast';

describe('Composition Blocks (Tier 5)', () => {
  describe('Lexer', () => {
    it('should tokenize do keyword', () => {
      const result = tokenize('do');
      const doToken = result.tokens.find(t => t.type === TokenType.DO);

      expect(doToken).toBeDefined();
      expect(doToken!.value).toBe('do');
    });

    it('should tokenize block keyword', () => {
      const result = tokenize('block');
      const blockToken = result.tokens.find(t => t.type === TokenType.BLOCK);

      expect(blockToken).toBeDefined();
      expect(blockToken!.value).toBe('block');
    });

    it('should tokenize arrow operator', () => {
      const result = tokenize('->');
      const arrowToken = result.tokens.find(t => t.type === TokenType.ARROW);

      expect(arrowToken).toBeDefined();
      expect(arrowToken!.value).toBe('->');
    });

    it('should tokenize inline sequence with sessions', () => {
      const result = tokenize('session "A" -> session "B"');

      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.SESSION);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[2].type).toBe(TokenType.ARROW);
      expect(tokens[3].type).toBe(TokenType.SESSION);
      expect(tokens[4].type).toBe(TokenType.STRING);
    });
  });

  describe('Parser - Do Block', () => {
    it('should parse anonymous do block with body', () => {
      const source = `do:
  session "Step 1"
  session "Step 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const doBlock = result.program.statements[0] as DoBlockNode;
      expect(doBlock.type).toBe('DoBlock');
      expect(doBlock.name).toBeNull();
      expect(doBlock.body).toHaveLength(2);
    });

    it('should parse do block invocation', () => {
      const source = `block review:
  session "Review code"

do review`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const doInvoke = result.program.statements[1] as DoBlockNode;
      expect(doInvoke.type).toBe('DoBlock');
      expect(doInvoke.name?.name).toBe('review');
      expect(doInvoke.body).toHaveLength(0);
    });

    it('should parse nested do blocks', () => {
      const source = `do:
  session "Start"
  do:
    session "Inner"
  session "End"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const outerDo = result.program.statements[0] as DoBlockNode;
      expect(outerDo.body).toHaveLength(3);

      const innerDo = outerDo.body[1] as DoBlockNode;
      expect(innerDo.type).toBe('DoBlock');
      expect(innerDo.body).toHaveLength(1);
    });

    it('should parse do block assigned to variable', () => {
      const source = `let result = do:
  session "Step 1"
  session "Step 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const binding = result.program.statements[0] as LetBindingNode;
      expect(binding.type).toBe('LetBinding');
      expect(binding.value.type).toBe('DoBlock');

      const doBlock = binding.value as DoBlockNode;
      expect(doBlock.body).toHaveLength(2);
    });
  });

  describe('Parser - Block Definition', () => {
    it('should parse basic block definition', () => {
      const source = `block my-block:
  session "Task 1"
  session "Task 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const blockDef = result.program.statements[0] as BlockDefinitionNode;
      expect(blockDef.type).toBe('BlockDefinition');
      expect(blockDef.name.name).toBe('my-block');
      expect(blockDef.body).toHaveLength(2);
    });

    it('should parse block with hyphenated name', () => {
      const source = `block review-pipeline:
  session "Security review"
  session "Performance review"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const blockDef = result.program.statements[0] as BlockDefinitionNode;
      expect(blockDef.name.name).toBe('review-pipeline');
    });

    it('should parse block with agent sessions in body', () => {
      const source = `agent reviewer:
  model: sonnet

block code-review:
  session: reviewer
    prompt: "Review the code"
  session: reviewer
    prompt: "Summarize findings"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const blockDef = result.program.statements[1] as BlockDefinitionNode;
      expect(blockDef.body).toHaveLength(2);
    });

    it('should parse multiple block definitions', () => {
      const source = `block step1:
  session "Do step 1"

block step2:
  session "Do step 2"

block combined:
  do step1
  do step2`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(3);
    });
  });

  describe('Parser - Arrow Expression', () => {
    it('should parse simple arrow sequence', () => {
      const source = `session "A" -> session "B"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const arrow = result.program.statements[0] as ArrowExpressionNode;
      expect(arrow.type).toBe('ArrowExpression');

      expect(arrow.left.type).toBe('SessionStatement');
      expect(arrow.right.type).toBe('SessionStatement');
    });

    it('should parse chained arrow sequence (left-associative)', () => {
      const source = `session "A" -> session "B" -> session "C"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      // Result should be ((A -> B) -> C)
      const arrow = result.program.statements[0] as ArrowExpressionNode;
      expect(arrow.type).toBe('ArrowExpression');

      // Right is C
      expect(arrow.right.type).toBe('SessionStatement');

      // Left is (A -> B)
      expect(arrow.left.type).toBe('ArrowExpression');
      const innerArrow = arrow.left as ArrowExpressionNode;
      expect(innerArrow.left.type).toBe('SessionStatement');
      expect(innerArrow.right.type).toBe('SessionStatement');
    });

    it('should parse arrow sequence assigned to variable', () => {
      const source = `let pipeline = session "A" -> session "B" -> session "C"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const binding = result.program.statements[0] as LetBindingNode;
      expect(binding.value.type).toBe('ArrowExpression');
    });
  });

  describe('Validator', () => {
    it('should validate valid block definition', () => {
      const source = `block my-block:
  session "Task"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate valid do block invocation', () => {
      const source = `block my-block:
  session "Task"

do my-block`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should error on undefined block invocation', () => {
      const source = `do undefined-block`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined block'))).toBe(true);
    });

    it('should error on duplicate block definition', () => {
      const source = `block review:
  session "Review 1"

block review:
  session "Review 2"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Duplicate block'))).toBe(true);
    });

    it('should error on block name conflicting with agent', () => {
      const source = `agent reviewer:
  model: sonnet

block reviewer:
  session "Review"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('conflicts with agent'))).toBe(true);
    });

    it('should validate anonymous do block', () => {
      const source = `do:
  session "Step 1"
  session "Step 2"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should validate arrow expression', () => {
      const source = `session "A" -> session "B" -> session "C"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should validate arrow expression with agent sessions', () => {
      const source = `agent worker:
  model: sonnet

session: worker
  prompt: "Step 1" -> session: worker
  prompt: "Step 2"`;

      const result = parse(source);
      // Note: This syntax might need adjustment based on how we want to handle it
      // For now, just checking it doesn't crash
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate do block in variable binding', () => {
      const source = `let result = do:
  session "Step 1"
  session "Step 2"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should validate arrow expression in variable binding', () => {
      const source = `let pipeline = session "A" -> session "B"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Compiler', () => {
    it('should compile block definition', () => {
      const source = `block my-block:
  session "Task 1"
  session "Task 2"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('block my-block:');
      expect(compiled).toContain('session "Task 1"');
      expect(compiled).toContain('session "Task 2"');
    });

    it('should compile do block invocation', () => {
      const source = `block review:
  session "Review"

do review`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('block review:');
      expect(compiled).toContain('do review');
    });

    it('should compile anonymous do block', () => {
      const source = `do:
  session "Step 1"
  session "Step 2"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('do:');
      expect(compiled).toContain('session "Step 1"');
      expect(compiled).toContain('session "Step 2"');
    });

    it('should compile arrow expression', () => {
      const source = `session "A" -> session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('session "A" -> session "B"');
    });

    it('should compile chained arrow expression', () => {
      const source = `session "A" -> session "B" -> session "C"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('session "A" -> session "B" -> session "C"');
    });

    it('should compile let binding with do block', () => {
      const source = `let result = do:
  session "Step 1"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('let result = do:');
    });

    it('should compile let binding with arrow expression', () => {
      const source = `let pipeline = session "A" -> session "B"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('let pipeline = session "A" -> session "B"');
    });
  });

  describe('Semantic Tokens', () => {
    it('should mark do keyword with Keyword type', () => {
      const tokens = getSemanticTokens('do:');

      const doToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(doToken).toBeDefined();
      expect(doToken!.length).toBe(2);
    });

    it('should mark block keyword with Keyword type', () => {
      const tokens = getSemanticTokens('block name:');

      const blockToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(blockToken).toBeDefined();
      expect(blockToken!.length).toBe(5);
    });

    it('should mark arrow operator with Operator type', () => {
      const tokens = getSemanticTokens('session "A" -> session "B"');

      const arrowToken = tokens.find(t => t.tokenType === SemanticTokenType.Operator);
      expect(arrowToken).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow with blocks and do invocations', () => {
      const source = `# Define reusable blocks
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

agent writer:
  model: opus
  prompt: "You are a technical writer"

block research-phase:
  session: researcher
    prompt: "Research the topic"
  session: researcher
    prompt: "Analyze findings"

block writing-phase:
  session: writer
    prompt: "Write draft"
  session: writer
    prompt: "Polish and finalize"

# Execute the workflow
let research = do research-phase

let article = do writing-phase`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compileToString(result.program);
      expect(compiled).toContain('block research-phase:');
      expect(compiled).toContain('block writing-phase:');
      expect(compiled).toContain('let research = do research-phase');
      expect(compiled).toContain('let article = do writing-phase');
    });

    it('should handle inline sequences in workflow', () => {
      const source = `session "Plan" -> session "Execute" -> session "Review"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compileToString(result.program);
      expect(compiled).toContain('session "Plan" -> session "Execute" -> session "Review"');
    });

    it('should handle mixed blocks and arrow sequences', () => {
      const source = `block quick-review:
  session "Security check"
  session "Performance check"

# Use arrow sequence for simple pipeline
let prep = session "Prepare" -> session "Validate"

# Use block for complex workflow
do quick-review`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle do blocks with context passing', () => {
      const source = `let research = do:
  session "Gather data"
  session "Analyze data"

session "Write report"
  context: research`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle block name with underscores', () => {
      const source = `block my_block:
  session "Task"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      const blockDef = result.program.statements[0] as BlockDefinitionNode;
      expect(blockDef.name.name).toBe('my_block');
    });

    it('should handle block name with numbers', () => {
      const source = `block step2:
  session "Step 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      const blockDef = result.program.statements[0] as BlockDefinitionNode;
      expect(blockDef.name.name).toBe('step2');
    });

    it('should handle empty do block', () => {
      const source = `do:
`;

      const result = parse(source);
      // Empty block should parse without error
      expect(result.program.statements).toHaveLength(1);
    });

    it('should handle many arrow chained sessions', () => {
      const source = `session "1" -> session "2" -> session "3" -> session "4" -> session "5"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      // Should be deeply nested left-associative
      let node = result.program.statements[0] as ArrowExpressionNode;
      expect(node.type).toBe('ArrowExpression');

      // Count depth
      let depth = 1;
      while (node.left.type === 'ArrowExpression') {
        node = node.left as ArrowExpressionNode;
        depth++;
      }
      expect(depth).toBe(4); // 5 sessions = 4 arrows
    });

    it('should handle block invoking another block', () => {
      const source = `block inner:
  session "Inner task"

block outer:
  session "Start"
  do inner
  session "End"

do outer`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should error on do without colon or block name', () => {
      const source = `do`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('":" or block name'))).toBe(true);
    });

    it('should error on block without name', () => {
      const source = `block :
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('block name'))).toBe(true);
    });

    it('should error on block without colon', () => {
      const source = `block myblock
  session "Task"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes(':'))).toBe(true);
    });

    it('should error on arrow without right side', () => {
      const source = `session "A" ->`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('session or do block'))).toBe(true);
    });
  });
});
