/**
 * Unit tests for the OpenProse Parser
 *
 * Tests comment handling in the AST as specified in Tier 0.2
 */

import { parse, parseComments } from '../parser';

describe('Parser', () => {
  describe('Comment AST Nodes', () => {
    it('should parse standalone comment into CommentStatement', () => {
      const source = '# This is a comment';
      const result = parse(source);

      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);
      expect(result.program.statements[0].type).toBe('CommentStatement');

      const commentStmt = result.program.statements[0] as any;
      expect(commentStmt.comment.value).toBe('# This is a comment');
      expect(commentStmt.comment.isInline).toBe(false);
    });

    it('should collect all comments in program.comments', () => {
      const source = `# First
session "Hello"  # Second
# Third`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      expect(result.program.comments).toHaveLength(3);
    });

    it('should mark inline comments correctly', () => {
      const source = 'session "Hello"  # inline';
      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const inlineComments = result.program.comments.filter(c => c.isInline);
      expect(inlineComments).toHaveLength(1);
      expect(inlineComments[0].value).toBe('# inline');
    });
  });

  describe('Session with inline comment', () => {
    it('should parse session statement with inline comment', () => {
      const source = 'session "Hello"  # comment';
      const result = parse(source);

      expect(result.errors).toHaveLength(0);

      const sessionStmts = result.program.statements.filter(
        s => s.type === 'SessionStatement'
      );
      expect(sessionStmts).toHaveLength(1);

      const session = sessionStmts[0] as any;
      expect(session.prompt.value).toBe('Hello');
      expect(session.inlineComment).not.toBeNull();
      expect(session.inlineComment.value).toBe('# comment');
    });
  });

  describe('parseComments helper', () => {
    it('should return array of comment nodes', () => {
      const source = `# Header
session "test"  # inline
# Footer`;

      const comments = parseComments(source);
      expect(comments).toHaveLength(3);
      expect(comments[0].value).toBe('# Header');
      expect(comments[1].value).toBe('# inline');
      expect(comments[2].value).toBe('# Footer');
    });
  });

  describe('Program structure', () => {
    it('should have correct span for program', () => {
      const source = `# Comment
session "Hello"`;

      const result = parse(source);
      expect(result.program.span.start.line).toBe(1);
      expect(result.program.span.start.column).toBe(1);
    });

    it('should handle empty source', () => {
      const result = parse('');
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(0);
      expect(result.program.comments).toHaveLength(0);
    });

    it('should handle source with only comments', () => {
      const source = `# Comment 1
# Comment 2`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(2);
      expect(result.program.comments).toHaveLength(2);
    });
  });

  describe('Comments do not break parsing', () => {
    it('should handle comment between statements', () => {
      const source = `session "First"
# Comment in between
session "Second"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const sessions = result.program.statements.filter(
        s => s.type === 'SessionStatement'
      );
      expect(sessions).toHaveLength(2);
    });

    it('should handle multiple comments in a row', () => {
      const source = `# One
# Two
# Three
session "Hello"`;

      const result = parse(source);
      expect(result.errors).toHaveLength(0);

      const sessions = result.program.statements.filter(
        s => s.type === 'SessionStatement'
      );
      expect(sessions).toHaveLength(1);
      expect(result.program.comments).toHaveLength(3);
    });
  });
});
