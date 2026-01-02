/**
 * Tier 12: Advanced Features Tests
 *
 * Tests for:
 * - Multi-line strings (""")
 * - String interpolation ({var})
 * - Block parameters (block name(param):)
 * - Block invocation with arguments (do name(arg))
 * - Choice blocks (choice **criteria**: option "label":)
 * - If/elif/else statements
 */

import { Lexer, tokenize } from '../parser/lexer';
import { Parser, parse } from '../parser/parser';
import { Validator, validate } from '../validator/validator';
import { Compiler, compile, compileToString } from '../compiler/compiler';
import { TokenType } from '../parser/tokens';
import {
  BlockDefinitionNode,
  DoBlockNode,
  ChoiceBlockNode,
  IfStatementNode,
  SessionStatementNode,
  StringLiteralNode,
} from '../parser/ast';

describe('Tier 12: Advanced Features', () => {
  // ======================================
  // 12.1 - Multi-line Strings
  // ======================================
  describe('Multi-line Strings (12.1)', () => {
    describe('Lexer', () => {
      it('should tokenize triple-quoted strings', () => {
        const source = `session """
  This is a multi-line
  string prompt.
"""`;
        const result = tokenize(source);
        expect(result.errors).toHaveLength(0);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken).toBeDefined();
        expect(stringToken?.stringMetadata?.isTripleQuoted).toBe(true);
      });

      it('should preserve internal whitespace in triple-quoted strings', () => {
        const source = `session """
  Line one
    Line two (indented)
  Line three
"""`;
        const result = tokenize(source);
        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken?.value).toContain('  Line one');
        expect(stringToken?.value).toContain('    Line two (indented)');
      });

      it('should handle empty triple-quoted string', () => {
        const source = `session """"""`;
        const result = tokenize(source);
        expect(result.errors).toHaveLength(0);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken?.value).toBe('');
        expect(stringToken?.stringMetadata?.isTripleQuoted).toBe(true);
      });
    });

    describe('Parser', () => {
      it('should parse session with multi-line string', () => {
        const source = `session """
  A longer prompt that
  spans multiple lines.
"""`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const session = result.program.statements[0] as SessionStatementNode;
        expect(session.prompt?.isTripleQuoted).toBe(true);
        expect(session.prompt?.value).toContain('A longer prompt');
      });
    });

    describe('Compiler', () => {
      it('should compile multi-line strings correctly', () => {
        const source = `session """
  Multi-line prompt
"""`;
        const result = parse(source);
        const output = compileToString(result.program);
        // Should still be valid session output
        expect(output).toContain('session');
      });
    });
  });

  // ======================================
  // 12.2 - String Interpolation
  // ======================================
  describe('String Interpolation (12.2)', () => {
    describe('Lexer', () => {
      it('should detect interpolation in strings', () => {
        const source = `session "Process {item}"`;
        const result = tokenize(source);
        expect(result.errors).toHaveLength(0);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken?.stringMetadata?.interpolations).toHaveLength(1);
        expect(stringToken?.stringMetadata?.interpolations?.[0].varName).toBe('item');
      });

      it('should detect multiple interpolations', () => {
        const source = `session "Hello {name}, welcome to {place}"`;
        const result = tokenize(source);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken?.stringMetadata?.interpolations).toHaveLength(2);
        expect(stringToken?.stringMetadata?.interpolations?.[0].varName).toBe('name');
        expect(stringToken?.stringMetadata?.interpolations?.[1].varName).toBe('place');
      });

      it('should handle interpolation in triple-quoted strings', () => {
        const source = `session """
  Process {item} and return
  results for {user}.
"""`;
        const result = tokenize(source);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken?.stringMetadata?.interpolations).toHaveLength(2);
      });

      it('should handle escaped braces', () => {
        const source = `session "JSON: \\{key: value\\}"`;
        const result = tokenize(source);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken?.stringMetadata?.interpolations).toHaveLength(0);
      });

      it('should handle empty braces', () => {
        const source = `session "Empty {} braces"`;
        const result = tokenize(source);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        // Empty braces without variable name should be treated as literal
        expect(stringToken?.stringMetadata?.interpolations).toHaveLength(0);
      });

      it('should handle hyphenated variable names in interpolation', () => {
        const source = `session "The {my-var} is here"`;
        const result = tokenize(source);

        const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
        expect(stringToken?.stringMetadata?.interpolations).toHaveLength(1);
        expect(stringToken?.stringMetadata?.interpolations?.[0].varName).toBe('my-var');
      });
    });
  });

  // ======================================
  // 12.3 & 12.4 - Block Parameters & Arguments
  // ======================================
  describe('Block Parameters and Arguments (12.3 & 12.4)', () => {
    describe('Parser - Block Definition with Parameters', () => {
      it('should parse block with single parameter', () => {
        const source = `block analyze(item):
  session "Analyze {item}"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const block = result.program.statements[0] as BlockDefinitionNode;
        expect(block.name.name).toBe('analyze');
        expect(block.parameters).toHaveLength(1);
        expect(block.parameters[0].name).toBe('item');
      });

      it('should parse block with multiple parameters', () => {
        const source = `block process(input, count, mode):
  session "Process"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const block = result.program.statements[0] as BlockDefinitionNode;
        expect(block.parameters).toHaveLength(3);
        expect(block.parameters[0].name).toBe('input');
        expect(block.parameters[1].name).toBe('count');
        expect(block.parameters[2].name).toBe('mode');
      });

      it('should parse block without parameters', () => {
        const source = `block simple:
  session "Simple"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const block = result.program.statements[0] as BlockDefinitionNode;
        expect(block.parameters).toHaveLength(0);
      });
    });

    describe('Parser - Block Invocation with Arguments', () => {
      it('should parse do with single argument', () => {
        const source = `do analyze(data)`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const doBlock = result.program.statements[0] as DoBlockNode;
        expect(doBlock.name?.name).toBe('analyze');
        expect(doBlock.arguments).toHaveLength(1);
      });

      it('should parse do with multiple arguments', () => {
        const source = `do process("input", myVar, "mode")`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const doBlock = result.program.statements[0] as DoBlockNode;
        expect(doBlock.arguments).toHaveLength(3);
      });

      it('should parse do without arguments', () => {
        const source = `do simple`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const doBlock = result.program.statements[0] as DoBlockNode;
        expect(doBlock.arguments).toHaveLength(0);
      });
    });

    describe('Validator', () => {
      it('should validate matching argument count', () => {
        const source = `block greet(name):
  session "Hello"

do greet("Alice")`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
      });

      it('should error on wrong argument count', () => {
        const source = `block greet(name):
  session "Hello"

do greet()`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        const errors = result.errors.filter(e => e.severity === 'error');
        expect(errors.some(e => e.message.includes('expects 1 argument'))).toBe(true);
      });

      it('should error on duplicate parameter names', () => {
        const source = `block bad(x, x):
  session "Bad"`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        expect(result.errors.some(e => e.message.includes('Duplicate parameter'))).toBe(true);
      });

      it('should warn on parameter shadowing outer variable', () => {
        const source = `let item = session "Get item"

block process(item):
  session "Process"`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        expect(result.warnings.some(e => e.message.includes('shadows'))).toBe(true);
      });
    });

    describe('Compiler', () => {
      it('should compile block definition with parameters', () => {
        const source = `block analyze(item, mode):
  session "Analyze"`;
        const result = parse(source);
        const output = compileToString(result.program);
        expect(output).toContain('block analyze(item, mode):');
      });

      it('should compile do invocation with arguments', () => {
        const source = `do analyze("data", mode)`;
        const result = parse(source);
        const output = compileToString(result.program);
        expect(output).toContain('do analyze("data", mode)');
      });
    });
  });

  // ======================================
  // 12.5 - Choice Blocks
  // ======================================
  describe('Choice Blocks (12.5)', () => {
    describe('Parser', () => {
      it('should parse choice block with options', () => {
        const source = `choice **which approach is best**:
  option "quick":
    session "Fast approach"
  option "thorough":
    session "Comprehensive approach"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const choice = result.program.statements[0] as ChoiceBlockNode;
        expect(choice.type).toBe('ChoiceBlock');
        expect(choice.criteria.expression).toBe('which approach is best');
        expect(choice.options).toHaveLength(2);
        expect(choice.options[0].label.value).toBe('quick');
        expect(choice.options[1].label.value).toBe('thorough');
      });

      it('should parse choice with single option', () => {
        const source = `choice **only one path**:
  option "default":
    session "The only option"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const choice = result.program.statements[0] as ChoiceBlockNode;
        expect(choice.options).toHaveLength(1);
      });

      it('should parse choice with multiple statements in option body', () => {
        const source = `choice **choose**:
  option "multi":
    session "Step 1"
    session "Step 2"
    session "Step 3"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const choice = result.program.statements[0] as ChoiceBlockNode;
        expect(choice.options[0].body).toHaveLength(3);
      });
    });

    describe('Validator', () => {
      it('should validate choice block with options', () => {
        const source = `choice **which path**:
  option "a":
    session "Path A"
  option "b":
    session "Path B"`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
      });

      it('should warn on duplicate option labels', () => {
        const source = `choice **which path**:
  option "same":
    session "Path A"
  option "same":
    session "Path B"`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        expect(result.warnings.some(e => e.message.includes('Duplicate option label'))).toBe(true);
      });
    });

    describe('Compiler', () => {
      it('should compile choice block', () => {
        const source = `choice **select approach**:
  option "fast":
    session "Quick"
  option "slow":
    session "Thorough"`;
        const result = parse(source);
        const output = compileToString(result.program);
        expect(output).toContain('choice **select approach**:');
        expect(output).toContain('option "fast":');
        expect(output).toContain('option "slow":');
      });
    });
  });

  // ======================================
  // 12.6 - If/Elif/Else
  // ======================================
  describe('If/Elif/Else (12.6)', () => {
    describe('Lexer', () => {
      it('should tokenize if keyword', () => {
        const source = `if **condition**:`;
        const result = tokenize(source);
        expect(result.tokens.some(t => t.type === TokenType.IF)).toBe(true);
      });

      it('should tokenize elif keyword', () => {
        const source = `elif **condition**:`;
        const result = tokenize(source);
        expect(result.tokens.some(t => t.type === TokenType.ELIF)).toBe(true);
      });

      it('should tokenize else keyword', () => {
        const source = `else:`;
        const result = tokenize(source);
        expect(result.tokens.some(t => t.type === TokenType.ELSE)).toBe(true);
      });
    });

    describe('Parser', () => {
      it('should parse simple if statement', () => {
        const source = `if **the data is valid**:
  session "Process data"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const ifStmt = result.program.statements[0] as IfStatementNode;
        expect(ifStmt.type).toBe('IfStatement');
        expect(ifStmt.condition.expression).toBe('the data is valid');
        expect(ifStmt.thenBody).toHaveLength(1);
        expect(ifStmt.elseIfClauses).toHaveLength(0);
        expect(ifStmt.elseBody).toBeNull();
      });

      it('should parse if/else statement', () => {
        const source = `if **condition is met**:
  session "Yes"
else:
  session "No"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const ifStmt = result.program.statements[0] as IfStatementNode;
        expect(ifStmt.thenBody).toHaveLength(1);
        expect(ifStmt.elseBody).toHaveLength(1);
      });

      it('should parse if/elif/else statement', () => {
        const source = `if **is positive**:
  session "Positive"
elif **is negative**:
  session "Negative"
else:
  session "Neutral"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const ifStmt = result.program.statements[0] as IfStatementNode;
        expect(ifStmt.thenBody).toHaveLength(1);
        expect(ifStmt.elseIfClauses).toHaveLength(1);
        expect(ifStmt.elseIfClauses[0].condition.expression).toBe('is negative');
        expect(ifStmt.elseBody).toHaveLength(1);
      });

      it('should parse multiple elif clauses', () => {
        const source = `if **case A**:
  session "A"
elif **case B**:
  session "B"
elif **case C**:
  session "C"
elif **case D**:
  session "D"
else:
  session "Default"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const ifStmt = result.program.statements[0] as IfStatementNode;
        expect(ifStmt.elseIfClauses).toHaveLength(3);
      });

      it('should parse nested if statements', () => {
        const source = `if **outer condition**:
  if **inner condition**:
    session "Both true"
  else:
    session "Outer only"
else:
  session "Neither"`;
        const result = parse(source);
        expect(result.errors).toHaveLength(0);

        const ifStmt = result.program.statements[0] as IfStatementNode;
        expect(ifStmt.thenBody).toHaveLength(1);
        expect((ifStmt.thenBody[0] as IfStatementNode).type).toBe('IfStatement');
      });
    });

    describe('Validator', () => {
      it('should validate if statement', () => {
        const source = `if **valid**:
  session "Valid"`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
      });

      it('should validate if/elif/else', () => {
        const source = `if **a**:
  session "A"
elif **b**:
  session "B"
else:
  session "C"`;
        const parseResult = parse(source);
        const result = validate(parseResult.program);
        expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
      });
    });

    describe('Compiler', () => {
      it('should compile simple if statement', () => {
        const source = `if **valid**:
  session "Process"`;
        const result = parse(source);
        const output = compileToString(result.program);
        expect(output).toContain('if **valid**:');
        expect(output).toContain('session "Process"');
      });

      it('should compile if/else', () => {
        const source = `if **condition**:
  session "Yes"
else:
  session "No"`;
        const result = parse(source);
        const output = compileToString(result.program);
        expect(output).toContain('if **condition**:');
        expect(output).toContain('else:');
      });

      it('should compile if/elif/else', () => {
        const source = `if **a**:
  session "A"
elif **b**:
  session "B"
else:
  session "C"`;
        const result = parse(source);
        const output = compileToString(result.program);
        expect(output).toContain('if **a**:');
        expect(output).toContain('elif **b**:');
        expect(output).toContain('else:');
      });
    });
  });

  // ======================================
  // Integration Tests
  // ======================================
  describe('Integration', () => {
    it('should handle choice with block parameters', () => {
      const source = `block handle-data(data, mode):
  choice **which processing to use**:
    option "fast":
      session "Quick process of {data}"
    option "thorough":
      session "Deep process of {data}"

let input = session "Get input"
do handle-data(input, "auto")`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle if inside choice', () => {
      const source = `choice **select path**:
  option "conditional":
    if **needs more**:
      session "Extra step"
    else:
      session "Simple step"
  option "direct":
    session "Straight through"`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle if with block invocation', () => {
      const source = `block analyze(item):
  session "Analyze {item}"

let data = session "Get data"

if **data is complex**:
  do analyze(data)
else:
  session "Simple process"`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multi-line string with interpolation', () => {
      const source = `let topic = session "Choose topic"
session """
  Write an essay about {topic}.
  Include multiple paragraphs.
  Be thorough and insightful.
"""`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.prompt?.isTripleQuoted).toBe(true);
    });

    it('should handle complete workflow', () => {
      const source = `# Complex workflow using Tier 12 features
block process-item(item):
  choice **how to handle this item**:
    option "analyze":
      session "Deep analysis of {item}"
    option "summarize":
      session "Quick summary of {item}"

let items = session "Get a list of items"

for item in items:
  if **item is important**:
    do process-item(item)
  elif **item needs review**:
    session """
      Please review {item}
      and provide feedback.
    """
  else:
    session "Skip {item}"`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ======================================
  // Edge Cases
  // ======================================
  describe('Edge Cases', () => {
    it('should handle empty if body', () => {
      const source = `if **condition**:
else:
  session "Else case"`;
      const result = parse(source);
      // Empty body is valid (though unusual)
      const ifStmt = result.program.statements[0] as IfStatementNode;
      expect(ifStmt.thenBody).toHaveLength(0);
    });

    it('should handle choice with single statement options', () => {
      const source = `choice **pick**:
  option "a":
    session "A"`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle deeply nested structures', () => {
      const source = `if **a**:
  if **b**:
    choice **c**:
      option "d":
        if **e**:
          session "Deep"`;
      const result = parse(source);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle adjacent braces in interpolation', () => {
      const source = `session "{a}{b}{c}"`;
      const result = tokenize(source);
      const stringToken = result.tokens.find(t => t.type === TokenType.STRING);
      expect(stringToken?.stringMetadata?.interpolations).toHaveLength(3);
    });
  });
});
