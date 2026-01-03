/**
 * Unit tests for OpenProse Skills & Imports (Tier 3)
 *
 * Tests import statements, agent skills, and permissions.
 */

import { parse } from '../parser';
import { tokenize } from '../parser/lexer';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compile, compileToString } from '../compiler';
import { getSemanticTokens, SemanticTokenType } from '../lsp/semantic-tokens';
import {
  ImportStatementNode,
  AgentDefinitionNode,
  PropertyNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  StringLiteralNode,
  IdentifierNode,
} from '../parser/ast';

describe('Skills & Imports (Tier 3)', () => {
  describe('Lexer', () => {
    it('should tokenize import keyword', () => {
      const result = tokenize('import');
      const importToken = result.tokens.find(t => t.type === TokenType.IMPORT);

      expect(importToken).toBeDefined();
      expect(importToken!.value).toBe('import');
    });

    it('should tokenize from keyword', () => {
      const result = tokenize('from');
      const fromToken = result.tokens.find(t => t.type === TokenType.FROM);

      expect(fromToken).toBeDefined();
      expect(fromToken!.value).toBe('from');
    });

    it('should tokenize skills keyword', () => {
      const result = tokenize('skills');
      const skillsToken = result.tokens.find(t => t.type === TokenType.SKILLS);

      expect(skillsToken).toBeDefined();
      expect(skillsToken!.value).toBe('skills');
    });

    it('should tokenize permissions keyword', () => {
      const result = tokenize('permissions');
      const permToken = result.tokens.find(t => t.type === TokenType.PERMISSIONS);

      expect(permToken).toBeDefined();
      expect(permToken!.value).toBe('permissions');
    });

    it('should tokenize full import statement', () => {
      const result = tokenize('import "web-search" from "github:user/repo"');

      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe(TokenType.IMPORT);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('web-search');
      expect(tokens[2].type).toBe(TokenType.FROM);
      expect(tokens[3].type).toBe(TokenType.STRING);
      expect(tokens[3].value).toBe('github:user/repo');
    });

    it('should tokenize array brackets', () => {
      const result = tokenize('["a", "b"]');

      const lbracket = result.tokens.find(t => t.type === TokenType.LBRACKET);
      const rbracket = result.tokens.find(t => t.type === TokenType.RBRACKET);
      const comma = result.tokens.find(t => t.type === TokenType.COMMA);

      expect(lbracket).toBeDefined();
      expect(rbracket).toBeDefined();
      expect(comma).toBeDefined();
    });
  });

  describe('Parser - Import Statements', () => {
    it('should parse basic import statement', () => {
      const source = `import "web-search" from "github:example/skills"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const importStmt = result.program.statements[0] as ImportStatementNode;
      expect(importStmt.type).toBe('ImportStatement');
      expect(importStmt.skillName.value).toBe('web-search');
      expect(importStmt.source.value).toBe('github:example/skills');
    });

    it('should parse import from local path', () => {
      const source = `import "my-skill" from "./skills/my-skill"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const importStmt = result.program.statements[0] as ImportStatementNode;
      expect(importStmt.skillName.value).toBe('my-skill');
      expect(importStmt.source.value).toBe('./skills/my-skill');
    });

    it('should parse import from npm', () => {
      const source = `import "analyzer" from "npm:@org/analyzer"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const importStmt = result.program.statements[0] as ImportStatementNode;
      expect(importStmt.source.value).toBe('npm:@org/analyzer');
    });

    it('should parse multiple import statements', () => {
      const source = `import "skill-a" from "github:user/a"
import "skill-b" from "github:user/b"
import "skill-c" from "./local"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(3);

      const imports = result.program.statements as ImportStatementNode[];
      expect(imports[0].skillName.value).toBe('skill-a');
      expect(imports[1].skillName.value).toBe('skill-b');
      expect(imports[2].skillName.value).toBe('skill-c');
    });

    it('should handle import with escaped characters in skill name', () => {
      const source = `import "my-skill\\"v2" from "github:user/repo"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const importStmt = result.program.statements[0] as ImportStatementNode;
      expect(importStmt.skillName.value).toBe('my-skill"v2');
    });
  });

  describe('Parser - Agent Skills', () => {
    it('should parse agent with skills array', () => {
      const source = `agent researcher:
  skills: ["web-search", "summarizer"]`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.properties).toHaveLength(1);

      const skillsProp = agent.properties[0];
      expect(skillsProp.name.name).toBe('skills');
      expect(skillsProp.value.type).toBe('ArrayExpression');

      const arr = skillsProp.value as ArrayExpressionNode;
      expect(arr.elements).toHaveLength(2);
      expect((arr.elements[0] as StringLiteralNode).value).toBe('web-search');
      expect((arr.elements[1] as StringLiteralNode).value).toBe('summarizer');
    });

    it('should parse agent with single skill', () => {
      const source = `agent writer:
  skills: ["formatter"]`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const skillsProp = agent.properties.find(p => p.name.name === 'skills');

      expect(skillsProp).toBeDefined();
      const arr = skillsProp!.value as ArrayExpressionNode;
      expect(arr.elements).toHaveLength(1);
    });

    it('should parse agent with empty skills array', () => {
      const source = `agent minimal:
  skills: []`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const skillsProp = agent.properties.find(p => p.name.name === 'skills');

      const arr = skillsProp!.value as ArrayExpressionNode;
      expect(arr.elements).toHaveLength(0);
    });

    it('should parse agent with model, prompt, and skills', () => {
      const source = `agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
  skills: ["web-search", "file-reader"]`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.properties).toHaveLength(3);

      const modelProp = agent.properties.find(p => p.name.name === 'model');
      const promptProp = agent.properties.find(p => p.name.name === 'prompt');
      const skillsProp = agent.properties.find(p => p.name.name === 'skills');

      expect(modelProp).toBeDefined();
      expect(promptProp).toBeDefined();
      expect(skillsProp).toBeDefined();
    });
  });

  describe('Parser - Agent Permissions', () => {
    it('should parse agent with permissions block', () => {
      const source = `agent secure-agent:
  permissions:
    bash: deny`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const permsProp = agent.properties.find(p => p.name.name === 'permissions');

      expect(permsProp).toBeDefined();
      expect(permsProp!.value.type).toBe('ObjectExpression');

      const obj = permsProp!.value as ObjectExpressionNode;
      expect(obj.properties).toHaveLength(1);
      expect(obj.properties[0].name.name).toBe('bash');
      expect((obj.properties[0].value as IdentifierNode).name).toBe('deny');
    });

    it('should parse permissions with array values', () => {
      const source = `agent file-agent:
  permissions:
    read: ["*.md", "*.txt"]
    write: ["output/"]`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const permsProp = agent.properties.find(p => p.name.name === 'permissions');
      const obj = permsProp!.value as ObjectExpressionNode;

      expect(obj.properties).toHaveLength(2);

      const readProp = obj.properties.find(p => p.name.name === 'read');
      const writeProp = obj.properties.find(p => p.name.name === 'write');

      expect(readProp).toBeDefined();
      expect(writeProp).toBeDefined();

      const readArr = readProp!.value as ArrayExpressionNode;
      expect(readArr.elements).toHaveLength(2);
    });

    it('should parse full agent with skills and permissions', () => {
      const source = `agent researcher:
  model: sonnet
  skills: ["web-search"]
  permissions:
    bash: deny
    read: ["*.md"]`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      expect(agent.properties).toHaveLength(3);
    });
  });

  describe('Validator', () => {
    it('should validate valid import statement', () => {
      const source = `import "web-search" from "github:user/repo"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should error on duplicate import', () => {
      const source = `import "web-search" from "github:user/repo"
import "web-search" from "github:other/repo"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Duplicate import'))).toBe(true);
    });

    it('should warn on unknown import source format', () => {
      const source = `import "skill" from "invalid-source"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('should start with'))).toBe(true);
    });

    it('should validate skills that are imported', () => {
      const source = `import "web-search" from "github:user/repo"

agent researcher:
  skills: ["web-search"]`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should warn on skills that are not imported', () => {
      const source = `agent researcher:
  skills: ["unimported-skill"]`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('not imported'))).toBe(true);
    });

    it('should validate permissions block', () => {
      const source = `agent secure:
  permissions:
    bash: deny
    read: ["*.md"]`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
    });

    it('should warn on unknown permission type', () => {
      const source = `agent agent1:
  permissions:
    unknown-perm: allow`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('Unknown permission type'))).toBe(true);
    });

    it('should warn on unknown permission value', () => {
      const source = `agent agent1:
  permissions:
    bash: unknown-value`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('Unknown permission value'))).toBe(true);
    });

    it('should warn on empty skills array', () => {
      const source = `agent minimal:
  skills: []`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('empty'))).toBe(true);
    });
  });

  describe('Compiler', () => {
    it('should compile import statement', () => {
      const source = `import "web-search" from "github:user/repo"`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toBe('import "web-search" from "github:user/repo"');
    });

    it('should compile multiple imports', () => {
      const source = `import "skill-a" from "github:user/a"
import "skill-b" from "./local"`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('import "skill-a" from "github:user/a"');
      expect(compiled).toContain('import "skill-b" from "./local"');
    });

    it('should compile agent with skills', () => {
      const source = `agent researcher:
  skills: ["web-search", "summarizer"]`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('agent researcher:');
      expect(compiled).toContain('skills: ["web-search", "summarizer"]');
    });

    it('should compile agent with permissions', () => {
      const source = `agent secure:
  permissions:
    bash: deny`;

      const result = parse(source);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toContain('agent secure:');
      expect(compiled).toContain('permissions:');
      expect(compiled).toContain('bash: deny');
    });

    it('should compile full program with imports, agents, and sessions', () => {
      const source = `import "web-search" from "github:example/skills"

agent researcher:
  model: sonnet
  skills: ["web-search"]

session: researcher
  prompt: "Research the topic"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('import "web-search"');
      expect(compiled).toContain('agent researcher:');
      expect(compiled).toContain('skills: ["web-search"]');
      expect(compiled).toContain('session: researcher');
    });

    it('should escape special characters in import strings', () => {
      const source = `import "skill\\"name" from "path/to\\"source"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('\\"');
    });
  });

  describe('Semantic Tokens', () => {
    it('should mark import keyword with Keyword type', () => {
      const tokens = getSemanticTokens('import "skill" from "source"');

      const keywordToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar === 0
      );
      expect(keywordToken).toBeDefined();
      expect(keywordToken!.length).toBe(6); // "import"
    });

    it('should mark from keyword with Keyword type', () => {
      const tokens = getSemanticTokens('import "skill" from "source"');

      const fromToken = tokens.find(t =>
        t.tokenType === SemanticTokenType.Keyword && t.startChar > 10
      );
      expect(fromToken).toBeDefined();
    });

    it('should mark skills keyword with Keyword type', () => {
      const tokens = getSemanticTokens('  skills: ["a"]');

      const keywordToken = tokens.find(t => t.tokenType === SemanticTokenType.Keyword);
      expect(keywordToken).toBeDefined();
    });

    it('should mark permissions keyword with Keyword type', () => {
      const tokens = getSemanticTokens('  permissions:');

      const keywordToken = tokens.find(t => t.tokenType === SemanticTokenType.Keyword);
      expect(keywordToken).toBeDefined();
    });

    it('should mark strings in arrays with String type', () => {
      const tokens = getSemanticTokens('skills: ["web-search"]');

      const stringTokens = tokens.filter(t => t.tokenType === SemanticTokenType.String);
      expect(stringTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow with imports, agents, and sessions', () => {
      const source = `# Import external skills
import "web-search" from "github:anthropic/skills"
import "code-analyzer" from "./local-skills"

# Define an agent with skills
agent researcher:
  model: sonnet
  prompt: "You are a research assistant"
  skills: ["web-search", "code-analyzer"]
  permissions:
    read: ["*.md", "*.txt"]
    write: ["output/"]

# Use agent in session
session: researcher
  prompt: "Research the topic and save findings"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const validation = validate(result.program);
      expect(validation.valid).toBe(true);

      const compiled = compile(result.program);
      expect(compiled.code).toContain('import "web-search"');
      expect(compiled.code).toContain('import "code-analyzer"');
      expect(compiled.code).toContain('agent researcher:');
      expect(compiled.code).toContain('skills: ["web-search", "code-analyzer"]');
      expect(compiled.code).toContain('permissions:');
      expect(compiled.code).toContain('session: researcher');
    });

    it('should handle imports before agents which come before sessions', () => {
      const source = `import "skill" from "github:user/repo"

agent a:
  skills: ["skill"]

session: a`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(result.errors).toHaveLength(0);
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should handle agent without skills using imported skill in different agent', () => {
      const source = `import "web-search" from "github:user/repo"

agent basic:
  model: haiku

agent advanced:
  skills: ["web-search"]

session: basic
session: advanced`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(result.errors).toHaveLength(0);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle skill name with hyphens', () => {
      const source = `agent test:
  skills: ["my-custom-skill"]`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const skillsProp = agent.properties[0];
      const arr = skillsProp.value as ArrayExpressionNode;
      expect((arr.elements[0] as StringLiteralNode).value).toBe('my-custom-skill');
    });

    it('should handle permission patterns with wildcards', () => {
      const source = `agent file-handler:
  permissions:
    read: ["**/*.ts", "src/**/*"]
    write: ["dist/"]`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const permsProp = agent.properties.find(p => p.name.name === 'permissions');
      const obj = permsProp!.value as ObjectExpressionNode;
      const readProp = obj.properties.find(p => p.name.name === 'read');
      const arr = readProp!.value as ArrayExpressionNode;

      expect((arr.elements[0] as StringLiteralNode).value).toBe('**/*.ts');
    });

    it('should handle github import with organization', () => {
      const source = `import "skill" from "github:org-name/repo-name"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const importStmt = result.program.statements[0] as ImportStatementNode;
      expect(importStmt.source.value).toBe('github:org-name/repo-name');
    });

    it('should handle relative path imports', () => {
      const source = `import "skill" from "../parent/skills"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const importStmt = result.program.statements[0] as ImportStatementNode;
      expect(importStmt.source.value).toBe('../parent/skills');
    });

    it('should handle many skills in array', () => {
      const source = `agent power-user:
  skills: ["a", "b", "c", "d", "e"]`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const skillsProp = agent.properties[0];
      const arr = skillsProp.value as ArrayExpressionNode;
      expect(arr.elements).toHaveLength(5);
    });

    it('should handle many permission types', () => {
      const source = `agent full-access:
  permissions:
    read: ["*"]
    write: ["*"]
    execute: ["*.sh"]
    bash: allow
    network: allow`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const agent = result.program.statements[0] as AgentDefinitionNode;
      const permsProp = agent.properties.find(p => p.name.name === 'permissions');
      const obj = permsProp!.value as ObjectExpressionNode;
      expect(obj.properties).toHaveLength(5);
    });
  });

  describe('Error Cases', () => {
    it('should error on import without skill name', () => {
      const source = `import from "github:user/repo"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('skill name'))).toBe(true);
    });

    it('should error on import without from', () => {
      const source = `import "skill"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('from'))).toBe(true);
    });

    it('should error on import without source', () => {
      const source = `import "skill" from`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes('source'))).toBe(true);
    });

    it('should error on unclosed array in skills', () => {
      const source = `agent test:
  skills: ["a", "b"`;

      const result = parse(source);

      expect(result.errors.some(e => e.message.includes(']'))).toBe(true);
    });
  });
});
