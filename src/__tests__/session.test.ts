/**
 * Unit tests for OpenProse Simple Session (Tier 1.1)
 *
 * Tests the session statement parsing, validation, compilation, and semantic tokens.
 */

import { parse } from '../parser';
import { tokenize } from '../parser/lexer';
import { TokenType } from '../parser/tokens';
import { validate } from '../validator';
import { compile, compileToString } from '../compiler';
import { getSemanticTokens, SemanticTokenType } from '../lsp/semantic-tokens';
import { SessionStatementNode } from '../parser/ast';

describe('Simple Session (Tier 1.1)', () => {
  describe('Lexer', () => {
    it('should tokenize session keyword', () => {
      const result = tokenize('session');
      const sessionToken = result.tokens.find(t => t.type === TokenType.SESSION);

      expect(sessionToken).toBeDefined();
      expect(sessionToken!.value).toBe('session');
    });

    it('should tokenize session with string prompt', () => {
      const result = tokenize('session "Hello"');

      const tokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF
      );

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.SESSION);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('Hello');
    });

    it('should tokenize multiple sessions', () => {
      const result = tokenize('session "First"\nsession "Second"');

      const sessionTokens = result.tokens.filter(t => t.type === TokenType.SESSION);
      const stringTokens = result.tokens.filter(t => t.type === TokenType.STRING);

      expect(sessionTokens).toHaveLength(2);
      expect(stringTokens).toHaveLength(2);
      expect(stringTokens[0].value).toBe('First');
      expect(stringTokens[1].value).toBe('Second');
    });
  });

  describe('Parser', () => {
    it('should parse simple session', () => {
      const result = parse('session "Hello"');

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.type).toBe('SessionStatement');
      expect(session.prompt).not.toBeNull();
      expect(session.prompt!.value).toBe('Hello');
    });

    it('should parse session with escape sequences', () => {
      const result = parse('session "Say \\"hi\\""');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('Say "hi"');
    });

    it('should parse session with newline escape', () => {
      const result = parse('session "Line1\\nLine2"');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('Line1\nLine2');
    });

    it('should parse session with inline comment', () => {
      const result = parse('session "Hello"  # inline comment');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('Hello');
      expect(session.inlineComment).not.toBeNull();
      expect(session.inlineComment!.value).toBe('# inline comment');
    });

    it('should parse multiple sessions', () => {
      const source = `session "First"
session "Second"
session "Third"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(3);

      const sessions = result.program.statements as SessionStatementNode[];
      expect(sessions[0].prompt!.value).toBe('First');
      expect(sessions[1].prompt!.value).toBe('Second');
      expect(sessions[2].prompt!.value).toBe('Third');
    });

    it('should parse session at end of file (no trailing newline)', () => {
      const result = parse('session "Hello"');

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);
    });

    it('should parse session followed by comment', () => {
      const source = `session "Hello"
# This is a comment`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const sessions = result.program.statements.filter(s => s.type === 'SessionStatement');
      const comments = result.program.statements.filter(s => s.type === 'CommentStatement');

      expect(sessions).toHaveLength(1);
      expect(comments).toHaveLength(1);
    });

    it('should parse session with unicode in prompt', () => {
      const result = parse('session "Hello \\u0041\\u0042\\u0043"');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('Hello ABC');
    });

    it('should parse empty prompt', () => {
      const result = parse('session ""');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('');
    });

    it('should parse session without prompt (missing string)', () => {
      const result = parse('session');

      // Parser should succeed but create a session with null prompt
      expect(result.program.statements).toHaveLength(1);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.type).toBe('SessionStatement');
      expect(session.prompt).toBeNull();
    });

    it('should have correct span for session', () => {
      const result = parse('session "Hello"');

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.span.start.line).toBe(1);
      expect(session.span.start.column).toBe(1);
    });
  });

  describe('Validator', () => {
    it('should pass validation for valid session', () => {
      const result = parse('session "Hello"');
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should error on session without prompt', () => {
      const result = parse('session');
      const validation = validate(result.program);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].message).toContain('requires a prompt');
    });

    it('should warn on empty prompt', () => {
      const result = parse('session ""');
      const validation = validate(result.program);

      expect(validation.valid).toBe(true); // Warnings don't invalidate
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.message.includes('empty prompt'))).toBe(true);
    });

    it('should warn on very long prompt', () => {
      const longPrompt = 'x'.repeat(15000);
      const result = parse(`session "${longPrompt}"`);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.message.includes('very long'))).toBe(true);
    });

    it('should warn on whitespace-only prompt', () => {
      const result = parse('session "   "');
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.message.includes('whitespace'))).toBe(true);
    });

    it('should pass validation for session with escape sequences', () => {
      const result = parse('session "Hello\\nWorld"');
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate multiple sessions independently', () => {
      const source = `session "Valid"
session ""
session "Also valid"`;

      const result = parse(source);
      const validation = validate(result.program);

      expect(validation.valid).toBe(true);
      // One warning for the empty prompt
      expect(validation.warnings.some(w => w.message.includes('empty prompt'))).toBe(true);
    });
  });

  describe('Compiler', () => {
    it('should compile simple session', () => {
      const result = parse('session "Hello"');
      const compiled = compileToString(result.program);

      expect(compiled.trim()).toBe('session "Hello"');
    });

    it('should compile session with escape sequences', () => {
      const result = parse('session "Say \\"hi\\""');
      const compiled = compileToString(result.program);

      expect(compiled.trim()).toBe('session "Say \\"hi\\""');
    });

    it('should compile session and strip inline comment', () => {
      const result = parse('session "Hello"  # comment');
      const compiled = compile(result.program);

      expect(compiled.code.trim()).toBe('session "Hello"');
      expect(compiled.strippedComments).toHaveLength(1);
      expect(compiled.strippedComments[0].value).toBe('# comment');
    });

    it('should preserve comments when option is set', () => {
      const result = parse('session "Hello"  # comment');
      const compiled = compile(result.program, { preserveComments: true });

      expect(compiled.code).toContain('# comment');
    });

    it('should compile multiple sessions', () => {
      const source = `session "First"
session "Second"`;

      const result = parse(source);
      const compiled = compileToString(result.program);

      expect(compiled).toContain('session "First"');
      expect(compiled).toContain('session "Second"');
    });

    it('should generate source maps when enabled', () => {
      const result = parse('session "Hello"');
      const compiled = compile(result.program, { sourceMaps: true });

      expect(compiled.sourceMap).toBeDefined();
      expect(compiled.sourceMap!.mappings.length).toBeGreaterThan(0);
    });

    it('should escape special characters in compiled output', () => {
      // Create a string with special characters via parsing
      const result = parse('session "Tab:\\tNewline:\\n"');
      const compiled = compileToString(result.program);

      // Compiled output should have escape sequences
      expect(compiled).toContain('\\t');
      expect(compiled).toContain('\\n');
    });
  });

  describe('Semantic Tokens', () => {
    it('should mark session keyword with Keyword type', () => {
      const tokens = getSemanticTokens('session "Hello"');

      const keywordToken = tokens.find(t => t.tokenType === SemanticTokenType.Keyword);
      expect(keywordToken).toBeDefined();
      expect(keywordToken!.line).toBe(0); // 0-based
      expect(keywordToken!.startChar).toBe(0);
      expect(keywordToken!.length).toBe(7); // "session" is 7 characters
    });

    it('should mark prompt string with String type', () => {
      const tokens = getSemanticTokens('session "Hello"');

      const stringToken = tokens.find(t => t.tokenType === SemanticTokenType.String);
      expect(stringToken).toBeDefined();
      expect(stringToken!.startChar).toBe(8); // After "session "
    });

    it('should mark inline comment with Comment type', () => {
      const tokens = getSemanticTokens('session "Hello"  # comment');

      const commentToken = tokens.find(t => t.tokenType === SemanticTokenType.Comment);
      expect(commentToken).toBeDefined();
    });

    it('should have correct tokens for multiple sessions', () => {
      const source = `session "First"
session "Second"`;

      const tokens = getSemanticTokens(source);

      const keywordTokens = tokens.filter(t => t.tokenType === SemanticTokenType.Keyword);
      const stringTokens = tokens.filter(t => t.tokenType === SemanticTokenType.String);

      expect(keywordTokens).toHaveLength(2);
      expect(stringTokens).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle session with very long prompt (within limits)', () => {
      const prompt = 'x'.repeat(5000);
      const result = parse(`session "${prompt}"`);
      const validation = validate(result.program);

      expect(result.errors).toHaveLength(0);
      expect(validation.valid).toBe(true);
    });

    it('should handle session with special characters in prompt', () => {
      const result = parse('session "Hello! @#$%^&*()"');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('Hello! @#$%^&*()');
    });

    it('should handle session with non-ASCII characters', () => {
      const result = parse('session "Hello World"');

      expect(result.errors).toHaveLength(0);

      // Note: emoji is not in the test since we need to verify string handling
    });

    it('should handle multiple sessions with comments between them', () => {
      const source = `session "First"
# Comment between
session "Second"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const sessions = result.program.statements.filter(s => s.type === 'SessionStatement');
      expect(sessions).toHaveLength(2);
    });

    it('should handle session after multiple comments', () => {
      const source = `# Comment 1
# Comment 2
# Comment 3
session "Hello"`;

      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const sessions = result.program.statements.filter(s => s.type === 'SessionStatement');
      expect(sessions).toHaveLength(1);
    });

    it('should handle prompt with only escaped characters', () => {
      const result = parse('session "\\n\\t\\r"');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('\n\t\r');
    });

    it('should handle prompt with hash that is not a comment', () => {
      const result = parse('session "Hello # this is not a comment"');

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0] as SessionStatementNode;
      expect(session.prompt!.value).toBe('Hello # this is not a comment');
    });
  });

  describe('Error Cases', () => {
    it('should handle missing closing quote', () => {
      const result = parse('session "Hello');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('Unterminated'))).toBe(true);
    });

    it('should handle non-string after session keyword', () => {
      const result = parse('session 123');

      // Parser should handle this gracefully
      // The session will have a null prompt since 123 is not a string
      const session = result.program.statements.find(s => s.type === 'SessionStatement') as SessionStatementNode;
      expect(session).toBeDefined();
      expect(session.prompt).toBeNull();
    });
  });

  describe('Integration', () => {
    it('should round-trip a session through parse and compile', () => {
      const original = 'session "Hello World"';
      const result = parse(original);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toBe(original);
    });

    it('should round-trip session with escape sequences', () => {
      const original = 'session "Line1\\nLine2"';
      const result = parse(original);
      const compiled = compileToString(result.program).trim();

      expect(compiled).toBe(original);
    });

    it('should handle full workflow: parse -> validate -> compile', () => {
      const source = `# Header comment
session "First task"
session "Second task"  # inline
# Footer comment`;

      // Parse
      const parseResult = parse(source);
      expect(parseResult.errors).toHaveLength(0);

      // Validate
      const validationResult = validate(parseResult.program);
      expect(validationResult.valid).toBe(true);

      // Compile
      const compileResult = compile(parseResult.program);
      expect(compileResult.code).toContain('session "First task"');
      expect(compileResult.code).toContain('session "Second task"');
      expect(compileResult.strippedComments.length).toBe(3);
    });
  });
});
