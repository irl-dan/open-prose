/**
 * Unit tests for the OpenProse Semantic Tokens Provider
 *
 * Tests syntax highlighting for comments as specified in Tier 0.2
 */

import {
  SemanticTokensProvider,
  getSemanticTokens,
  getEncodedSemanticTokens,
  getSemanticTokensLegend,
  SemanticTokenType,
} from '../lsp';

describe('SemanticTokensProvider', () => {
  describe('Comment highlighting', () => {
    it('should mark comments with Comment token type', () => {
      const source = '# This is a comment';
      const tokens = getSemanticTokens(source);

      const commentTokens = tokens.filter(t => t.tokenType === SemanticTokenType.Comment);
      expect(commentTokens).toHaveLength(1);
      expect(commentTokens[0].line).toBe(0); // 0-based
      expect(commentTokens[0].startChar).toBe(0);
    });

    it('should mark inline comments correctly', () => {
      const source = 'session "Hello"  # inline comment';
      const tokens = getSemanticTokens(source);

      const commentTokens = tokens.filter(t => t.tokenType === SemanticTokenType.Comment);
      expect(commentTokens).toHaveLength(1);
    });

    it('should mark multiple comments', () => {
      const source = `# First
# Second
# Third`;

      const tokens = getSemanticTokens(source);
      const commentTokens = tokens.filter(t => t.tokenType === SemanticTokenType.Comment);
      expect(commentTokens).toHaveLength(3);

      // Check line numbers (0-based)
      expect(commentTokens[0].line).toBe(0);
      expect(commentTokens[1].line).toBe(1);
      expect(commentTokens[2].line).toBe(2);
    });
  });

  describe('Other token types', () => {
    it('should mark strings with String token type', () => {
      const source = 'session "Hello"';
      const tokens = getSemanticTokens(source);

      const stringTokens = tokens.filter(t => t.tokenType === SemanticTokenType.String);
      expect(stringTokens).toHaveLength(1);
    });

    it('should mark keywords with Keyword token type', () => {
      const source = 'session "Hello"';
      const tokens = getSemanticTokens(source);

      const keywordTokens = tokens.filter(t => t.tokenType === SemanticTokenType.Keyword);
      expect(keywordTokens).toHaveLength(1);
    });
  });

  describe('Semantic tokens legend', () => {
    it('should include comment in token types', () => {
      const legend = getSemanticTokensLegend();
      expect(legend.tokenTypes).toContain('comment');
    });

    it('should have correct index for comment type', () => {
      const legend = getSemanticTokensLegend();
      const commentIndex = legend.tokenTypes.indexOf('comment');
      expect(commentIndex).toBe(SemanticTokenType.Comment);
    });
  });

  describe('Encoded tokens (LSP format)', () => {
    it('should encode tokens with delta encoding', () => {
      const source = `# Comment
session "Hello"`;

      const result = getEncodedSemanticTokens(source);

      // Format: [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
      // Each token is 5 integers
      expect(result.data.length % 5).toBe(0);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should correctly encode single comment', () => {
      const source = '# Comment';
      const result = getEncodedSemanticTokens(source);

      // First token should have deltaLine=0, deltaChar=0
      expect(result.data[0]).toBe(0); // deltaLine
      expect(result.data[1]).toBe(0); // deltaStartChar
      expect(result.data[3]).toBe(SemanticTokenType.Comment); // tokenType
    });

    it('should correctly encode tokens on same line', () => {
      const source = 'session "Hello"  # comment';
      const result = getEncodedSemanticTokens(source);

      // Should have 3 tokens: session (keyword), "Hello" (string), # comment (comment)
      expect(result.data.length).toBe(15); // 3 tokens * 5 values

      // Third token (comment) should have deltaLine=0 since it's on same line
      expect(result.data[10]).toBe(0); // deltaLine for comment token
    });
  });

  describe('Provider class', () => {
    it('should be instantiable', () => {
      const provider = new SemanticTokensProvider();
      expect(provider).toBeDefined();
    });

    it('should return empty array for empty source', () => {
      const provider = new SemanticTokensProvider();
      const tokens = provider.getSemanticTokens('');
      expect(tokens).toHaveLength(0);
    });
  });
});
