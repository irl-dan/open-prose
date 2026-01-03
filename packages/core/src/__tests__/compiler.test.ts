/**
 * Unit tests for the OpenProse Compiler
 *
 * Tests comment stripping as specified in Tier 0.2
 */

import { parse } from '../parser';
import { compile, compileToString, stripComments } from '../compiler';

describe('Compiler', () => {
  describe('Comment Stripping', () => {
    it('should strip standalone comments', () => {
      const source = `# This is a comment
session "Hello"`;

      const parseResult = parse(source);
      expect(parseResult.errors).toHaveLength(0);

      const compileResult = compile(parseResult.program);
      expect(compileResult.code).toBe('session "Hello"\n');
      expect(compileResult.strippedComments).toHaveLength(1);
      expect(compileResult.strippedComments[0].value).toBe('# This is a comment');
    });

    it('should strip inline comments', () => {
      const source = 'session "Hello"  # inline comment';

      const parseResult = parse(source);
      expect(parseResult.errors).toHaveLength(0);

      const compileResult = compile(parseResult.program);
      expect(compileResult.code).toBe('session "Hello"\n');
      expect(compileResult.strippedComments).toHaveLength(1);
      expect(compileResult.strippedComments[0].value).toBe('# inline comment');
      expect(compileResult.strippedComments[0].isInline).toBe(true);
    });

    it('should strip multiple comments', () => {
      const source = `# Header
session "Hello"  # inline
# Footer`;

      const parseResult = parse(source);
      expect(parseResult.errors).toHaveLength(0);

      const compileResult = compile(parseResult.program);
      expect(compileResult.code).toBe('session "Hello"\n');
      expect(compileResult.strippedComments).toHaveLength(3);
    });

    it('should preserve comments when option is set', () => {
      const source = `# Header
session "Hello"`;

      const parseResult = parse(source);
      expect(parseResult.errors).toHaveLength(0);

      const compileResult = compile(parseResult.program, { preserveComments: true });
      expect(compileResult.code).toContain('# Header');
      expect(compileResult.code).toContain('session "Hello"');
    });
  });

  describe('compileToString helper', () => {
    it('should return just the code string', () => {
      const source = `# Comment
session "Hello"`;

      const parseResult = parse(source);
      const code = compileToString(parseResult.program);

      expect(code).toBe('session "Hello"\n');
    });
  });

  describe('stripComments utility function', () => {
    it('should strip comments from source string', () => {
      const source = `# This is a comment
session "Hello"`;

      const result = stripComments(source);
      expect(result).toBe('session "Hello"');
    });

    it('should strip inline comments', () => {
      const source = 'session "Hello"  # comment';
      const result = stripComments(source);
      expect(result).toBe('session "Hello"');
    });

    it('should NOT strip # inside strings', () => {
      const source = 'session "hello # world"';
      const result = stripComments(source);
      expect(result).toBe('session "hello # world"');
    });

    it('should handle escaped quotes in strings', () => {
      const source = 'session "say \\"hello\\"" # comment';
      const result = stripComments(source);
      expect(result).toBe('session "say \\"hello\\""');
    });

    it('should handle multiple lines', () => {
      const source = `# Comment 1
session "A"  # inline
# Comment 2
session "B"`;

      const result = stripComments(source);
      expect(result).toBe(`session "A"
session "B"`);
    });
  });

  describe('Expected compiled output from specification', () => {
    it('should produce expected output', () => {
      const source = `# This is a standalone comment
session "Hello"  # This is an inline comment
# Another comment`;

      const parseResult = parse(source);
      expect(parseResult.errors).toHaveLength(0);

      const compileResult = compile(parseResult.program);

      // Expected: session "Hello" with comments stripped
      expect(compileResult.code.trim()).toBe('session "Hello"');
    });
  });

  describe('Source maps', () => {
    it('should generate source maps when enabled', () => {
      const source = 'session "Hello"';

      const parseResult = parse(source);
      const compileResult = compile(parseResult.program, { sourceMaps: true });

      expect(compileResult.sourceMap).toBeDefined();
      expect(compileResult.sourceMap!.mappings).toHaveLength(1);
    });

    it('should not generate source maps by default', () => {
      const source = 'session "Hello"';

      const parseResult = parse(source);
      const compileResult = compile(parseResult.program);

      expect(compileResult.sourceMap).toBeUndefined();
    });
  });
});
