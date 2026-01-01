/**
 * OpenProse Lexer/Tokenizer
 *
 * Handles tokenization of OpenProse source code with special handling for:
 * - Comments (# to end of line)
 * - String literals (with proper escaping)
 * - Indentation-based structure
 */

import { Token, TokenType, SourceLocation, SourceSpan, KEYWORDS } from './tokens';

export interface LexerOptions {
  /** Whether to include comments in the token stream (default: true) */
  includeComments?: boolean;
  /** Whether to include trivia tokens (default: false) */
  includeTrivia?: boolean;
}

export interface LexerResult {
  tokens: Token[];
  errors: LexerError[];
}

export interface LexerError {
  message: string;
  span: SourceSpan;
}

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private errors: LexerError[] = [];
  private options: LexerOptions;
  private indentStack: number[] = [0];

  constructor(source: string, options: LexerOptions = {}) {
    this.source = source;
    this.options = {
      includeComments: options.includeComments ?? true,
      includeTrivia: options.includeTrivia ?? false,
    };
  }

  /**
   * Tokenize the source code
   */
  public tokenize(): LexerResult {
    this.tokens = [];
    this.errors = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.indentStack = [0];

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    // Emit any remaining DEDENTs
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.addToken(TokenType.DEDENT, '');
    }

    this.addToken(TokenType.EOF, '');

    return {
      tokens: this.tokens,
      errors: this.errors,
    };
  }

  private scanToken(): void {
    // Handle start of line - check for indentation
    if (this.column === 1) {
      this.handleIndentation();
      if (this.isAtEnd()) return;
    }

    const c = this.peek();

    // Skip horizontal whitespace (not at start of line)
    if (c === ' ' || c === '\t') {
      this.advance();
      return;
    }

    // Newline
    if (c === '\n') {
      this.addToken(TokenType.NEWLINE, '\n');
      this.advance();
      this.line++;
      this.column = 1;
      return;
    }

    // Carriage return (handle \r\n)
    if (c === '\r') {
      this.advance();
      if (this.peek() === '\n') {
        this.advance();
      }
      this.addToken(TokenType.NEWLINE, '\n');
      this.line++;
      this.column = 1;
      return;
    }

    // Comment
    if (c === '#') {
      this.scanComment();
      return;
    }

    // String literal
    if (c === '"') {
      this.scanString();
      return;
    }

    // Number literal
    if (this.isDigit(c)) {
      this.scanNumber();
      return;
    }

    // Identifier or keyword
    if (this.isAlpha(c)) {
      this.scanIdentifier();
      return;
    }

    // Operators and punctuation
    switch (c) {
      case ':':
        this.addTokenAndAdvance(TokenType.COLON, ':');
        break;
      case ',':
        this.addTokenAndAdvance(TokenType.COMMA, ',');
        break;
      case '(':
        this.addTokenAndAdvance(TokenType.LPAREN, '(');
        break;
      case ')':
        this.addTokenAndAdvance(TokenType.RPAREN, ')');
        break;
      case '[':
        this.addTokenAndAdvance(TokenType.LBRACKET, '[');
        break;
      case ']':
        this.addTokenAndAdvance(TokenType.RBRACKET, ']');
        break;
      case '{':
        this.addTokenAndAdvance(TokenType.LBRACE, '{');
        break;
      case '}':
        this.addTokenAndAdvance(TokenType.RBRACE, '}');
        break;
      case '|':
        this.addTokenAndAdvance(TokenType.PIPE, '|');
        break;
      case '=':
        this.addTokenAndAdvance(TokenType.EQUALS, '=');
        break;
      case '-':
        if (this.peekNext() === '>') {
          const start = this.currentLocation();
          this.advance();
          this.advance();
          this.addTokenAt(TokenType.ARROW, '->', start);
        } else {
          this.addError(`Unexpected character: ${c}`);
          this.advance();
        }
        break;
      case '*':
        this.scanDiscretion();
        break;
      default:
        this.addError(`Unexpected character: ${c}`);
        this.advance();
    }
  }

  /**
   * Handle indentation at the start of a line
   */
  private handleIndentation(): void {
    let indent = 0;
    const startPos = this.pos;

    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
      if (this.peek() === ' ') {
        indent++;
      } else {
        // Tab counts as moving to next multiple of 4
        indent = Math.floor(indent / 4) * 4 + 4;
      }
      this.advance();
    }

    // Skip empty lines and comment-only lines
    if (this.isAtEnd() || this.peek() === '\n' || this.peek() === '\r' || this.peek() === '#') {
      return;
    }

    const currentIndent = this.indentStack[this.indentStack.length - 1];

    if (indent > currentIndent) {
      this.indentStack.push(indent);
      this.addToken(TokenType.INDENT, ' '.repeat(indent - currentIndent));
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop();
        this.addToken(TokenType.DEDENT, '');
      }

      if (this.indentStack[this.indentStack.length - 1] !== indent) {
        this.addError(`Inconsistent indentation`);
      }
    }
  }

  /**
   * Scan a comment (# to end of line)
   */
  private scanComment(): void {
    const start = this.currentLocation();
    let value = '';

    // Consume the # and everything to end of line
    while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
      value += this.peek();
      this.advance();
    }

    if (this.options.includeComments) {
      this.addTokenAt(TokenType.COMMENT, value, start, true);
    }
  }

  /**
   * Scan a string literal
   */
  private scanString(): void {
    const start = this.currentLocation();
    this.advance(); // consume opening quote

    // Check for triple-quoted string
    if (this.peek() === '"' && this.peekNext() === '"') {
      this.advance();
      this.advance();
      this.scanTripleQuotedString(start);
      return;
    }

    let value = '';

    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\n' || this.peek() === '\r') {
        this.addError('Unterminated string literal');
        return;
      }

      if (this.peek() === '\\') {
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.peek();
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '"': value += '"'; break;
            case '#': value += '#'; break;
            default: value += escaped;
          }
          this.advance();
        }
      } else {
        value += this.peek();
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      this.addError('Unterminated string literal');
      return;
    }

    this.advance(); // consume closing quote
    this.addTokenAt(TokenType.STRING, value, start);
  }

  /**
   * Scan a triple-quoted string literal
   */
  private scanTripleQuotedString(start: SourceLocation): void {
    let value = '';

    while (!this.isAtEnd()) {
      if (this.peek() === '"' && this.peekAt(1) === '"' && this.peekAt(2) === '"') {
        this.advance();
        this.advance();
        this.advance();
        this.addTokenAt(TokenType.STRING, value, start);
        return;
      }

      if (this.peek() === '\n') {
        value += '\n';
        this.advance();
        this.line++;
        this.column = 1;
      } else if (this.peek() === '\r') {
        this.advance();
        if (this.peek() === '\n') {
          this.advance();
        }
        value += '\n';
        this.line++;
        this.column = 1;
      } else {
        value += this.peek();
        this.advance();
      }
    }

    this.addError('Unterminated triple-quoted string');
  }

  /**
   * Scan a number literal
   */
  private scanNumber(): void {
    const start = this.currentLocation();
    let value = '';

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.peek();
      this.advance();
    }

    // Handle decimal
    if (this.peek() === '.' && this.isDigit(this.peekNext() || '')) {
      value += '.';
      this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.peek();
        this.advance();
      }
    }

    this.addTokenAt(TokenType.NUMBER, value, start);
  }

  /**
   * Scan an identifier or keyword
   */
  private scanIdentifier(): void {
    const start = this.currentLocation();
    let value = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.peek();
      this.advance();
    }

    // Check if it's a keyword
    const tokenType = KEYWORDS[value] || TokenType.IDENTIFIER;
    this.addTokenAt(tokenType, value, start);
  }

  /**
   * Scan orchestrator discretion syntax (**...** or ***...***)
   */
  private scanDiscretion(): void {
    const start = this.currentLocation();

    if (this.peek() !== '*' || this.peekNext() !== '*') {
      this.addError('Unexpected character: *');
      this.advance();
      return;
    }

    // Check for triple asterisks
    if (this.peekAt(2) === '*') {
      this.scanMultilineDiscretion(start);
    } else {
      this.scanInlineDiscretion(start);
    }
  }

  /**
   * Scan inline discretion (**...**)
   */
  private scanInlineDiscretion(start: SourceLocation): void {
    this.advance(); // first *
    this.advance(); // second *

    let value = '**';

    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '*') {
        value += '**';
        this.advance();
        this.advance();
        this.addTokenAt(TokenType.DISCRETION, value, start);
        return;
      }

      if (this.peek() === '\n' || this.peek() === '\r') {
        this.addError('Unterminated discretion marker (use *** for multi-line)');
        return;
      }

      value += this.peek();
      this.advance();
    }

    this.addError('Unterminated discretion marker');
  }

  /**
   * Scan multiline discretion (***...***)
   */
  private scanMultilineDiscretion(start: SourceLocation): void {
    this.advance(); // first *
    this.advance(); // second *
    this.advance(); // third *

    let value = '***';

    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekAt(1) === '*' && this.peekAt(2) === '*') {
        value += '***';
        this.advance();
        this.advance();
        this.advance();
        this.addTokenAt(TokenType.MULTILINE_DISCRETION, value, start);
        return;
      }

      if (this.peek() === '\n') {
        value += '\n';
        this.advance();
        this.line++;
        this.column = 1;
      } else if (this.peek() === '\r') {
        this.advance();
        if (this.peek() === '\n') {
          this.advance();
        }
        value += '\n';
        this.line++;
        this.column = 1;
      } else {
        value += this.peek();
        this.advance();
      }
    }

    this.addError('Unterminated multiline discretion marker');
  }

  // Helper methods

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    return this.source[this.pos] || '\0';
  }

  private peekNext(): string {
    return this.source[this.pos + 1] || '\0';
  }

  private peekAt(offset: number): string {
    return this.source[this.pos + offset] || '\0';
  }

  private advance(): string {
    const c = this.source[this.pos];
    this.pos++;
    this.column++;
    return c;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') ||
           (c >= 'A' && c <= 'Z') ||
           c === '_' ||
           c === '-';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private currentLocation(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos,
    };
  }

  private addToken(type: TokenType, value: string, isTrivia: boolean = false): void {
    const start = this.currentLocation();
    this.addTokenAt(type, value, start, isTrivia);
  }

  private addTokenAndAdvance(type: TokenType, value: string): void {
    const start = this.currentLocation();
    this.advance();
    this.addTokenAt(type, value, start);
  }

  private addTokenAt(type: TokenType, value: string, start: SourceLocation, isTrivia: boolean = false): void {
    const end = this.currentLocation();

    const token: Token = {
      type,
      value,
      span: { start, end },
      isTrivia,
    };

    this.tokens.push(token);
  }

  private addError(message: string): void {
    const location = this.currentLocation();
    this.errors.push({
      message,
      span: {
        start: location,
        end: location,
      },
    });
  }
}

/**
 * Tokenize source code with default options
 */
export function tokenize(source: string, options?: LexerOptions): LexerResult {
  const lexer = new Lexer(source, options);
  return lexer.tokenize();
}

/**
 * Tokenize source code and filter out comments
 */
export function tokenizeWithoutComments(source: string): LexerResult {
  const result = tokenize(source, { includeComments: true });
  return {
    tokens: result.tokens.filter(t => t.type !== TokenType.COMMENT),
    errors: result.errors,
  };
}

/**
 * Get only comment tokens from source code
 */
export function extractComments(source: string): Token[] {
  const result = tokenize(source, { includeComments: true });
  return result.tokens.filter(t => t.type === TokenType.COMMENT);
}
