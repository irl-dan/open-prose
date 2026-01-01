/**
 * OpenProse Parser
 *
 * Parses OpenProse source code including:
 * - Comments
 * - Simple sessions (session "prompt")
 * - Agent definitions (agent name: with properties)
 * - Sessions with agents (session: agent or session name: agent)
 * - Property blocks (model:, prompt:)
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
  AgentDefinitionNode,
  PropertyNode,
  StringLiteralNode,
  IdentifierNode,
  ExpressionNode,
  EscapeSequence,
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

      // Skip DEDENT tokens at top level
      if (this.check(TokenType.DEDENT)) {
        this.advance();
        continue;
      }

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

    // Handle agent keyword
    if (this.check(TokenType.AGENT)) {
      return this.parseAgentDefinition();
    }

    // Handle session keyword
    if (this.check(TokenType.SESSION)) {
      return this.parseSessionStatement();
    }

    // Skip unknown tokens for now (will be expanded in later tiers)
    if (!this.isAtEnd() && !this.check(TokenType.NEWLINE) && !this.check(TokenType.DEDENT)) {
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
   * Parse an agent definition
   * Syntax: agent name:
   *           model: sonnet
   *           prompt: "..."
   */
  private parseAgentDefinition(): AgentDefinitionNode {
    const agentToken = this.advance(); // consume 'agent'
    const start = agentToken.span.start;

    // Expect identifier (agent name)
    let name: IdentifierNode;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.parseIdentifier();
    } else {
      this.addError('Expected agent name after "agent"');
      name = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError('Expected ":" after agent name');
    }

    // Skip inline comment if present
    if (this.check(TokenType.COMMENT)) {
      const commentToken = this.advance();
      const inlineComment = createCommentNode(commentToken.value, commentToken.span, true);
      this.comments.push(inlineComment);
    }

    // Skip newline(s)
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    // Parse indented property block
    const properties: PropertyNode[] = [];

    if (this.check(TokenType.INDENT)) {
      this.advance(); // consume INDENT

      // Parse properties until DEDENT
      while (!this.isAtEnd() && !this.check(TokenType.DEDENT)) {
        // Skip newlines and comments inside the block
        while (this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
          if (this.check(TokenType.COMMENT)) {
            const commentToken = this.advance();
            const comment = createCommentNode(commentToken.value, commentToken.span, false);
            this.comments.push(comment);
          } else {
            this.advance();
          }
        }

        if (this.check(TokenType.DEDENT) || this.isAtEnd()) break;

        // Parse property
        const prop = this.parseProperty();
        if (prop) {
          properties.push(prop);
        }
      }

      // Consume DEDENT
      if (this.check(TokenType.DEDENT)) {
        this.advance();
      }
    }

    const end = this.previous().span.end;

    return {
      type: 'AgentDefinition',
      name,
      properties,
      body: [], // Empty body for now (statements inside agent not supported yet)
      span: { start, end },
    };
  }

  /**
   * Parse a property
   * Syntax: name: value
   */
  private parseProperty(): PropertyNode | null {
    const start = this.peek().span.start;

    // Property name can be model, prompt, or any identifier
    let propName: IdentifierNode;
    if (this.check(TokenType.MODEL) || this.check(TokenType.PROMPT) || this.check(TokenType.IDENTIFIER)) {
      propName = this.parsePropertyName();
    } else {
      // Skip unknown tokens
      this.advance();
      return null;
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError(`Expected ":" after property name "${propName.name}"`);
      return null;
    }

    // Parse value
    let value: ExpressionNode;
    if (this.check(TokenType.STRING)) {
      value = this.parseStringLiteral();
    } else if (this.check(TokenType.IDENTIFIER)) {
      value = this.parseIdentifier();
    } else {
      this.addError('Expected property value');
      value = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    // Skip inline comment
    if (this.check(TokenType.COMMENT)) {
      const commentToken = this.advance();
      const inlineComment = createCommentNode(commentToken.value, commentToken.span, true);
      this.comments.push(inlineComment);
    }

    const end = this.previous().span.end;

    return {
      type: 'Property',
      name: propName,
      value,
      span: { start, end },
    };
  }

  /**
   * Parse a property name (can be a keyword like model/prompt or an identifier)
   */
  private parsePropertyName(): IdentifierNode {
    const token = this.advance();
    return {
      type: 'Identifier',
      name: token.value,
      span: token.span,
    };
  }

  /**
   * Parse a session statement
   * Variants:
   * - session "prompt"                    (simple session)
   * - session: agent                      (session with agent)
   * - session name: agent                 (named session with agent)
   * - session: agent                      (with indented properties)
   *     prompt: "..."
   */
  private parseSessionStatement(): SessionStatementNode {
    const sessionToken = this.advance();
    const start = sessionToken.span.start;

    let prompt: StringLiteralNode | null = null;
    let agent: IdentifierNode | null = null;
    let name: IdentifierNode | null = null;
    let properties: PropertyNode[] = [];
    let inlineComment: CommentNode | null = null;

    // Check what comes next
    if (this.check(TokenType.STRING)) {
      // Simple session: session "prompt"
      const stringToken = this.advance();
      prompt = this.createStringLiteralNode(stringToken);
    } else if (this.check(TokenType.COLON)) {
      // Session with agent: session: agent
      this.advance(); // consume ':'

      if (this.check(TokenType.IDENTIFIER)) {
        agent = this.parseIdentifier();
      } else {
        this.addError('Expected agent name after ":"');
      }
    } else if (this.check(TokenType.IDENTIFIER)) {
      // Could be: session name: agent
      const identifier = this.parseIdentifier();

      if (this.check(TokenType.COLON)) {
        // This is: session name: agent
        this.advance(); // consume ':'
        name = identifier;

        if (this.check(TokenType.IDENTIFIER)) {
          agent = this.parseIdentifier();
        } else {
          this.addError('Expected agent name after ":"');
        }
      } else {
        // Just an identifier after session (not valid, but handle gracefully)
        this.addError('Expected ":" after session name or a prompt string');
      }
    }

    // Check for inline comment
    if (this.check(TokenType.COMMENT)) {
      const commentToken = this.advance();
      inlineComment = createCommentNode(commentToken.value, commentToken.span, true);
      this.comments.push(inlineComment);
    }

    // Skip newline(s)
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    // Parse indented property block (for sessions with agents)
    if (this.check(TokenType.INDENT)) {
      this.advance(); // consume INDENT

      // Parse properties until DEDENT
      while (!this.isAtEnd() && !this.check(TokenType.DEDENT)) {
        // Skip newlines and comments inside the block
        while (this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
          if (this.check(TokenType.COMMENT)) {
            const commentToken = this.advance();
            const comment = createCommentNode(commentToken.value, commentToken.span, false);
            this.comments.push(comment);
          } else {
            this.advance();
          }
        }

        if (this.check(TokenType.DEDENT) || this.isAtEnd()) break;

        // Parse property
        const prop = this.parseProperty();
        if (prop) {
          properties.push(prop);
        }
      }

      // Consume DEDENT
      if (this.check(TokenType.DEDENT)) {
        this.advance();
      }
    }

    const end = this.previous().span.end;

    return {
      type: 'SessionStatement',
      prompt,
      agent,
      name,
      properties,
      inlineComment,
      span: { start, end },
    };
  }

  /**
   * Parse an identifier
   */
  private parseIdentifier(): IdentifierNode {
    const token = this.advance();
    return {
      type: 'Identifier',
      name: token.value,
      span: token.span,
    };
  }

  /**
   * Parse a string literal
   */
  private parseStringLiteral(): StringLiteralNode {
    const token = this.advance();
    return this.createStringLiteralNode(token);
  }

  // Helper methods

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token {
    if (this.current + 1 >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.current + 1];
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

  /**
   * Create a StringLiteralNode from a string token
   */
  private createStringLiteralNode(token: Token): StringLiteralNode {
    const metadata = token.stringMetadata;

    // Convert token escape sequences to AST escape sequences if available
    const escapeSequences: EscapeSequence[] = metadata?.escapeSequences?.map(esc => ({
      type: esc.type,
      sequence: esc.sequence,
      resolved: esc.resolved,
      offset: esc.offset,
    })) || [];

    return {
      type: 'StringLiteral',
      value: token.value,
      raw: metadata?.raw || `"${token.value}"`,
      isTripleQuoted: metadata?.isTripleQuoted ?? token.value.includes('\n'),
      escapeSequences: escapeSequences.length > 0 ? escapeSequences : undefined,
      span: token.span,
    };
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
