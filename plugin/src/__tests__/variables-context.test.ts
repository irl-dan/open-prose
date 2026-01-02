/**
 * Unit tests for OpenProse Variables & Context (Tier 4)
 *
 * Tests let/const bindings, variable reassignment, and context property.
 */

import { parse } from '../parser';
import { tokenize } from '../parser/lexer';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compile, compileToString } from '../compiler';
import { getSemanticTokens, SemanticTokenType } from '../lsp/semantic-tokens';
import {
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  SessionStatementNode,
  PropertyNode,
  IdentifierNode,
  ArrayExpressionNode,
} from '../parser/ast';

describe('Variables & Context (Tier 4)', () => {
  describe('Lexer', () => {
    it('should tokenize let keyword', () => {
      const result = tokenize('let');
      const letToken = result.tokens.find(t => t.type === TokenType.LET);

      expect(letToken).toBeDefined();
      expect(letToken!.value).toBe('let');
    });

    it('should tokenize const keyword', () => {
      const result = tokenize('const');
      const constToken = result.tokens.find(t => t.type === TokenType.CONST);

      expect(constToken).toBeDefined();
      expect(constToken!.value).toBe('const');
    });

    it('should tokenize context keyword', () => {
      const result = tokenize('context');
      const contextToken = result.tokens.find(t => t.type === TokenType.CONTEXT);

      expect(contextToken).toBeDefined();
      expect(contextToken!.value).toBe('context');
    });

    it('should tokenize equals sign', () => {
      const result = tokenize('=');
      const equalsToken = result.tokens.find(t => t.type === TokenType.EQUALS);

      expect(equalsToken).toBeDefined();
      expect(equalsToken!.value).toBe('=');
    });

    it('should tokenize full let binding statement', () => {
      const result = tokenize('let research = session "Research topic"');

      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.LET);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('research');
      expect(tokens[2].type).toBe(TokenType.EQUALS);
      expect(tokens[3].type).toBe(TokenType.SESSION);
      expect(tokens[4].type).toBe(TokenType.STRING);
    });
  });

  describe('Parser - Let Binding', () => {
    it('should parse basic let binding with simple session', () => {
      const source = `let research = session "Research the topic"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const letBinding = result.program.statements[0] as LetBindingNode;
      expect(letBinding.type).toBe('LetBinding');
      expect(letBinding.name.name).toBe('research');
      expect(letBinding.value.type).toBe('SessionStatement');

      const session = letBinding.value as SessionStatementNode;
      expect(session.prompt?.value).toBe('Research the topic');
    });

    it('should parse let binding with session agent', () => {
      const source = `agent researcher:
  model: sonnet

let result = session: researcher
  prompt: "Do research"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const letBinding = result.program.statements[1] as LetBindingNode;
      expect(letBinding.type).toBe('LetBinding');
      expect(letBinding.name.name).toBe('result');

      const session = letBinding.value as SessionStatementNode;
      expect(session.agent?.name).toBe('researcher');
    });

    it('should parse multiple let bindings', () => {
      const source = `let step1 = session "First step"
let step2 = session "Second step"
let step3 = session "Third step"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(3);

      const bindings = result.program.statements as LetBindingNode[];
      expect(bindings[0].name.name).toBe('step1');
      expect(bindings[1].name.name).toBe('step2');
      expect(bindings[2].name.name).toBe('step3');
    });
  });

  describe('Parser - Const Binding', () => {
    it('should parse basic const binding', () => {
      const source = `const config = session "Get configuration"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const constBinding = result.program.statements[0] as ConstBindingNode;
      expect(constBinding.type).toBe('ConstBinding');
      expect(constBinding.name.name).toBe('config');
      expect(constBinding.value.type).toBe('SessionStatement');
    });

    it('should parse const binding with agent session', () => {
      const source = `agent analyzer:
  model: opus

const analysis = session: analyzer
  prompt: "Analyze the data"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const constBinding = result.program.statements[1] as ConstBindingNode;
      expect(constBinding.type).toBe('ConstBinding');
      expect(constBinding.name.name).toBe('analysis');
    });
  });

  describe('Parser - Assignment', () => {
    it('should parse variable reassignment', () => {
      const source = `let result = session "Initial"
result = session "Updated"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const assignment = result.program.statements[1] as AssignmentNode;
      expect(assignment.type).toBe('Assignment');
      expect(assignment.name.name).toBe('result');
      expect(assignment.value.type).toBe('SessionStatement');
    });
  });

  describe('Parser - Context Property', () => {
    it('should parse session with single context variable', () => {
      const source = `let research = session "Research"

session "Write report"
  context: research`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.properties).toHaveLength(1);

      const contextProp = session.properties[0];
      expect(contextProp.name.name).toBe('context');
      expect(contextProp.value.type).toBe('Identifier');
      expect((contextProp.value as IdentifierNode).name).toBe('research');
    });

    it('should parse session with multiple context variables', () => {
      const source = `let research = session "Research"
let analysis = session "Analyze"

session "Final report"
  context: [research, analysis]`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(3);

      const session = result.program.statements[2] as SessionStatementNode;
      const contextProp = session.properties[0];
      expect(contextProp.name.name).toBe('context');
      expect(contextProp.value.type).toBe('ArrayExpression');

      const arr = contextProp.value as ArrayExpressionNode;
      expect(arr.elements).toHaveLength(2);
      expect((arr.elements[0] as IdentifierNode).name).toBe('research');
      expect((arr.elements[1] as IdentifierNode).name).toBe('analysis');
    });

    it('should parse session with empty context (fresh start)', () => {
      const source = `session "Independent task"
  context: []`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      const contextProp = session.properties[0];
      expect(contextProp.name.name).toBe('context');
      expect(contextProp.value.type).toBe('ArrayExpression');

      const arr = contextProp.value as ArrayExpressionNode;
      expect(arr.elements).toHaveLength(0);
    });

    it('should parse session with context and other properties', () => {
      const source = `agent writer:
  model: opus

let research = session "Research"

session: writer
  prompt: "Write based on research"
  context: research`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[2] as SessionStatementNode;
      expect(session.properties).toHaveLength(2);

      const promptProp = session.properties.find(p => p.name.name === 'prompt');
      const contextProp = session.properties.find(p => p.name.name === 'context');

      expect(promptProp).toBeDefined();
      expect(contextProp).toBeDefined();
    });
  });

  describe('Validator', () => {
    it('should validate valid let binding', () => {
      const source = `let result = session "Do something"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate valid const binding', () => {
      const source = `const config = session "Get config"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on duplicate variable definition', () => {
      const source = `let result = session "First"
let result = session "Duplicate"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Duplicate variable'))).toBe(true);
    });

    it('should error on const reassignment', () => {
      const source = `const config = session "Initial"
config = session "Reassigned"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Cannot reassign const'))).toBe(true);
    });

    it('should allow let reassignment', () => {
      const source = `let result = session "Initial"
result = session "Updated"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should error on undefined variable in assignment', () => {
      const source = `undefinedVar = session "Something"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined variable'))).toBe(true);
    });

    it('should validate context with defined variable', () => {
      const source = `let research = session "Research"

session "Report"
  context: research`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should error on undefined context variable', () => {
      const source = `session "Report"
  context: undefinedVar`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined variable in context'))).toBe(true);
    });

    it('should validate context with multiple defined variables', () => {
      const source = `let research = session "Research"
let analysis = session "Analyze"

session "Report"
  context: [research, analysis]`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should error on undefined variable in context array', () => {
      const source = `let research = session "Research"

session "Report"
  context: [research, undefined_var]`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined variable in context'))).toBe(true);
    });

    it('should validate empty context array', () => {
      const source = `session "Fresh start"
  context: []`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should error on variable name conflicting with agent', () => {
      const source = `agent researcher:
  model: sonnet

let researcher = session "Conflict"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('conflicts with agent name'))).toBe(true);
    });
  });

  describe('Compiler', () => {
    it('should compile let binding with simple session', () => {
      const source = `let research = session "Research topic"`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toBe('let research = session "Research topic"');
    });

    it('should compile const binding', () => {
      const source = `const config = session "Get config"`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toBe('const config = session "Get config"');
    });

    it('should compile assignment', () => {
      const source = `let result = session "Initial"
result = session "Updated"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('let result = session "Initial"');
      expect(compiled).toContain('result = session "Updated"');
    });

    it('should compile let binding with agent session', () => {
      const source = `agent researcher:
  model: sonnet

let result = session: researcher
  prompt: "Do research"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('let result = session: researcher');
      expect(compiled).toContain('prompt: "Do research"');
    });

    it('should compile session with context property', () => {
      const source = `let research = session "Research"

session "Report"
  context: research`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('let research = session "Research"');
      expect(compiled).toContain('context: research');
    });

    it('should compile session with array context', () => {
      const source = `let a = session "A"
let b = session "B"

session "Combined"
  context: [a, b]`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('context: [a, b]');
    });

    it('should compile session with empty context', () => {
      const source = `session "Fresh"
  context: []`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('context: []');
    });
  });

  describe('Semantic Tokens', () => {
    it('should mark let keyword with Keyword type', () => {
      const tokens = getSemanticTokens('let x = session "test"');

      const letToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(letToken).toBeDefined();
      expect(letToken!.length).toBe(3);
    });

    it('should mark const keyword with Keyword type', () => {
      const tokens = getSemanticTokens('const x = session "test"');

      const constToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(constToken).toBeDefined();
      expect(constToken!.length).toBe(5);
    });

    it('should mark context keyword with Keyword type', () => {
      const tokens = getSemanticTokens('  context: research');

      const contextToken = tokens.find(t => t.tokenType === SemanticTokenType.Keyword);
      expect(contextToken).toBeDefined();
    });

    it('should mark equals operator with Operator type', () => {
      const tokens = getSemanticTokens('let x = session "test"');

      const equalsToken = tokens.find(t => t.tokenType === SemanticTokenType.Operator);
      expect(equalsToken).toBeDefined();
    });

    it('should mark variable name with Variable type', () => {
      const tokens = getSemanticTokens('let research = session "test"');

      const varToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Variable && t.startChar === 4
      );
      expect(varToken).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow with variables and context', () => {
      const source = `# Research workflow with context passing
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

agent writer:
  model: opus
  prompt: "You are a technical writer"

# Gather research
let research = session: researcher
  prompt: "Research quantum computing"

# Analyze findings
let analysis = session: researcher
  prompt: "Analyze the key findings"
  context: research

# Write final report
const report = session: writer
  prompt: "Write a comprehensive report"
  context: [research, analysis]`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compile(result.program);
      expect(compiled.code).toContain('let research = session: researcher');
      expect(compiled.code).toContain('let analysis = session: researcher');
      expect(compiled.code).toContain('context: research');
      expect(compiled.code).toContain('const report = session: writer');
      expect(compiled.code).toContain('context: [research, analysis]');
    });

    it('should handle variable reassignment in workflow', () => {
      const source = `let draft = session "Write initial draft"

# Refine the draft
draft = session "Improve the draft"
  context: draft

# Final version
draft = session "Polish and finalize"
  context: draft`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });

    it('should handle fresh context with empty array', () => {
      const source = `let previous = session "Previous work"

# Start fresh without previous context
session "Independent task"
  context: []

# Use previous context again
session "Continue work"
  context: previous`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should error on let without variable name', () => {
      const source = `let = session "test"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('variable name'))).toBe(true);
    });

    it('should error on let without equals sign', () => {
      const source = `let x session "test"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('='))).toBe(true);
    });

    it('should error on const without variable name', () => {
      const source = `const = session "test"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('variable name'))).toBe(true);
    });

    it('should error on assignment to undeclared variable', () => {
      const source = `unknownVar = session "test"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined variable'))).toBe(true);
    });

    it('should error on context with non-identifier', () => {
      const source = `session "test"
  context: "not a variable"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('variable reference'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle variable names with hyphens', () => {
      const source = `let my-research = session "Research"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      const binding = result.program.statements[0] as LetBindingNode;
      expect(binding.name.name).toBe('my-research');
    });

    it('should handle variable names with underscores', () => {
      const source = `let my_research = session "Research"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      const binding = result.program.statements[0] as LetBindingNode;
      expect(binding.name.name).toBe('my_research');
    });

    it('should handle many variables in context array', () => {
      const source = `let a = session "A"
let b = session "B"
let c = session "C"
let d = session "D"
let e = session "E"

session "Combined"
  context: [a, b, c, d, e]`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[5] as SessionStatementNode;
      const contextProp = session.properties[0];
      const arr = contextProp.value as ArrayExpressionNode;

      expect(arr.elements).toHaveLength(5);
    });

    it('should handle mixed let and const bindings', () => {
      const source = `const immutable = session "Cannot change"
let mutable = session "Can change"

mutable = session "Changed"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should handle context property in agent session', () => {
      const source = `agent writer:
  model: opus

let research = session "Research"

session: writer
  prompt: "Write report"
  context: research`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(result.errors).toHaveLength(0);
      expect(validation.valid).toBe(true);
    });
  });
});
