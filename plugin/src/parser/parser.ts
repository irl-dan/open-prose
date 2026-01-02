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
  ImportStatementNode,
  PropertyNode,
  StringLiteralNode,
  NumberLiteralNode,
  IdentifierNode,
  ExpressionNode,
  EscapeSequence,
  ArrayExpressionNode,
  ObjectExpressionNode,
  LetBindingNode,
  ConstBindingNode,
  AssignmentNode,
  DoBlockNode,
  BlockDefinitionNode,
  ArrowExpressionNode,
  ParallelBlockNode,
  RepeatBlockNode,
  ForEachBlockNode,
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

    // Handle import keyword
    if (this.check(TokenType.IMPORT)) {
      return this.parseImportStatement();
    }

    // Handle agent keyword
    if (this.check(TokenType.AGENT)) {
      return this.parseAgentDefinition();
    }

    // Handle block definition
    if (this.check(TokenType.BLOCK)) {
      return this.parseBlockDefinition();
    }

    // Handle do block or block invocation
    if (this.check(TokenType.DO)) {
      return this.parseDoBlock();
    }

    // Handle parallel block (including parallel for)
    if (this.check(TokenType.PARALLEL)) {
      // Check for parallel for
      if (this.peekNext().type === TokenType.FOR) {
        return this.parseForEachBlock(true);
      }
      return this.parseParallelBlock();
    }

    // Handle repeat block
    if (this.check(TokenType.REPEAT)) {
      return this.parseRepeatBlock();
    }

    // Handle for-each block
    if (this.check(TokenType.FOR)) {
      return this.parseForEachBlock(false);
    }

    // Handle session keyword (may be followed by -> for arrow sequences)
    if (this.check(TokenType.SESSION)) {
      return this.parseSessionOrArrowSequence();
    }

    // Handle let binding
    if (this.check(TokenType.LET)) {
      return this.parseLetBinding();
    }

    // Handle const binding
    if (this.check(TokenType.CONST)) {
      return this.parseConstBinding();
    }

    // Handle potential assignment (identifier followed by =)
    if (this.check(TokenType.IDENTIFIER)) {
      // Look ahead for assignment
      if (this.peekNext().type === TokenType.EQUALS) {
        return this.parseAssignment();
      }
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
   * Parse an import statement
   * Syntax: import "skill-name" from "source"
   */
  private parseImportStatement(): ImportStatementNode {
    const importToken = this.advance(); // consume 'import'
    const start = importToken.span.start;

    // Expect string literal (skill name)
    let skillName: StringLiteralNode;
    if (this.check(TokenType.STRING)) {
      const stringToken = this.advance();
      skillName = this.createStringLiteralNode(stringToken);
    } else {
      this.addError('Expected skill name string after "import"');
      skillName = {
        type: 'StringLiteral',
        value: '',
        raw: '""',
        isTripleQuoted: false,
        span: this.peek().span,
      };
    }

    // Expect 'from' keyword
    if (!this.match(TokenType.FROM)) {
      this.addError('Expected "from" after skill name');
    }

    // Expect string literal (source)
    let source: StringLiteralNode;
    if (this.check(TokenType.STRING)) {
      const stringToken = this.advance();
      source = this.createStringLiteralNode(stringToken);
    } else {
      this.addError('Expected source string after "from"');
      source = {
        type: 'StringLiteral',
        value: '',
        raw: '""',
        isTripleQuoted: false,
        span: this.peek().span,
      };
    }

    const end = this.previous().span.end;

    return {
      type: 'ImportStatement',
      skillName,
      source,
      span: { start, end },
    };
  }

  /**
   * Parse a let binding
   * Syntax: let name = expression
   */
  private parseLetBinding(): LetBindingNode {
    const letToken = this.advance(); // consume 'let'
    const start = letToken.span.start;

    // Expect identifier (variable name)
    let name: IdentifierNode;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.parseIdentifier();
    } else {
      this.addError('Expected variable name after "let"');
      name = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    // Expect equals sign
    if (!this.match(TokenType.EQUALS)) {
      this.addError('Expected "=" after variable name in let binding');
    }

    // Parse the value expression (typically a session)
    const value = this.parseBindingExpression();

    const end = this.previous().span.end;

    return {
      type: 'LetBinding',
      name,
      value,
      span: { start, end },
    };
  }

  /**
   * Parse a const binding
   * Syntax: const name = expression
   */
  private parseConstBinding(): ConstBindingNode {
    const constToken = this.advance(); // consume 'const'
    const start = constToken.span.start;

    // Expect identifier (variable name)
    let name: IdentifierNode;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.parseIdentifier();
    } else {
      this.addError('Expected variable name after "const"');
      name = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    // Expect equals sign
    if (!this.match(TokenType.EQUALS)) {
      this.addError('Expected "=" after variable name in const binding');
    }

    // Parse the value expression (typically a session)
    const value = this.parseBindingExpression();

    const end = this.previous().span.end;

    return {
      type: 'ConstBinding',
      name,
      value,
      span: { start, end },
    };
  }

  /**
   * Parse an assignment
   * Syntax: name = expression
   */
  private parseAssignment(): AssignmentNode {
    const start = this.peek().span.start;

    // Parse the variable name
    const name = this.parseIdentifier();

    // Consume the equals sign
    this.advance(); // consume '='

    // Parse the value expression
    const value = this.parseBindingExpression();

    const end = this.previous().span.end;

    return {
      type: 'Assignment',
      name,
      value,
      span: { start, end },
    };
  }

  /**
   * Parse an expression that can be assigned to a variable
   * This handles session statements, do blocks, and other expressions
   */
  private parseBindingExpression(): ExpressionNode {
    // If it's a session keyword, parse it as a session (may be followed by ->)
    if (this.check(TokenType.SESSION)) {
      const session = this.parseSessionStatement();
      // Check for arrow sequence
      if (this.check(TokenType.ARROW)) {
        return this.parseArrowSequence(session);
      }
      return session;
    }

    // If it's a do block
    if (this.check(TokenType.DO)) {
      return this.parseDoBlock();
    }

    // If it's a parallel block (or parallel for)
    if (this.check(TokenType.PARALLEL)) {
      // Check for parallel for
      if (this.peekNext().type === TokenType.FOR) {
        return this.parseForEachBlock(true);
      }
      return this.parseParallelBlock();
    }

    // If it's a repeat block
    if (this.check(TokenType.REPEAT)) {
      return this.parseRepeatBlock();
    }

    // If it's a for-each block
    if (this.check(TokenType.FOR)) {
      return this.parseForEachBlock(false);
    }

    // If it's a string literal
    if (this.check(TokenType.STRING)) {
      return this.parseStringLiteral();
    }

    // If it's an identifier (variable reference)
    if (this.check(TokenType.IDENTIFIER)) {
      return this.parseIdentifier();
    }

    // If it's an array
    if (this.check(TokenType.LBRACKET)) {
      return this.parseArrayExpression();
    }

    // Error case
    this.addError('Expected expression (session, do block, string, identifier, or array)');
    return {
      type: 'Identifier',
      name: '',
      span: this.peek().span,
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
   * Special cases:
   * - skills: ["skill1", "skill2"]
   * - permissions: (nested block)
   */
  private parseProperty(): PropertyNode | null {
    const start = this.peek().span.start;

    // Property name can be model, prompt, skills, permissions, context, or any identifier
    let propName: IdentifierNode;
    if (this.check(TokenType.MODEL) || this.check(TokenType.PROMPT) ||
        this.check(TokenType.SKILLS) || this.check(TokenType.PERMISSIONS) ||
        this.check(TokenType.CONTEXT) || this.check(TokenType.IDENTIFIER)) {
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

    // Parse value based on property name or what comes next
    let value: ExpressionNode;

    if (this.check(TokenType.LBRACE)) {
      // Object expression (shorthand): { a, b, c }
      value = this.parseObjectContextExpression();
    } else if (this.check(TokenType.LBRACKET)) {
      // Array expression: ["item1", "item2"]
      value = this.parseArrayExpression();
    } else if (this.check(TokenType.STRING)) {
      value = this.parseStringLiteral();
    } else if (this.check(TokenType.IDENTIFIER)) {
      value = this.parseIdentifier();
    } else if (this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
      // permissions: followed by newline means nested block - we'll handle that specially
      // For now, create a placeholder and let the caller handle the block
      if (propName.name === 'permissions') {
        // Skip inline comment if present
        if (this.check(TokenType.COMMENT)) {
          const commentToken = this.advance();
          const inlineComment = createCommentNode(commentToken.value, commentToken.span, true);
          this.comments.push(inlineComment);
        }

        // Parse the permissions block
        value = this.parsePermissionsBlock();
      } else {
        this.addError('Expected property value');
        value = {
          type: 'Identifier',
          name: '',
          span: this.peek().span,
        };
      }
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
   * Parse an array expression
   * Syntax: ["item1", "item2", ...]
   */
  private parseArrayExpression(): ArrayExpressionNode {
    const start = this.peek().span.start;
    this.advance(); // consume '['

    const elements: ExpressionNode[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
      // Parse element
      if (this.check(TokenType.STRING)) {
        elements.push(this.parseStringLiteral());
      } else if (this.check(TokenType.IDENTIFIER)) {
        elements.push(this.parseIdentifier());
      } else if (this.check(TokenType.NUMBER)) {
        elements.push(this.parseNumberLiteral());
      } else {
        this.addError('Expected array element');
        break;
      }

      // Expect comma or closing bracket
      if (!this.check(TokenType.RBRACKET)) {
        if (!this.match(TokenType.COMMA)) {
          this.addError('Expected "," or "]" after array element');
          break;
        }
      }
    }

    if (!this.match(TokenType.RBRACKET)) {
      this.addError('Expected "]" to close array');
    }

    const end = this.previous().span.end;

    return {
      type: 'ArrayExpression',
      elements,
      span: { start, end },
    };
  }

  /**
   * Parse an object context expression (shorthand)
   * Syntax: { a, b, c } - equivalent to { a: a, b: b, c: c }
   */
  private parseObjectContextExpression(): ObjectExpressionNode {
    const start = this.peek().span.start;
    this.advance(); // consume '{'

    const properties: PropertyNode[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
      // Parse identifier for shorthand property
      if (this.check(TokenType.IDENTIFIER)) {
        const id = this.parseIdentifier();

        // Create shorthand property: identifier becomes both name and value
        const prop: PropertyNode = {
          type: 'Property',
          name: id,
          value: { ...id }, // Clone the identifier for the value
          span: id.span,
        };
        properties.push(prop);
      } else {
        this.addError('Expected identifier in object context');
        break;
      }

      // Expect comma or closing brace
      if (!this.check(TokenType.RBRACE)) {
        if (!this.match(TokenType.COMMA)) {
          this.addError('Expected "," or "}" after property');
          break;
        }
      }
    }

    if (!this.match(TokenType.RBRACE)) {
      this.addError('Expected "}" to close object context');
    }

    const end = this.previous().span.end;

    return {
      type: 'ObjectExpression',
      properties,
      span: { start, end },
    };
  }

  /**
   * Parse a permissions block (nested properties)
   * Syntax:
   *   permissions:
   *     read: ["*.md"]
   *     write: ["output/"]
   */
  private parsePermissionsBlock(): ExpressionNode {
    const start = this.peek().span.start;

    // Skip newlines
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    const properties: PropertyNode[] = [];

    // Check for indented block
    if (this.check(TokenType.INDENT)) {
      this.advance(); // consume INDENT

      // Parse properties until DEDENT
      while (!this.isAtEnd() && !this.check(TokenType.DEDENT)) {
        // Skip newlines and comments
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

        // Parse permission property (e.g., read: ["*.md"])
        const prop = this.parsePermissionProperty();
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
      type: 'ObjectExpression',
      properties,
      span: { start, end },
    };
  }

  /**
   * Parse a single permission property
   * Syntax: permission-type: value (array or identifier)
   */
  private parsePermissionProperty(): PropertyNode | null {
    const start = this.peek().span.start;

    // Permission name (read, write, execute, bash, etc.)
    if (!this.check(TokenType.IDENTIFIER)) {
      this.advance();
      return null;
    }

    const propName = this.parseIdentifier();

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError(`Expected ":" after permission name "${propName.name}"`);
      return null;
    }

    // Parse value (array or identifier like 'deny', 'allow', 'prompt')
    // Note: 'prompt' is a keyword so we need to accept it as a valid identifier value
    let value: ExpressionNode;
    if (this.check(TokenType.LBRACKET)) {
      value = this.parseArrayExpression();
    } else if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.PROMPT)) {
      // Accept 'prompt' keyword as a valid permission value
      value = this.parseIdentifier();
    } else if (this.check(TokenType.STRING)) {
      value = this.parseStringLiteral();
    } else {
      this.addError('Expected permission value');
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
   * Parse a session statement that may be followed by -> for arrow sequences
   */
  private parseSessionOrArrowSequence(): StatementNode {
    const session = this.parseSessionStatement();

    // Check for arrow operator to create a sequence
    if (this.check(TokenType.ARROW)) {
      return this.parseArrowSequence(session);
    }

    return session;
  }

  /**
   * Parse an arrow sequence (session "A" -> session "B" -> session "C")
   * Left-associative parsing
   */
  private parseArrowSequence(left: ExpressionNode): ArrowExpressionNode {
    const start = left.span.start;

    // Consume the arrow
    this.advance();

    // Parse the right side (must be a session or do block)
    let right: ExpressionNode;

    if (this.check(TokenType.SESSION)) {
      right = this.parseSessionStatement();
    } else if (this.check(TokenType.DO)) {
      right = this.parseDoBlock();
    } else {
      this.addError('Expected session or do block after "->"');
      right = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    let result: ArrowExpressionNode = {
      type: 'ArrowExpression',
      left,
      right,
      span: { start, end: right.span.end },
    };

    // Check for more arrows (left-associative)
    while (this.check(TokenType.ARROW)) {
      this.advance();

      let nextRight: ExpressionNode;
      if (this.check(TokenType.SESSION)) {
        nextRight = this.parseSessionStatement();
      } else if (this.check(TokenType.DO)) {
        nextRight = this.parseDoBlock();
      } else {
        this.addError('Expected session or do block after "->"');
        nextRight = {
          type: 'Identifier',
          name: '',
          span: this.peek().span,
        };
      }

      result = {
        type: 'ArrowExpression',
        left: result,
        right: nextRight,
        span: { start, end: nextRight.span.end },
      };
    }

    return result;
  }

  /**
   * Parse a block definition
   * Syntax: block name:
   *           body...
   */
  private parseBlockDefinition(): BlockDefinitionNode {
    const blockToken = this.advance(); // consume 'block'
    const start = blockToken.span.start;

    // Expect identifier (block name)
    let name: IdentifierNode;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.parseIdentifier();
    } else {
      this.addError('Expected block name after "block"');
      name = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError('Expected ":" after block name');
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

    // Parse indented body
    const body: StatementNode[] = [];

    if (this.check(TokenType.INDENT)) {
      this.advance(); // consume INDENT

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

        const stmt = this.parseStatement();
        if (stmt) {
          body.push(stmt);
        }
      }

      // Consume DEDENT
      if (this.check(TokenType.DEDENT)) {
        this.advance();
      }
    }

    const end = this.previous().span.end;

    return {
      type: 'BlockDefinition',
      name,
      parameters: [], // Parameters are a future enhancement
      body,
      span: { start, end },
    };
  }

  /**
   * Parse a do block or block invocation
   * Variants:
   * - do:              (anonymous sequential block)
   *     body...
   * - do blockname     (invoke named block)
   */
  private parseDoBlock(): DoBlockNode {
    const doToken = this.advance(); // consume 'do'
    const start = doToken.span.start;

    // Check what follows: colon (anonymous block) or identifier (invocation)
    if (this.check(TokenType.COLON)) {
      // Anonymous do block: do:
      this.advance(); // consume ':'

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

      // Parse indented body
      const body: StatementNode[] = [];

      if (this.check(TokenType.INDENT)) {
        this.advance(); // consume INDENT

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

          const stmt = this.parseStatement();
          if (stmt) {
            body.push(stmt);
          }
        }

        // Consume DEDENT
        if (this.check(TokenType.DEDENT)) {
          this.advance();
        }
      }

      const end = this.previous().span.end;

      return {
        type: 'DoBlock',
        name: null, // Anonymous block
        arguments: [],
        body,
        span: { start, end },
      };
    } else if (this.check(TokenType.IDENTIFIER)) {
      // Block invocation: do blockname
      const name = this.parseIdentifier();

      const end = this.previous().span.end;

      return {
        type: 'DoBlock',
        name,
        arguments: [], // Arguments are a future enhancement
        body: [], // Invocation has no body
        span: { start, end },
      };
    } else {
      this.addError('Expected ":" or block name after "do"');

      return {
        type: 'DoBlock',
        name: null,
        arguments: [],
        body: [],
        span: { start, end: this.peek().span.end },
      };
    }
  }

  /**
   * Parse a parallel block
   * Syntax variants:
   *   parallel:
   *   parallel ("first"):
   *   parallel ("any"):
   *   parallel ("any", count: 2):
   *   parallel (on-fail: "continue"):
   *   parallel (on-fail: "ignore"):
   *   parallel ("first", on-fail: "continue"):
   */
  private parseParallelBlock(): ParallelBlockNode {
    const parallelToken = this.advance(); // consume 'parallel'
    const start = parallelToken.span.start;

    // Parse optional modifiers in parentheses
    let joinStrategy: StringLiteralNode | null = null;
    let anyCount: NumberLiteralNode | null = null;
    let onFail: StringLiteralNode | null = null;

    if (this.check(TokenType.LPAREN)) {
      this.advance(); // consume '('

      // Parse modifiers until we hit ')'
      while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
        if (this.check(TokenType.STRING)) {
          // Join strategy: "first", "any", or "all"
          if (joinStrategy) {
            this.addError('Duplicate join strategy specified');
          }
          joinStrategy = this.parseStringLiteral();
        } else if (this.check(TokenType.IDENTIFIER)) {
          // Named modifier like on-fail: "continue" or count: 2
          const modifierName = this.peek().value;

          if (modifierName === 'on-fail') {
            this.advance(); // consume 'on-fail'
            if (!this.match(TokenType.COLON)) {
              this.addError('Expected ":" after "on-fail"');
            }
            if (this.check(TokenType.STRING)) {
              if (onFail) {
                this.addError('Duplicate on-fail policy specified');
              }
              onFail = this.parseStringLiteral();
            } else {
              this.addError('Expected string value for "on-fail" (e.g., "continue" or "ignore")');
            }
          } else if (modifierName === 'count') {
            this.advance(); // consume 'count'
            if (!this.match(TokenType.COLON)) {
              this.addError('Expected ":" after "count"');
            }
            if (this.check(TokenType.NUMBER)) {
              if (anyCount) {
                this.addError('Duplicate count specified');
              }
              anyCount = this.parseNumberLiteral();
            } else {
              this.addError('Expected number value for "count"');
            }
          } else {
            this.addError(`Unknown parallel modifier: "${modifierName}"`);
            this.advance();
          }
        } else {
          // Unexpected token in modifiers
          this.addError('Unexpected token in parallel modifiers');
          this.advance();
        }

        // Expect comma or closing paren
        if (!this.check(TokenType.RPAREN)) {
          if (!this.match(TokenType.COMMA)) {
            this.addError('Expected "," or ")" in parallel modifiers');
            break;
          }
        }
      }

      if (!this.match(TokenType.RPAREN)) {
        this.addError('Expected ")" after parallel modifiers');
      }
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError('Expected ":" after "parallel" or parallel modifiers');
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

    // Parse indented body
    const body: StatementNode[] = [];

    if (this.check(TokenType.INDENT)) {
      this.advance(); // consume INDENT

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

        // Check for named result assignment: name = session "..."
        if (this.check(TokenType.IDENTIFIER) && this.peekNext().type === TokenType.EQUALS) {
          const assignStmt = this.parseParallelAssignment();
          if (assignStmt) {
            body.push(assignStmt);
          }
        } else {
          const stmt = this.parseStatement();
          if (stmt) {
            body.push(stmt);
          }
        }
      }

      // Consume DEDENT
      if (this.check(TokenType.DEDENT)) {
        this.advance();
      }
    }

    const end = this.previous().span.end;

    return {
      type: 'ParallelBlock',
      joinStrategy,
      anyCount,
      onFail,
      body,
      span: { start, end },
    };
  }

  /**
   * Parse a named assignment inside a parallel block
   * Syntax: name = session "..." or name = do: ...
   */
  private parseParallelAssignment(): AssignmentNode | null {
    const start = this.peek().span.start;

    // Parse the variable name
    const name = this.parseIdentifier();

    // Consume the equals sign
    this.advance(); // consume '='

    // Parse the value expression
    const value = this.parseBindingExpression();

    const end = this.previous().span.end;

    return {
      type: 'Assignment',
      name,
      value,
      span: { start, end },
    };
  }

  /**
   * Parse a repeat block
   * Syntax variants:
   *   repeat 3:
   *     body...
   *   repeat 5 as i:
   *     body...
   */
  private parseRepeatBlock(): RepeatBlockNode {
    const repeatToken = this.advance(); // consume 'repeat'
    const start = repeatToken.span.start;

    // Expect number literal (count)
    let count: NumberLiteralNode;
    if (this.check(TokenType.NUMBER)) {
      count = this.parseNumberLiteral();
    } else {
      this.addError('Expected number after "repeat"');
      count = {
        type: 'NumberLiteral',
        value: 1,
        raw: '1',
        span: this.peek().span,
      };
    }

    // Check for optional "as i" index variable
    let indexVar: IdentifierNode | null = null;
    if (this.check(TokenType.AS)) {
      this.advance(); // consume 'as'
      if (this.check(TokenType.IDENTIFIER)) {
        indexVar = this.parseIdentifier();
      } else {
        this.addError('Expected identifier after "as"');
      }
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError('Expected ":" after repeat count');
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

    // Parse indented body
    const body: StatementNode[] = [];

    if (this.check(TokenType.INDENT)) {
      this.advance(); // consume INDENT

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

        const stmt = this.parseStatement();
        if (stmt) {
          body.push(stmt);
        }
      }

      // Consume DEDENT
      if (this.check(TokenType.DEDENT)) {
        this.advance();
      }
    }

    const end = this.previous().span.end;

    return {
      type: 'RepeatBlock',
      count,
      indexVar,
      body,
      span: { start, end },
    };
  }

  /**
   * Parse a for-each block (including parallel for)
   * Syntax variants:
   *   for item in items:
   *     body...
   *   for item, i in items:
   *     body...
   *   parallel for item in items:
   *     body...
   */
  private parseForEachBlock(isParallel: boolean): ForEachBlockNode {
    let start;

    if (isParallel) {
      const parallelToken = this.advance(); // consume 'parallel'
      start = parallelToken.span.start;
      this.advance(); // consume 'for'
    } else {
      const forToken = this.advance(); // consume 'for'
      start = forToken.span.start;
    }

    // Expect item variable identifier
    let itemVar: IdentifierNode;
    if (this.check(TokenType.IDENTIFIER)) {
      itemVar = this.parseIdentifier();
    } else {
      this.addError('Expected item variable after "for"');
      itemVar = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    // Check for optional index variable: for item, i in items
    let indexVar: IdentifierNode | null = null;
    if (this.check(TokenType.COMMA)) {
      this.advance(); // consume ','
      if (this.check(TokenType.IDENTIFIER)) {
        indexVar = this.parseIdentifier();
      } else {
        this.addError('Expected index variable after ","');
      }
    }

    // Expect 'in' keyword
    if (!this.match(TokenType.IN)) {
      this.addError('Expected "in" in for-each');
    }

    // Parse collection expression (identifier or array)
    let collection: ExpressionNode;
    if (this.check(TokenType.IDENTIFIER)) {
      collection = this.parseIdentifier();
    } else if (this.check(TokenType.LBRACKET)) {
      collection = this.parseArrayExpression();
    } else {
      this.addError('Expected collection (identifier or array) after "in"');
      collection = {
        type: 'Identifier',
        name: '',
        span: this.peek().span,
      };
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError('Expected ":" after collection');
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

    // Parse indented body
    const body: StatementNode[] = [];

    if (this.check(TokenType.INDENT)) {
      this.advance(); // consume INDENT

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

        const stmt = this.parseStatement();
        if (stmt) {
          body.push(stmt);
        }
      }

      // Consume DEDENT
      if (this.check(TokenType.DEDENT)) {
        this.advance();
      }
    }

    const end = this.previous().span.end;

    return {
      type: 'ForEachBlock',
      itemVar,
      indexVar,
      collection,
      isParallel,
      body,
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

  /**
   * Parse a number literal
   */
  private parseNumberLiteral(): NumberLiteralNode {
    const token = this.advance();
    return {
      type: 'NumberLiteral',
      value: parseFloat(token.value),
      raw: token.value,
      span: token.span,
    };
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
