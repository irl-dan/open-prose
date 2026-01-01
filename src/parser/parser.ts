/**
 * OpenProse Parser
 *
 * A minimal parser for OpenProse that handles comments and basic session statements.
 * This parser will be extended in later tiers to handle the full language.
 */

import { Token, TokenType, SourceSpan } from './tokens';
import { Lexer, LexerResult } from './lexer';
import {
  ASTNode,
  ProgramNode,
  StatementNode,
  CommentNode,
  CommentStatementNode,
  SessionStatementNode,
  StringLiteralNode,
  createProgramNode,
  createCommentNode,
} from './ast';

export interface ParseResult {
  program: ProgramNode;
  errors: ParseError[];
}

export interface ParseError {
  message: string;
  span: SourceSpan;
}

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParseError[] = [];
  private comments: CommentNode[] = [];

  constructor(private source: string) {}

  /**
   * Parse the source code into an AST
   */
  public parse(): ParseResult {
    // First, tokenize the source
    const lexer = new Lexer(this.source, { includeComments: true });
    const lexResult = lexer.tokenize();

    this.tokens = lexResult.tokens;
    this.current = 0;
    this.errors = [];
    this.comments = [];

    // Convert lexer errors to parse errors
    for (const error of lexResult.errors) {
      this.errors.push({
        message: error.message,
        span: error.span,
      });
    }

    // Parse the program
    const statements = this.parseStatements();

    // Create program node
    const span: SourceSpan = {
      start: { line: 1, column: 1, offset: 0 },
      end: this.tokens.length > 0
        ? this.tokens[this.tokens.length - 1].span.end
        : { line: 1, column: 1, offset: 0 },
    };

    const program = createProgramNode(statements, this.comments, span);

    return {
      program,
      errors: this.errors,
    };
  }

  /**
   * Parse all statements in the program
   */
  private parseStatements(): StatementNode[] {
    const statements: StatementNode[] = [];

    while (!this.isAtEnd()) {
      // Skip newlines between statements
      while (this.check(TokenType.NEWLINE)) {
        this.advance();
      }

      if (this.isAtEnd()) break;

      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    return statements;
  }

  /**
   * Parse a single statement
   */
  private parseStatement(): StatementNode | null {
    // Handle comments
    if (this.check(TokenType.COMMENT)) {
      return this.parseCommentStatement();
    }

    // Handle session keyword
    if (this.check(TokenType.SESSION)) {
      return this.parseSessionStatement();
    }

    // Skip unknown tokens for now (will be expanded in later tiers)
    if (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    return null;
  }

  /**
   * Parse a comment statement
   */
  private parseCommentStatement(): CommentStatementNode {
    const token = this.advance();
    const comment = createCommentNode(token.value, token.span, false);
    this.comments.push(comment);

    return {
      type: 'CommentStatement',
      comment,
      span: token.span,
    };
  }

  /**
   * Parse a session statement
   */
  private parseSessionStatement(): SessionStatementNode {
    const sessionToken = this.advance();
    const start = sessionToken.span.start;

    let prompt: StringLiteralNode | null = null;
    let inlineComment: CommentNode | null = null;

    // Check for string literal (prompt)
    if (this.check(TokenType.STRING)) {
      const stringToken = this.advance();
      prompt = {
        type: 'StringLiteral',
        value: stringToken.value,
        raw: `"${stringToken.value}"`,
        isTripleQuoted: stringToken.value.includes('\n'),
        span: stringToken.span,
      };
    }

    // Check for inline comment
    if (this.check(TokenType.COMMENT)) {
      const commentToken = this.advance();
      inlineComment = createCommentNode(commentToken.value, commentToken.span, true);
      this.comments.push(inlineComment);
    }

    const end = this.previous().span.end;

    return {
      type: 'SessionStatement',
      prompt,
      agent: null,
      name: null,
      properties: [],
      inlineComment,
      span: { start, end },
    };
  }

  // Helper methods

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    this.addError(message);
    return this.peek();
  }

  private addError(message: string): void {
    this.errors.push({
      message,
      span: this.peek().span,
    });
  }
}

/**
 * Parse source code into an AST
 */
export function parse(source: string): ParseResult {
  const parser = new Parser(source);
  return parser.parse();
}

/**
 * Extract all comments from source code as AST nodes
 */
export function parseComments(source: string): CommentNode[] {
  const result = parse(source);
  return result.program.comments;
}
