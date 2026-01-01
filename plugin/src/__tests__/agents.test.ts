/**
 * Unit tests for OpenProse Agents (Tier 2)
 *
 * Tests agent definitions, sessions with agents, and property handling.
 */

import { parse } from '../parser';
import { tokenize } from '../parser/lexer';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compile, compileToString } from '../compiler';
import { getSemanticTokens, SemanticTokenType } from '../lsp/semantic-tokens';
import {
  AgentDefinitionNode,
  SessionStatementNode,
  PropertyNode,
  IdentifierNode,
  StringLiteralNode,
} from '../parser/ast';

describe('Agents (Tier 2)', () => {
  describe('Lexer', () => {
    it('should tokenize agent keyword', () => {
      const result = tokenize('agent');
      const agentToken = result.tokens.find(t => t.type === TokenType.AGENT);

      expect(agentToken).toBeDefined();
      expect(agentToken!.value).toBe('agent');
    });

    it('should tokenize model keyword', () => {
      const result = tokenize('model');
      const modelToken = result.tokens.find(t => t.type === TokenType.MODEL);

      expect(modelToken).toBeDefined();
      expect(modelToken!.value).toBe('model');
    });

    it('should tokenize prompt keyword', () => {
      const result = tokenize('prompt');
      const promptToken = result.tokens.find(t => t.type === TokenType.PROMPT);

      expect(promptToken).toBeDefined();
      expect(promptToken!.value).toBe('prompt');
    });

    it('should tokenize agent definition line', () => {
      const result = tokenize('agent researcher:');

      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.AGENT);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('researcher');
      expect(tokens[2].type).toBe(TokenType.COLON);
    });

    it('should tokenize indented property', () => {
      const result = tokenize('  model: sonnet');

      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens[0].type).toBe(TokenType.INDENT);
      expect(tokens[1].type).toBe(TokenType.MODEL);
      expect(tokens[2].type).toBe(TokenType.COLON);
      expect(tokens[3].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[3].value).toBe('sonnet');
    });
  });

  describe('Parser - Agent Definitions', () => {
    it('should parse basic agent definition', () => {
      const source = `agent researcher:
  model: sonnet`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.type).toBe('AgentDefinition');
      expect(agent.name.name).toBe('researcher');
      expect(agent.properties).toHaveLength(1);
      expect(agent.properties[0].name.name).toBe('model');
    });

    it('should parse agent with model and prompt', () => {
      const source = `agent researcher:
  model: opus
  prompt: "You are a research assistant"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.properties).toHaveLength(2);

      const modelProp = agent.properties.find(p => p.name.name === 'model');
      const promptProp = agent.properties.find(p => p.name.name === 'prompt');

      expect(modelProp).toBeDefined();
      expect(promptProp).toBeDefined();

      expect((modelProp!.value as IdentifierNode).name).toBe('opus');
      expect((promptProp!.value as StringLiteralNode).value).toBe('You are a research assistant');
    });

    it('should parse agent with only prompt', () => {
      const source = `agent writer:
  prompt: "You are a technical writer"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.properties).toHaveLength(1);
      expect(agent.properties[0].name.name).toBe('prompt');
    });

    it('should parse multiple agent definitions', () => {
      const source = `agent researcher:
  model: sonnet

agent writer:
  model: opus`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const agents = result.program.statements as AgentDefinitionNode[];
      expect(agents[0].name.name).toBe('researcher');
      expect(agents[1].name.name).toBe('writer');
    });

    it('should parse empty agent definition', () => {
      const source = `agent empty:`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.name.name).toBe('empty');
      expect(agent.properties).toHaveLength(0);
    });

    it('should handle inline comment after agent definition', () => {
      const source = `agent researcher:  # The main research agent
  model: sonnet`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.name.name).toBe('researcher');
    });

    it('should handle comment inside agent block', () => {
      const source = `agent researcher:
  # Configure the model
  model: sonnet
  # Set the system prompt
  prompt: "You research things"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.properties).toHaveLength(2);
    });
  });

  describe('Parser - Session with Agent', () => {
    it('should parse session with agent reference', () => {
      const source = `agent researcher:
  model: sonnet

session: researcher`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.type).toBe('SessionStatement');
      expect(session.agent).not.toBeNull();
      expect(session.agent!.name).toBe('researcher');
      expect(session.prompt).toBeNull();
    });

    it('should parse named session with agent', () => {
      const source = `agent researcher:
  model: sonnet

session research: researcher`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.name).not.toBeNull();
      expect(session.name!.name).toBe('research');
      expect(session.agent!.name).toBe('researcher');
    });

    it('should parse session with agent and prompt property', () => {
      const source = `agent researcher:
  model: sonnet

session: researcher
  prompt: "Research quantum computing"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.agent!.name).toBe('researcher');
      expect(session.properties).toHaveLength(1);
      expect(session.properties[0].name.name).toBe('prompt');
    });

    it('should parse session with agent and model override', () => {
      const source = `agent researcher:
  model: sonnet

session: researcher
  model: opus`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.properties).toHaveLength(1);
      expect(session.properties[0].name.name).toBe('model');
      expect((session.properties[0].value as IdentifierNode).name).toBe('opus');
    });

    it('should parse session with multiple property overrides', () => {
      const source = `agent researcher:
  model: sonnet
  prompt: "Default prompt"

session: researcher
  model: opus
  prompt: "Override prompt"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.properties).toHaveLength(2);
    });

    it('should preserve simple session syntax', () => {
      const source = `session "Hello world"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt).not.toBeNull();
      expect(session.prompt!.value).toBe('Hello world');
      expect(session.agent).toBeNull();
    });
  });

  describe('Validator', () => {
    it('should validate valid agent definition', () => {
      const source = `agent researcher:
  model: sonnet
  prompt: "Research assistant"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate all model values', () => {
      for (const model of ['sonnet', 'opus', 'haiku']) {
        const source = `agent test:
  model: ${model}`;

        const result = parse(source);
        const validation = validate(result.program);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('should error on invalid model value', () => {
      const source = `agent researcher:
  model: invalid`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Invalid model'))).toBe(true);
    });

    it('should error on duplicate agent definitions', () => {
      const source = `agent researcher:
  model: sonnet

agent researcher:
  model: opus`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Duplicate agent'))).toBe(true);
    });

    it('should error on undefined agent reference', () => {
      const source = `session: undefined_agent`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Undefined agent'))).toBe(true);
    });

    it('should validate session with valid agent reference', () => {
      const source = `agent researcher:
  model: sonnet

session: researcher`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on duplicate properties', () => {
      const source = `agent researcher:
  model: sonnet
  model: opus`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Duplicate property'))).toBe(true);
    });

    it('should warn on empty prompt property', () => {
      const source = `agent researcher:
  prompt: ""`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('empty'))).toBe(true);
    });

    it('should warn on unknown property', () => {
      const source = `agent researcher:
  unknown: value`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('Unknown property'))).toBe(true);
    });
  });

  describe('Compiler', () => {
    it('should compile agent definition', () => {
      const source = `agent researcher:
  model: sonnet`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('agent researcher:');
      expect(compiled).toContain('model: sonnet');
    });

    it('should compile agent with prompt', () => {
      const source = `agent writer:
  model: opus
  prompt: "You are a writer"`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('agent writer:');
      expect(compiled).toContain('model: opus');
      expect(compiled).toContain('prompt: "You are a writer"');
    });

    it('should compile session with agent', () => {
      const source = `agent researcher:
  model: sonnet

session: researcher`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('session: researcher');
    });

    it('should compile named session with agent', () => {
      const source = `agent researcher:
  model: sonnet

session research: researcher`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('session research: researcher');
    });

    it('should compile session with properties', () => {
      const source = `agent researcher:
  model: sonnet

session: researcher
  prompt: "Do research"`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('session: researcher');
      expect(compiled).toContain('prompt: "Do research"');
    });

    it('should preserve simple session compilation', () => {
      const source = `session "Hello"`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toBe('session "Hello"');
    });

    it('should escape strings in compiled output', () => {
      const source = `agent writer:
  prompt: "Say \\"hello\\""`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('\\"hello\\"');
    });
  });

  describe('Semantic Tokens', () => {
    it('should mark agent keyword with Keyword type', () => {
      const tokens = getSemanticTokens('agent researcher:');

      const keywordToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(keywordToken).toBeDefined();
      expect(keywordToken!.length).toBe(5); // "agent"
    });

    it('should mark model keyword with Keyword type', () => {
      const tokens = getSemanticTokens('  model: sonnet');

      const keywordToken = tokens.find(t => t.tokenType === SemanticTokenType.Keyword);
      expect(keywordToken).toBeDefined();
    });

    it('should mark prompt keyword with Keyword type', () => {
      const tokens = getSemanticTokens('  prompt: "hello"');

      const keywordToken = tokens.find(t => t.tokenType === SemanticTokenType.Keyword);
      expect(keywordToken).toBeDefined();
    });

    it('should mark identifier with Variable type', () => {
      const tokens = getSemanticTokens('agent researcher:');

      const identifierToken = tokens.find(t => t.tokenType === SemanticTokenType.Variable);
      expect(identifierToken).toBeDefined();
    });

    it('should mark string literal with String type', () => {
      const tokens = getSemanticTokens('  prompt: "Hello"');

      const stringToken = tokens.find(t => t.tokenType === SemanticTokenType.String);
      expect(stringToken).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should handle full agent + session workflow', () => {
      const source = `# Define agents
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"

agent writer:
  model: opus
  prompt: "You are a technical writer"

# Use agents in sessions
session: researcher
  prompt: "Research quantum computing"

session: writer
  prompt: "Write a summary"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compile(result.program);
      expect(compiled.code).toContain('agent researcher:');
      expect(compiled.code).toContain('agent writer:');
      expect(compiled.code).toContain('session: researcher');
      expect(compiled.code).toContain('session: writer');
    });

    it('should handle mixed simple and agent sessions', () => {
      const source = `agent researcher:
  model: sonnet

session "Simple prompt"

session: researcher
  prompt: "Agent prompt"

session "Another simple prompt"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const sessions = result.program.statements.filter(s => s.type === 'SessionStatement');
      expect(sessions).toHaveLength(3);
    });

    it('should handle property overrides correctly', () => {
      const source = `agent researcher:
  model: sonnet
  prompt: "Base prompt"

session: researcher
  model: opus
  prompt: "Override prompt"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);

      const session = result.program.statements[1] as SessionStatementNode;
      expect(session.properties).toHaveLength(2);

      const modelProp = session.properties.find(p => p.name.name === 'model');
      const promptProp = session.properties.find(p => p.name.name === 'prompt');

      expect((modelProp!.value as IdentifierNode).name).toBe('opus');
      expect((promptProp!.value as StringLiteralNode).value).toBe('Override prompt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle agent with hyphenated name', () => {
      const source = `agent research-agent:
  model: sonnet`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.name.name).toBe('research-agent');
    });

    it('should handle agent with underscore name', () => {
      const source = `agent research_agent:
  model: sonnet`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.name.name).toBe('research_agent');
    });

    it('should handle prompt with special characters', () => {
      const source = `agent writer:
  prompt: "Write about @#$%^&*()"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const promptProp = agent.properties[0];
      expect((promptProp.value as StringLiteralNode).value).toBe('Write about @#$%^&*()');
    });

    it('should handle prompt with escaped quotes', () => {
      const source = `agent writer:
  prompt: "Say \\"hello\\""`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const promptProp = agent.properties[0];
      expect((promptProp.value as StringLiteralNode).value).toBe('Say "hello"');
    });

    it('should handle prompt with newlines', () => {
      const source = `agent writer:
  prompt: "Line 1\\nLine 2"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const promptProp = agent.properties[0];
      expect((promptProp.value as StringLiteralNode).value).toBe('Line 1\nLine 2');
    });

    it('should handle multiple agents followed by multiple sessions', () => {
      const source = `agent a:
  model: sonnet

agent b:
  model: opus

agent c:
  model: haiku

session: a
session: b
session: c`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should error on agent without name', () => {
      const source = `agent :`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('agent name'))).toBe(true);
    });

    it('should error on agent without colon', () => {
      const source = `agent researcher`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes(':'))).toBe(true);
    });

    it('should error on session with colon but no agent', () => {
      const source = `session: `;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('agent name'))).toBe(true);
    });
  });
});
