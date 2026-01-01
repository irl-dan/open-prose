/**
 * Unit tests for the OpenProse Lexer
 *
 * Tests comment handling as specified in Tier 0.2
 */

import { Lexer, tokenize, extractComments, tokenizeWithoutComments } from '../parser/lexer';
import { TokenType } from '../parser/tokens';

describe('Lexer', () => {
  describe('Standalone Comments', () => {
    it('should tokenize a single standalone comment', () => {
      const source = '# This is a comment';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2); // COMMENT + EOF

      const commentToken = result.tokens[0];
      expect(commentToken.type).toBe(TokenType.COMMENT);
      expect(commentToken.value).toBe('# This is a comment');
      expect(commentToken.span.start.line).toBe(1);
      expect(commentToken.span.start.column).toBe(1);
    });

    it('should tokenize multiple standalone comments', () => {
      const source = `# First comment
# Second comment
# Third comment`;
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);

      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(3);
      expect(comments[0].value).toBe('# First comment');
      expect(comments[0].span.start.line).toBe(1);
      expect(comments[1].value).toBe('# Second comment');
      expect(comments[1].span.start.line).toBe(2);
      expect(comments[2].value).toBe('# Third comment');
      expect(comments[2].span.start.line).toBe(3);
    });

    it('should handle comment at end of file without newline', () => {
      const source = '# Comment without newline';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toBe('# Comment without newline');
    });
  });

  describe('Inline Comments', () => {
    it('should tokenize inline comment after session statement', () => {
      const source = 'session "Hello"  # inline comment';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);

      const tokens = result.tokens.filter(t => t.type !== TokenType.EOF);
      expect(tokens).toHaveLength(3); // SESSION, STRING, COMMENT

      expect(tokens[0].type).toBe(TokenType.SESSION);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('Hello');
      expect(tokens[2].type).toBe(TokenType.COMMENT);
      expect(tokens[2].value).toBe('# inline comment');
    });

    it('should handle inline comment with minimal spacing', () => {
      const source = 'session "test"# comment';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toBe('# comment');
    });
  });

  describe('Comments in Strings (NOT parsed as comments)', () => {
    it('should NOT treat # inside double-quoted string as comment', () => {
      const source = 'session "hello # world"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);

      const stringTokens = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(stringTokens).toHaveLength(1);
      expect(stringTokens[0].value).toBe('hello # world');

      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(0);
    });

    it('should NOT treat # in triple-quoted string as comment', () => {
      const source = `session """
Hello # this is not a comment
World
"""`;
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);

      const stringTokens = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(stringTokens).toHaveLength(1);
      expect(stringTokens[0].value).toContain('# this is not a comment');

      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(0);
    });

    it('should handle escaped # in string', () => {
      const source = 'session "test \\# escaped"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);

      const stringTokens = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(stringTokens).toHaveLength(1);
      expect(stringTokens[0].value).toBe('test # escaped');

      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(0);
    });

    it('should properly handle string then comment on same line', () => {
      const source = 'session "prompt" # this IS a comment';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);

      const stringTokens = result.tokens.filter(t => t.type === TokenType.STRING);
      expect(stringTokens).toHaveLength(1);
      expect(stringTokens[0].value).toBe('prompt');

      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toBe('# this IS a comment');
    });
  });

  describe('Empty Comments', () => {
    it('should handle empty comment (just #)', () => {
      const source = '#';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toBe('#');
    });

    it('should handle # followed by newline', () => {
      const source = '#\nsession "Hello"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toBe('#');
    });

    it('should handle # with only whitespace', () => {
      const source = '#   ';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toBe('#   ');
    });
  });

  describe('Multiple Consecutive Comments', () => {
    it('should handle multiple consecutive comment lines', () => {
      const source = `# Comment 1
# Comment 2
# Comment 3`;
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(3);
    });

    it('should handle comments with blank lines between', () => {
      const source = `# First

# Second`;
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(2);
      expect(comments[0].span.start.line).toBe(1);
      expect(comments[1].span.start.line).toBe(3);
    });
  });

  describe('extractComments helper', () => {
    it('should extract only comment tokens', () => {
      const source = `# Header comment
session "Hello"  # inline
# Footer comment`;

      const comments = extractComments(source);
      expect(comments).toHaveLength(3);
      expect(comments[0].value).toBe('# Header comment');
      expect(comments[1].value).toBe('# inline');
      expect(comments[2].value).toBe('# Footer comment');
    });
  });

  describe('tokenizeWithoutComments helper', () => {
    it('should filter out comment tokens', () => {
      const source = `# Comment
session "Hello"  # inline`;

      const result = tokenizeWithoutComments(source);
      expect(result.errors).toHaveLength(0);

      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(0);

      const sessionTokens = result.tokens.filter(t => t.type === TokenType.SESSION);
      expect(sessionTokens).toHaveLength(1);
    });
  });

  describe('Comment edge cases', () => {
    it('should handle Windows line endings (CRLF)', () => {
      const source = '# Comment\r\nsession "Hello"';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].span.start.line).toBe(1);
    });

    it('should handle tab characters in comments', () => {
      const source = '#\tComment with tabs\t\t';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toBe('#\tComment with tabs\t\t');
    });

    it('should handle special characters in comments', () => {
      const source = '# Special: @#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
    });

    it('should handle unicode in comments', () => {
      const source = '# Unicode: \u{1F600} \u{1F389} \u{1F680}';
      const result = tokenize(source);

      expect(result.errors).toHaveLength(0);
      const comments = result.tokens.filter(t => t.type === TokenType.COMMENT);
      expect(comments).toHaveLength(1);
    });
  });

  describe('Expected token output format', () => {
    it('should match expected output from specification', () => {
      const source = `# This is a standalone comment
session "Hello"  # This is an inline comment
# Another comment`;

      const result = tokenize(source);
      expect(result.errors).toHaveLength(0);

      // Filter non-structural tokens for comparison
      const significantTokens = result.tokens.filter(t =>
        t.type !== TokenType.NEWLINE &&
        t.type !== TokenType.INDENT &&
        t.type !== TokenType.DEDENT &&
        t.type !== TokenType.EOF
      );

      expect(significantTokens).toHaveLength(5);

      // COMMENT("# This is a standalone comment", line 1)
      expect(significantTokens[0].type).toBe(TokenType.COMMENT);
      expect(significantTokens[0].value).toBe('# This is a standalone comment');
      expect(significantTokens[0].span.start.line).toBe(1);

      // SESSION("session", line 2)
      expect(significantTokens[1].type).toBe(TokenType.SESSION);
      expect(significantTokens[1].span.start.line).toBe(2);

      // STRING("Hello", line 2)
      expect(significantTokens[2].type).toBe(TokenType.STRING);
      expect(significantTokens[2].value).toBe('Hello');
      expect(significantTokens[2].span.start.line).toBe(2);

      // COMMENT("# This is an inline comment", line 2)
      expect(significantTokens[3].type).toBe(TokenType.COMMENT);
      expect(significantTokens[3].value).toBe('# This is an inline comment');
      expect(significantTokens[3].span.start.line).toBe(2);

      // COMMENT("# Another comment", line 3)
      expect(significantTokens[4].type).toBe(TokenType.COMMENT);
      expect(significantTokens[4].value).toBe('# Another comment');
      expect(significantTokens[4].span.start.line).toBe(3);
    });
  });
});
