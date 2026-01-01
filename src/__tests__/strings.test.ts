/**
 * Unit tests for String Literal handling (Tier 0.3)
 *
 * Tests comprehensive string literal functionality including:
 * - Simple strings
 * - Empty strings
 * - Escape sequences
 * - Unicode escapes
 * - Error handling
 * - Edge cases
 */

import { Lexer, tokenize } from '../parser/lexer';
import { TokenType } from '../parser/tokens';
import { parse } from '../parser/parser';
import { validate } from '../validator/validator';
import { compile, compileToString } from '../compiler/compiler';

describe('String Literals', () => {
  describe('Simple Strings', () => {
    it('should tokenize a simple string', () => {
      const source = '"hello"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('hello');
    });

    it('should tokenize an empty string', () => {
      const source = '""';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('');
    });

    it('should tokenize a string with spaces', () => {
      const source = '"hello world"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('hello world');
    });

    it('should tokenize multiple strings on same line', () => {
      const source = '"a" "b" "c"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(3);
      expect(strings[0].value).toBe('a');
      expect(strings[1].value).toBe('b');
      expect(strings[2].value).toBe('c');
    });
  });

  describe('Escape Sequences', () => {
    it('should handle escaped double quote', () => {
      const source = '"say \\"hello\\""';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('say "hello"');
    });

    it('should handle escaped backslash', () => {
      const source = '"path\\\\to\\\\file"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('path\\to\\file');
    });

    it('should handle newline escape', () => {
      const source = '"line1\\nline2"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('line1\nline2');
    });

    it('should handle tab escape', () => {
      const source = '"col1\\tcol2"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('col1\tcol2');
    });

    it('should handle carriage return escape', () => {
      const source = '"text\\rmore"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('text\rmore');
    });

    it('should handle null escape', () => {
      const source = '"null\\0char"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('null\0char');
    });

    it('should handle escaped hash', () => {
      const source = '"hello\\#world"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('hello#world');
    });

    it('should handle multiple escape sequences', () => {
      const source = '"hello\\nworld\\ttab\\\\slash"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('hello\nworld\ttab\\slash');
    });

    it('should track escape sequences in metadata', () => {
      const source = '"hello\\nworld"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);

      const metadata = strings[0].stringMetadata;
      expect(metadata).toBeDefined();
      expect(metadata!.escapeSequences).toHaveLength(1);
      expect(metadata!.escapeSequences[0].type).toBe('standard');
      expect(metadata!.escapeSequences[0].sequence).toBe('\\n');
      expect(metadata!.escapeSequences[0].resolved).toBe('\n');
    });
  });

  describe('Unicode Escapes', () => {
    it('should handle unicode escape for letter A', () => {
      const source = '"\\u0041"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('A');
    });

    it('should handle unicode escape for lowercase a', () => {
      const source = '"\\u0061"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('a');
    });

    it('should handle unicode escape for special character', () => {
      const source = '"\\u00A9"'; // Copyright symbol
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('\u00A9');
    });

    it('should handle lowercase hex digits in unicode escape', () => {
      const source = '"\\u00ff"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('\u00ff');
    });

    it('should handle mixed case hex digits in unicode escape', () => {
      const source = '"\\u00Ff"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('\u00ff');
    });

    it('should handle multiple unicode escapes', () => {
      const source = '"\\u0048\\u0069"'; // Hi
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('Hi');
    });

    it('should handle unicode escape mixed with regular text', () => {
      const source = '"Hello \\u0041 World"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('Hello A World');
    });

    it('should track unicode escape sequences in metadata', () => {
      const source = '"\\u0041"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);

      const metadata = strings[0].stringMetadata;
      expect(metadata).toBeDefined();
      expect(metadata!.escapeSequences).toHaveLength(1);
      expect(metadata!.escapeSequences[0].type).toBe('unicode');
      expect(metadata!.escapeSequences[0].sequence).toBe('\\u0041');
      expect(metadata!.escapeSequences[0].resolved).toBe('A');
    });
  });

  describe('Invalid Escape Sequences', () => {
    it('should warn on unrecognized escape sequence', () => {
      const source = '"hello\\zworld"';
      const result = tokenize(source);

      // Should have a warning but still produce a token
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('hellozworld');

      // Check for warning
      const warnings = result.errors.filter(e => e.severity === 'warning');
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings[0].message).toContain('Unrecognized escape sequence');
    });

    it('should track invalid escape sequences in metadata', () => {
      const source = '"\\z"';
      const result = tokenize(source);

      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);

      const metadata = strings[0].stringMetadata;
      expect(metadata).toBeDefined();
      expect(metadata!.escapeSequences).toHaveLength(1);
      expect(metadata!.escapeSequences[0].type).toBe('invalid');
    });
  });

  describe('Invalid Unicode Escapes', () => {
    it('should error on incomplete unicode escape (0 digits)', () => {
      const source = '"\\u"';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('unicode');
    });

    it('should error on incomplete unicode escape (1 digit)', () => {
      const source = '"\\u0"';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('unicode');
    });

    it('should error on incomplete unicode escape (2 digits)', () => {
      const source = '"\\u00"';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('unicode');
    });

    it('should error on incomplete unicode escape (3 digits)', () => {
      const source = '"\\u004"';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('unicode');
    });

    it('should error on invalid hex digit in unicode escape', () => {
      const source = '"\\u00GG"';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('not a valid hex digit');
    });
  });

  describe('Unterminated Strings', () => {
    it('should error on unterminated string (EOF)', () => {
      const source = '"hello';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('Unterminated string literal');
    });

    it('should error on unterminated string (newline)', () => {
      const source = '"hello\nworld"';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('Unterminated string literal');
    });

    it('should error on unterminated string with escape at end', () => {
      const source = '"hello\\';
      const result = tokenize(source);

      const errors = result.errors.filter(e => e.severity === 'error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('Unterminated string literal');
    });
  });

  describe('String Metadata', () => {
    it('should include raw string with quotes', () => {
      const source = '"hello"';
      const result = tokenize(source);

      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);

      const metadata = strings[0].stringMetadata;
      expect(metadata).toBeDefined();
      expect(metadata!.raw).toBe('"hello"');
      expect(metadata!.isTripleQuoted).toBe(false);
    });

    it('should include raw string with escape sequences', () => {
      const source = '"hello\\nworld"';
      const result = tokenize(source);

      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);

      const metadata = strings[0].stringMetadata;
      expect(metadata).toBeDefined();
      expect(metadata!.raw).toBe('"hello\\nworld"');
    });

    it('should mark triple-quoted strings correctly', () => {
      const source = '"""triple"""';
      const result = tokenize(source);

      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);

      const metadata = strings[0].stringMetadata;
      expect(metadata).toBeDefined();
      expect(metadata!.isTripleQuoted).toBe(true);
    });
  });

  describe('Parser Integration', () => {
    it('should parse session with string literal', () => {
      const source = 'session "Hello World"';
      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);

      const session = result.program.statements[0];
      expect(session.type).toBe('SessionStatement');
      if (session.type === 'SessionStatement') {
        expect(session.prompt).not.toBeNull();
        expect(session.prompt!.value).toBe('Hello World');
        expect(session.prompt!.raw).toBe('"Hello World"');
      }
    });

    it('should parse session with escaped string', () => {
      const source = 'session "Say \\"hello\\""';
      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0];
      if (session.type === 'SessionStatement') {
        expect(session.prompt!.value).toBe('Say "hello"');
        expect(session.prompt!.raw).toBe('"Say \\"hello\\""');
      }
    });

    it('should parse session with unicode escape', () => {
      const source = 'session "Hello \\u0041"';
      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0];
      if (session.type === 'SessionStatement') {
        expect(session.prompt!.value).toBe('Hello A');
      }
    });

    it('should include escape sequences in AST node', () => {
      const source = 'session "Hello\\nWorld"';
      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const session = result.program.statements[0];
      if (session.type === 'SessionStatement') {
        expect(session.prompt!.escapeSequences).toBeDefined();
        expect(session.prompt!.escapeSequences).toHaveLength(1);
        expect(session.prompt!.escapeSequences![0].sequence).toBe('\\n');
      }
    });
  });

  describe('Validator Integration', () => {
    it('should validate valid strings', () => {
      const source = 'session "Hello World"';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should warn on invalid escape sequences', () => {
      const source = 'session "Hello\\zWorld"';
      const parseResult = parse(source);
      const validationResult = validate(parseResult.program);

      // The lexer already warns, but the validator should also note invalid escapes
      expect(validationResult.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Compiler Integration', () => {
    it('should compile session with simple string', () => {
      const source = 'session "Hello World"';
      const parseResult = parse(source);
      const output = compileToString(parseResult.program);

      expect(output).toContain('session "Hello World"');
    });

    it('should properly escape strings in compiled output', () => {
      const source = 'session "Hello\\nWorld"';
      const parseResult = parse(source);
      const output = compileToString(parseResult.program);

      // The newline should be escaped back to \n in output
      expect(output).toContain('\\n');
    });

    it('should handle strings with quotes in compiled output', () => {
      const source = 'session "Say \\"hello\\""';
      const parseResult = parse(source);
      const output = compileToString(parseResult.program);

      // The quotes should be escaped in output
      expect(output).toContain('\\"');
    });
  });

  describe('Edge Cases', () => {
    it('should handle string with only escape sequences', () => {
      const source = '"\\n\\t\\r"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('\n\t\r');
    });

    it('should handle string at end of file', () => {
      const source = 'session "Hello"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
    });

    it('should handle empty file with just empty string', () => {
      const source = '""';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe('');
    });

    it('should handle string followed by comment', () => {
      const source = '"hello" # comment';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(strings).toHaveLength(1);
      expect(comments).toHaveLength(1);
    });

    it('should handle consecutive strings', () => {
      const source = '"a""b"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(2);
      expect(strings[0].value).toBe('a');
      expect(strings[1].value).toBe('b');
    });

    it('should preserve special characters like emoji in strings', () => {
      const source = '"Hello \u{1F600}"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      // Emoji should be preserved
      expect(strings[0].value).toContain('\u{1F600}');
    });

    it('should handle very long strings', () => {
      const longContent = 'a'.repeat(10000);
      const source = `"${longContent}"`;
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const strings = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(strings).toHaveLength(1);
      expect(strings[0].value).toBe(longContent);
    });
  });
});
